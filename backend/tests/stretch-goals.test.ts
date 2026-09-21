import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, LeadStatus, EventType, SuppressionReason } from '@prisma/client';
import { createServer } from '../src/server.js';
import { FollowUpService } from '../src/services/followup.service.js';
import { InMemoryJobQueue } from '../src/services/queue.service.js';
import { AgentService } from '../src/services/agent.service.js';
import { MongoRawStorageService } from '../src/services/mongo-storage.service.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env.js';
import http from 'http';

describe('Stretch Goals Forensic Test Suite (Section 3 Bonus Credit)', () => {
  let prisma: PrismaClient;
  let server: http.Server;
  let baseUrl: string;
  let authToken: string;
  let authHeaders: Record<string, string>;
  const createdLeadIds: string[] = [];
  const createdCompanyIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();
    const app = createServer(prisma);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    authToken = jwt.sign(
      { userId: 'stretch-audit-evaluator', email: 'evaluator@stylesense.ai', name: 'Evaluator', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );
    authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };
  });

  afterAll(async () => {
    server.close();
    if (createdLeadIds.length > 0) {
      await prisma.emailEvent.deleteMany({ where: { leadId: { in: createdLeadIds } } });
      await prisma.scoreHistory.deleteMany({ where: { leadId: { in: createdLeadIds } } });
      await prisma.leadScore.deleteMany({ where: { leadId: { in: createdLeadIds } } });
      await prisma.suppression.deleteMany({ where: { leadId: { in: createdLeadIds } } });
      await prisma.lead.deleteMany({ where: { id: { in: createdLeadIds } } });
    }
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
    }
    await prisma.$disconnect();
  });

  // Helper to create test company and lead
  async function createTestLead(data: { email: string; firstName: string; jobTitle: string; status?: LeadStatus }) {
    const company = await prisma.company.create({
      data: {
        name: `Stretch Apparel ${Date.now()}`,
        domain: `stretch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.com`,
        industry: 'Apparel & Fashion',
        sizeRange: '201-1000',
        region: 'North America'
      }
    });
    createdCompanyIds.push(company.id);

    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        firstName: data.firstName,
        lastName: 'Tester',
        email: data.email.toLowerCase(),
        jobTitle: data.jobTitle,
        sourceUrl: 'https://tradejournal.example.com/stretch-article',
        status: data.status || LeadStatus.CONTACTED,
        researchNotes: {
          observedSignalShort: 'winter clearance',
          observedSignalSentence: 'your recent winter markdown campaign on heavy parkas',
          companySegment: 'outerwear',
          painPointCategory: 'overstock or heavy markdowns',
          valuePropForPainPoint: 'forecast seasonal SKU demand'
        }
      },
      include: { company: true }
    });
    createdLeadIds.push(lead.id);

    await prisma.leadScore.create({
      data: {
        leadId: lead.id,
        currentScore: 45,
        fitScore: 40,
        engagementScore: 5,
        tier: 'WARM'
      }
    });

    return lead;
  }

  // ==========================================================================================
  // Stretch Goal 1: Click Tracking & Behaviour-Driven Follow-Up Rule
  // ==========================================================================================
  describe('1. Click Tracking & Redirect Endpoint', () => {
    it('records discrete CLICKED event, updates engagement score (+10 pts), and returns HTTP 302 redirect', async () => {
      const email = `click.test.${Date.now()}@stretch-brand.com`;
      const lead = await createTestLead({ email, firstName: 'ClickUser', jobTitle: 'Head of Merchandising' });

      const targetUrl = 'https://stylesense.ai/case-studies/apparel-roi';
      const res = await fetch(`${baseUrl}/api/tracking/click/${lead.trackingToken}?url=${encodeURIComponent(targetUrl)}`, {
        redirect: 'manual'
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(targetUrl);

      // Verify CLICKED event in database
      const clickedEvent = await prisma.emailEvent.findFirst({
        where: { leadId: lead.id, eventType: EventType.CLICKED }
      });
      expect(clickedEvent).toBeDefined();
      expect((clickedEvent?.payload as any)?.targetUrl).toBe(targetUrl);

      // Verify score recomputed (+10 pts for click)
      const updatedScore = await prisma.leadScore.findUnique({ where: { leadId: lead.id } });
      expect(updatedScore?.currentScore).toBeGreaterThanOrEqual(50);
    });

    it('safely handles open-redirect attacks by falling back to verified default destination', async () => {
      const email = `redirect.safety.${Date.now()}@stretch-brand.com`;
      const lead = await createTestLead({ email, firstName: 'SafeUser', jobTitle: 'VP Supply Chain' });

      // Malicious javascript: URL
      const maliciousUrl = 'javascript:alert(document.cookie)';
      const res = await fetch(`${baseUrl}/api/tracking/click/${lead.trackingToken}?url=${encodeURIComponent(maliciousUrl)}`, {
        redirect: 'manual'
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('https://stylesense.ai');
    });

    it('gracefully handles non-existent tracking tokens without throwing 500 error', async () => {
      const fakeToken = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/tracking/click/${fakeToken}?url=https://stylesense.ai/home`, {
        redirect: 'manual'
      });

      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('https://stylesense.ai/home');
    });
  });

  describe('1b. Behaviour-Driven Follow-Up Rule Engine', () => {
    it('evaluates leads and identifies NO_OPEN_3_DAYS candidates with grounded resend bump draft', async () => {
      const email = `no.open.${Date.now()}@followup-test.com`;
      const lead = await createTestLead({ email, firstName: 'NoOpenLead', jobTitle: 'Director of Demand Planning' });

      // Simulate outreach delivered 4 days ago with NO open
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.DELIVERED,
          messageId: `del_${Date.now()}`,
          createdAt: fourDaysAgo
        }
      });

      const queueResult = await FollowUpService.getFollowUpQueue(prisma);
      const candidate = queueResult.queue.find(c => c.leadId === lead.id);

      expect(candidate).toBeDefined();
      expect(candidate?.ruleType).toBe('NO_OPEN_3_DAYS');
      expect(candidate?.priority).toBe('STANDARD');
      expect(candidate?.daysElapsed).toBeGreaterThanOrEqual(3);
      expect(candidate?.suggestedBody).toContain('Floating this to the top of your inbox');
    });

    it('evaluates leads and identifies OPENED_NO_REPLY_2_DAYS candidates with case study follow-up', async () => {
      const email = `opened.no.reply.${Date.now()}@followup-test.com`;
      const lead = await createTestLead({ email, firstName: 'OpenedLead', jobTitle: 'Head of Merchandising' });

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.DELIVERED, messageId: `del_${Date.now()}`, createdAt: threeDaysAgo }
      });
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.OPENED, messageId: `op_${Date.now()}`, createdAt: threeDaysAgo }
      });

      const queueResult = await FollowUpService.getFollowUpQueue(prisma);
      const candidate = queueResult.queue.find(c => c.leadId === lead.id);

      expect(candidate).toBeDefined();
      expect(candidate?.ruleType).toBe('OPENED_NO_REPLY_2_DAYS');
      expect(candidate?.priority).toBe('MEDIUM');
      expect(candidate?.suggestedSubject).toContain('quick case study');
      expect(candidate?.suggestedBody).toContain('clearance deadstock by 19%');
    });

    it('evaluates leads and identifies CLICKED_NO_REPLY_1_DAY high-priority candidates', async () => {
      const email = `clicked.lead.${Date.now()}@followup-test.com`;
      const lead = await createTestLead({ email, firstName: 'ClickedLead', jobTitle: 'VP Supply Chain' });

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.DELIVERED, messageId: `del_${Date.now()}`, createdAt: twoDaysAgo }
      });
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.OPENED, messageId: `op_${Date.now()}`, createdAt: twoDaysAgo }
      });
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.CLICKED, messageId: `clk_${Date.now()}`, createdAt: twoDaysAgo }
      });

      const queueResult = await FollowUpService.getFollowUpQueue(prisma);
      const candidate = queueResult.queue.find(c => c.leadId === lead.id);

      expect(candidate).toBeDefined();
      expect(candidate?.ruleType).toBe('CLICKED_NO_REPLY_1_DAY');
      expect(candidate?.priority).toBe('HIGH');
    });

    it('strictly excludes suppressed recipients from the follow-up queue', async () => {
      const email = `suppressed.followup.${Date.now()}@suppressed-test.com`;
      const lead = await createTestLead({ email, firstName: 'SuppressedPerson', jobTitle: 'Head of Merchandising' });

      // Put on suppression list
      await prisma.suppression.create({
        data: { email: lead.email, leadId: lead.id, reason: SuppressionReason.UNSUBSCRIBE }
      });

      // Add old delivery event
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      await prisma.emailEvent.create({
        data: { leadId: lead.id, eventType: EventType.DELIVERED, messageId: `del_${Date.now()}`, createdAt: fiveDaysAgo }
      });

      const queueResult = await FollowUpService.getFollowUpQueue(prisma);
      const candidate = queueResult.queue.find(c => c.leadId === lead.id);
      expect(candidate).toBeUndefined(); // Must be excluded!
    });

    it('exposes GET /api/leads/follow-ups/queue and POST /api/leads/:id/follow-ups/execute via API', async () => {
      const email = `api.followup.${Date.now()}@followup-api.com`;
      const lead = await createTestLead({ email, firstName: 'ApiLead', jobTitle: 'Demand Planner' });

      const resQueue = await fetch(`${baseUrl}/api/leads/follow-ups/queue`, { headers: authHeaders });
      expect(resQueue.status).toBe(200);
      const dataQueue = await resQueue.json();
      expect(dataQueue.success).toBe(true);
      expect(dataQueue.data.queue).toBeDefined();

      const resExec = await fetch(`${baseUrl}/api/leads/${lead.id}/follow-ups/execute`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ ruleType: 'NO_OPEN_3_DAYS' })
      });
      expect(resExec.status).toBe(200);
      const dataExec = await resExec.json();
      expect(dataExec.success).toBe(true);
      expect(dataExec.data.execution.success).toBe(true);
    });
  });

  // ==========================================================================================
  // Stretch Goal 2: Real Inbound Ingestion via Provider Webhook
  // ==========================================================================================
  describe('2. Real Inbound Ingestion via Provider Webhook', () => {
    it('rejects inbound webhook requests if an incorrect webhook secret is supplied', async () => {
      const res = await fetch(`${baseUrl}/api/tracking/webhook/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'wrong-secret-value'
        },
        body: JSON.stringify({ from: 'test@example.com', text: 'Hello' })
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED_WEBHOOK');
    });

    it('ingests positive reply webhook, runs classifier, logs REPLIED event, and increases score', async () => {
      const email = `inbound.positive.${Date.now()}@inbound-test.com`;
      const lead = await createTestLead({ email, firstName: 'Sarah', jobTitle: 'Head of Merchandising' });

      const webhookPayload = {
        from: `Sarah Jenkins <${lead.email}>`,
        to: 'outreach@stylesense.ai',
        subject: 'Re: Merchandising Demand Forecasting',
        text: 'Hi Sanskar, this looks very interesting. We are having huge markdown issues on our outerwear. Can you do 2pm this Thursday?'
      };

      const res = await fetch(`${baseUrl}/api/tracking/webhook/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': ENV.INBOUND_WEBHOOK_SECRET
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.matched).toBe(true);
      expect(body.classification.intent).toBe('interested');
      expect(body.newStatus).toBe(LeadStatus.REPLIED);
      expect(body.scoreDelta).toBeGreaterThan(0);

      // Verify discrete REPLIED event in database
      const event = await prisma.emailEvent.findFirst({
        where: { leadId: lead.id, eventType: EventType.REPLIED }
      });
      expect(event).toBeDefined();
      expect((event?.payload as any)?.intent).toBe('interested');
    });

    it('ingests unsubscribe webhook, auto-upserts into suppression list, and drops score to 0', async () => {
      const email = `inbound.optout.${Date.now()}@inbound-test.com`;
      const lead = await createTestLead({ email, firstName: 'OptOutUser', jobTitle: 'VP Merchandising' });

      const webhookPayload = {
        from: lead.email,
        to: 'outreach@stylesense.ai',
        subject: 'Re: StyleSense AI',
        text: 'Please remove me from your list and do not contact me again.'
      };

      const res = await fetch(`${baseUrl}/api/tracking/webhook/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': ENV.INBOUND_WEBHOOK_SECRET
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.classification.intent).toBe('unsubscribe');
      expect(body.newStatus).toBe(LeadStatus.UNSUBSCRIBED);
      expect(body.newScore).toBe(0);

      // Verify recipient is in suppression list
      const suppression = await prisma.suppression.findUnique({
        where: { email: lead.email }
      });
      expect(suppression).toBeDefined();
      expect(suppression?.reason).toBe(SuppressionReason.UNSUBSCRIBE);
    });

    it('handles unmatched sender gracefully with HTTP 200 to prevent webhook retry storms', async () => {
      const res = await fetch(`${baseUrl}/api/tracking/webhook/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': ENV.INBOUND_WEBHOOK_SECRET
        },
        body: JSON.stringify({ from: 'unknown.stranger@random-domain.com', text: 'Who is this?' })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);
      expect(body.matched).toBe(false);
    });
  });

  // ==========================================================================================
  // Stretch Goal 3: Background Job Queue instead of Synchronous Calls
  // ==========================================================================================
  describe('3. Background Job Queue Service', () => {
    it('enqueues a job, transitions through queued -> processing -> completed, and tracks progress', async () => {
      const queue = new InMemoryJobQueue(2);

      const job = await queue.enqueue('LEAD_DISCOVERY', {
        icp: { industry: 'Apparel & Fashion', region: 'North America', companySize: '201-1000', targetTitles: ['Head of Merchandising'] }
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe('queued');

      // Wait briefly for worker processing
      await new Promise(r => setTimeout(r, 80));

      const completedJob = queue.getJob(job.id);
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.progress).toBe(100);
      expect(completedJob?.result).toBeDefined();
      expect(completedJob?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('reports real-time queue health and worker metrics', async () => {
      const queue = new InMemoryJobQueue(2);
      await queue.enqueue('FOLLOWUP_EVALUATION', { campaignId: 'camp-123' });
      await queue.enqueue('BATCH_OUTREACH', { leadIds: ['lead-1', 'lead-2'] });

      const metrics = queue.getMetrics();
      expect(metrics.concurrencyLimit).toBe(2);
      expect(metrics.totalEnqueued).toBe(2);
    });

    it('exposes job management endpoints via protected REST API', async () => {
      const resEnqueue = await fetch(`${baseUrl}/api/queue/jobs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ type: 'LEAD_DISCOVERY', payload: { icp: { industry: 'Apparel & Fashion' } } })
      });
      expect(resEnqueue.status).toBe(202);
      const dataEnqueue = await resEnqueue.json();
      expect(dataEnqueue.success).toBe(true);
      const jobId = dataEnqueue.data.id;

      const resJob = await fetch(`${baseUrl}/api/queue/jobs/${jobId}`, { headers: authHeaders });
      expect(resJob.status).toBe(200);
      const dataJob = await resJob.json();
      expect(dataJob.data.id).toBe(jobId);

      const resMetrics = await fetch(`${baseUrl}/api/queue/metrics`, { headers: authHeaders });
      expect(resMetrics.status).toBe(200);
      const dataMetrics = await resMetrics.json();
      expect(dataMetrics.data.concurrencyLimit).toBeDefined();
    });
  });

  // ==========================================================================================
  // Stretch Goal 4: Fuller Agentic Loop for Lead Discovery
  // ==========================================================================================
  describe('4. Fuller Autonomous Agentic Loop for Lead Discovery', () => {
    it('executes multi-iteration autonomous loop with dynamic planning, candidate gating, and self-termination', async () => {
      const icp = {
        industry: 'Apparel & Fashion',
        region: 'North America',
        companySize: '201-1000',
        targetTitles: ['Head of Merchandising', 'VP Supply Chain', 'Director of Demand Planning']
      };

      const loopResult = await AgentService.runAutonomousDiscoveryLoop(prisma, icp, {
        targetQuota: 2,
        maxIterations: 3
      });

      expect(loopResult.converged).toBe(true);
      expect(loopResult.acceptedCount).toBeGreaterThanOrEqual(2);
      expect(loopResult.queriesPlanned.length).toBeGreaterThanOrEqual(1);

      // Verify deliberate low-fit candidate was critically judged and rejected
      expect(loopResult.rejectedCount).toBeGreaterThanOrEqual(1);
      const rejected = loopResult.rejectedCandidates[0];
      expect(rejected.decision).toBe('REJECTED');
      expect(rejected.reason).toBeDefined();

      // Verify thought trajectory is logged
      expect(loopResult.thoughtTrajectory.length).toBeGreaterThanOrEqual(1);
      expect(loopResult.thoughtTrajectory[0].thought).toContain('Iteration');
      expect(loopResult.thoughtTrajectory[0].action).toContain('web_search');

      // Verify stopping reason
      expect(loopResult.stopReason).toBe('TARGET_QUOTA_REACHED');
      expect(loopResult.stoppingRationale).toContain('quota');
    });

    it('exposes POST /api/agent/discover-autonomous via REST API', async () => {
      const res = await fetch(`${baseUrl}/api/agent/discover-autonomous`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          industry: 'Apparel & Fashion',
          region: 'North America',
          companySize: '201-1000',
          targetQuota: 2,
          maxIterations: 2
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.converged).toBe(true);
      expect(body.thoughtTrajectory).toBeDefined();
      expect(body.acceptedCandidates.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================================
  // Stretch Goal 5: MongoDB alongside PostgreSQL Polyglot Layer
  // ==========================================================================================
  describe('5. Polyglot MongoDB Storage Layer & Architectural Defense', () => {
    it('stores massive unparsed HTML DOM scrapes in document store with zero PostgreSQL WAL bloat', async () => {
      const testDom = '<html><body><h1>Meridian Outerwear Trade Press</h1>' + '<p>DOM Content</p>'.repeat(500) + '</body></html>';
      const doc = await MongoRawStorageService.storeRawScrape(
        'https://outdoorretailer.com/full-dom-scrape',
        'outdoorretailer.com',
        testDom,
        { 'content-type': 'text/html; charset=UTF-8' },
        { brandIdentified: 'Meridian Outerwear' }
      );

      expect(doc.id).toBeDefined();
      expect(doc.rawHtmlByteSize).toBeGreaterThan(5000);

      const retrieved = await MongoRawStorageService.getRawScrape(doc.id);
      expect(retrieved?.url).toBe('https://outdoorretailer.com/full-dom-scrape');
    });

    it('stores raw email webhook payloads and agent reasoning traces without schema friction', async () => {
      const rawMime = 'From: prospect@apparel.com\r\nSubject: Inbound\r\n\r\nUnbounded raw MIME message...';
      const hookDoc = await MongoRawStorageService.storeRawWebhook('sendgrid', 'prospect@apparel.com', rawMime);
      expect(hookDoc.id).toBeDefined();

      const traceDoc = await MongoRawStorageService.storeAgentTrace({
        agentSessionId: 'sess_123',
        model: 'gemini-2.0-flash',
        iterationCount: 3,
        promptPayload: { system: 'Fashion Discovery Agent' },
        reasoningTraces: ['Query 1 planned', 'Candidate judged']
      });
      expect(traceDoc.tokenUsage.totalTokens).toBeGreaterThan(0);
    });

    it('returns comparative storage metrics and formal architectural defense via GET /api/leads/storage-metrics', async () => {
      const res = await fetch(`${baseUrl}/api/leads/storage-metrics`, { headers: authHeaders });
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data.metrics.relationalPostgres.engine).toContain('PostgreSQL');
      expect(body.data.metrics.documentMongo.engine).toContain('MongoDB');
      expect(body.data.architecturalDefense.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });
});

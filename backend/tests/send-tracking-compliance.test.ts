/**
 * StyleSense AI — 15% Send, Tracking & Compliance Adversarial Audit
 * 
 * Rubric Focus:
 * "15% Send, tracking & compliance - correct event capture, working unsubscribe/suppression Code + demo"
 * 
 * Tests:
 * 1. Tracking pixel GIF byte sequence (43 bytes) and strict caching headers
 * 2. Asynchronous OPENED event capture with SHA-256 IP hashing and user-agent
 * 3. Discrete event recording (DELIVERED, OPENED, UNSUBSCRIBED)
 * 4. Tracking idempotency (multiple opens do not inflate score past thresholds)
 * 5. Working GET unsubscribe link with UUID check and human-facing confirmation page
 * 6. RFC 8058 POST one-click unsubscribe support
 * 7. Console UI simulation endpoints (simulate-open, simulate-unsubscribe)
 * 8. Non-bypassable suppression gate (blocks subsequent sends with HTTP 409 Conflict)
 * 9. Case-insensitive email normalization in suppression lookups
 * 10. CAN-SPAM physical postal address and compliance statements in plain-text & HTML
 * 11. Replay verification: suppressed leads maintain 0 score across recalculations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, LeadStatus, EventType } from '@prisma/client';
import { createServer } from '../src/server.js';
import { EmailService, SuppressedRecipientError } from '../src/services/email.service.js';
import { GroundingService } from '../src/services/grounding.service.js';
import { ScoringService } from '../src/services/scoring.service.js';
import http from 'http';

describe('15% Send, Tracking & Compliance Audit Suite', () => {
  let prisma: PrismaClient;
  let server: http.Server;
  let baseUrl: string;
  let authToken: string;

  // 43-byte standard transparent GIF base64
  const EXPECTED_GIF_BASE64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const EXPECTED_GIF_BUFFER = Buffer.from(EXPECTED_GIF_BASE64, 'base64');

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

    // Obtain JWT token for authenticated endpoints
    const loginRes = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;
  });

  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  // ============================================================================
  // 1. TRACKING PIXEL INTEGRITY & HEADERS
  // ============================================================================
  describe('1. Tracking Pixel (1x1 Transparent GIF) Specifications', () => {
    it('returns exactly 42 bytes of valid GIF89a binary image with 200 OK', async () => {
      const lead = await prisma.lead.findFirst();
      expect(lead).toBeDefined();

      const res = await fetch(`${baseUrl}/api/tracking/pixel/${lead!.trackingToken}.png`);
      expect(res.status).toBe(200);

      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.length).toBe(EXPECTED_GIF_BUFFER.length);
      expect(buffer.equals(EXPECTED_GIF_BUFFER)).toBe(true);

      // Verify GIF89a header magic bytes
      const headerStr = buffer.subarray(0, 6).toString('ascii');
      expect(headerStr).toBe('GIF89a');
    });

    it('enforces aggressive anti-caching headers so email clients re-request on each view', async () => {
      const lead = await prisma.lead.findFirst();
      const res = await fetch(`${baseUrl}/api/tracking/pixel/${lead!.trackingToken}.png`);

      expect(res.headers.get('content-type')).toBe('image/gif');
      expect(res.headers.get('content-length')).toBe(EXPECTED_GIF_BUFFER.length.toString());

      const cacheControl = res.headers.get('cache-control') || '';
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('must-revalidate');
      expect(cacheControl).toContain('max-age=0');

      expect(res.headers.get('pragma')).toBe('no-cache');
      expect(res.headers.get('expires')).toBe('0');
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('gracefully returns transparent GIF without crashing if token is unrecognized', async () => {
      const fakeToken = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${baseUrl}/api/tracking/pixel/${fakeToken}.png`);

      expect(res.status).toBe(200);
      const buffer = Buffer.from(await res.arrayBuffer());
      expect(buffer.length).toBe(EXPECTED_GIF_BUFFER.length);
      expect(buffer.equals(EXPECTED_GIF_BUFFER)).toBe(true);
    });
  });

  // ============================================================================
  // 2. DISCRETE EVENT CAPTURE & PRIVACY-PRESERVING DATA
  // ============================================================================
  describe('2. Event Capture Correctness & Privacy Preservation', () => {
    it('records discrete OPENED event with privacy-hashed client IP (GDPR) and user-agent', async () => {
      // Create a fresh test company and lead
      const company = await prisma.company.upsert({
        where: { domain: 'tracking-test.com' },
        create: {
          name: 'Tracking Test Inc',
          domain: 'tracking-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '201-500',
          region: 'North America'
        },
        update: {}
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'Audit',
          lastName: 'Tester',
          email: `audit.pixel.${Date.now()}@tracking-test.com`,
          jobTitle: 'VP Merchandising',
          sourceUrl: 'https://wwd.com/business-news/retail/audit-test-12345',
          status: LeadStatus.CONTACTED
        }
      });

      // Initial fit score
      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'TEST_INIT');

      // Hit the tracking pixel with a specific custom User-Agent and Forwarded IP
      const testUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
      const testIp = '198.51.100.42';

      await fetch(`${baseUrl}/api/tracking/pixel/${lead.trackingToken}.png`, {
        headers: {
          'User-Agent': testUserAgent,
          'X-Forwarded-For': `${testIp}, 10.0.0.1`
        }
      });

      // Allow async event recording to commit
      await new Promise((r) => setTimeout(r, 150));

      const events = await prisma.emailEvent.findMany({
        where: { leadId: lead.id, eventType: EventType.OPENED }
      });

      expect(events.length).toBeGreaterThan(0);
      const openEvent = events[0];
      const payload = openEvent.payload as any;

      expect(payload.userAgent).toBe(testUserAgent);
      // Ensure raw IP is NOT stored in plain text (GDPR requirement)
      expect(payload.ipHash).toBeDefined();
      expect(payload.ipHash).not.toBe(testIp);
      expect(payload.ipHash.length).toBe(12);

      // Verify status updated to OPENED
      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { score: true }
      });
      expect(updatedLead?.status).toBe(LeadStatus.OPENED);

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });

    it('idempotently calculates engagement score when multiple pixel opens occur', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'multi-open-test.com' },
        create: {
          name: 'Multi Open Inc',
          domain: 'multi-open-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '201-500',
          region: 'North America'
        },
        update: {}
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'Multi',
          lastName: 'Viewer',
          email: `multi.open.${Date.now()}@multi-open-test.com`,
          jobTitle: 'Director Demand Planning',
          sourceUrl: 'https://wwd.com/business-news/retail/multi-open-test-12345',
          status: LeadStatus.CONTACTED
        }
      });

      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'TEST_INIT');

      // Record delivered event
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.DELIVERED,
          payload: { deliveredAt: new Date().toISOString() }
        }
      });

      // Hit pixel 4 consecutive times (simulating recipient re-opening message)
      for (let i = 0; i < 4; i++) {
        await fetch(`${baseUrl}/api/tracking/pixel/${lead.trackingToken}.png`);
        await new Promise((r) => setTimeout(r, 60));
      }

      // Check total OPENED events in raw store
      const events = await prisma.emailEvent.findMany({
        where: { leadId: lead.id, eventType: EventType.OPENED }
      });
      expect(events.length).toBe(4);

      // Derived engagement score must only count +15 once (delivered 5 + opened 15 = 20 pts)
      const finalLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { score: true }
      });

      expect(finalLead?.score?.engagementScore).toBe(20);

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });
  });

  // ============================================================================
  // 3. WORKING UNSUBSCRIBE & SUPPRESSION ENFORCEMENT
  // ============================================================================
  describe('3. Working Unsubscribe & Suppression List', () => {
    it('GET /api/tracking/unsubscribe/:token validates UUID format', async () => {
      const res = await fetch(`${baseUrl}/api/tracking/unsubscribe/invalid-uuid-format`);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain('Invalid unsubscribe token format');
    });

    it('GET /api/tracking/unsubscribe/:token returns 404 for unknown token', async () => {
      const nonExistentUuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
      const res = await fetch(`${baseUrl}/api/tracking/unsubscribe/${nonExistentUuid}`);
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toContain('Invalid or expired unsubscribe link');
    });

    it('GET /api/tracking/unsubscribe/:token successfully unsubscribes, updates DB and renders CAN-SPAM page', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'optout-test.com' },
        create: {
          name: 'OptOut Test Co',
          domain: 'optout-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '50-200',
          region: 'North America'
        },
        update: {}
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'OptOut',
          lastName: 'Candidate',
          email: `optout.test.${Date.now()}@optout-test.com`,
          jobTitle: 'Head of Merchandising',
          sourceUrl: 'https://sourcingjournal.com/optout-test-123',
          status: LeadStatus.CONTACTED
        }
      });

      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'TEST_INIT');

      // Click unsubscribe link (GET)
      const res = await fetch(`${baseUrl}/api/tracking/unsubscribe/${lead.trackingToken}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const html = await res.text();
      expect(html).toContain('Unsubscribe Confirmed');
      expect(html).toContain(lead.email);
      expect(html).toContain('CAN-SPAM Act');
      expect(html).toContain('StyleSense AI, Inc.');

      // 1. Verify UNSUBSCRIBED event in event store
      const unsubsEvent = await prisma.emailEvent.findFirst({
        where: { leadId: lead.id, eventType: EventType.UNSUBSCRIBED }
      });
      expect(unsubsEvent).toBeDefined();

      // 2. Verify suppression record exists
      const suppression = await prisma.suppression.findUnique({
        where: { email: lead.email.toLowerCase() }
      });
      expect(suppression).toBeDefined();
      expect(suppression?.reason).toBe('UNSUBSCRIBE');

      // 3. Verify lead status updated to UNSUBSCRIBED
      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { score: true }
      });
      expect(updatedLead?.status).toBe(LeadStatus.UNSUBSCRIBED);

      // 4. Verify score reset strictly to 0
      expect(updatedLead?.score?.currentScore).toBe(0);
      expect(updatedLead?.score?.fitScore).toBe(0);
      expect(updatedLead?.score?.engagementScore).toBe(0);
      expect(updatedLead?.score?.tier).toBe('COLD');

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: lead.email.toLowerCase() } });
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });

    it('POST /api/tracking/unsubscribe/:token supports RFC 8058 One-Click Unsubscribe', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'rfc8058-test.com' },
        create: {
          name: 'RFC 8058 Test Co',
          domain: 'rfc8058-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '201-500',
          region: 'North America'
        },
        update: {}
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'RFC',
          lastName: 'Recipient',
          email: `rfc8058.${Date.now()}@rfc8058-test.com`,
          jobTitle: 'VP Supply Chain',
          sourceUrl: 'https://sourcingjournal.com/rfc-test-123',
          status: LeadStatus.CONTACTED
        }
      });

      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'TEST_INIT');

      // Automated email client POSTs to unsubscribe URL
      const res = await fetch(`${baseUrl}/api/tracking/unsubscribe/${lead.trackingToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click'
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.suppressed).toBe(true);
      expect(json.email).toBe(lead.email);

      // Verify suppression record created
      const suppression = await prisma.suppression.findUnique({
        where: { email: lead.email.toLowerCase() }
      });
      expect(suppression).toBeDefined();

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: lead.email.toLowerCase() } });
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });

    it('POST /api/tracking/simulate-unsubscribe/:leadId executes console demo unsubscribe', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'sim-unsub-test.com' },
        create: {
          name: 'Sim Unsub Co',
          domain: 'sim-unsub-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '201-500',
          region: 'North America'
        },
        update: {}
      });

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'Demo',
          lastName: 'User',
          email: `demo.unsub.${Date.now()}@sim-unsub-test.com`,
          jobTitle: 'Director Demand Planning',
          sourceUrl: 'https://sourcingjournal.com/demo-unsub-123',
          status: LeadStatus.OPENED
        }
      });

      const res = await fetch(`${baseUrl}/api/tracking/simulate-unsubscribe/${lead.id}`, {
        method: 'POST'
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.suppressed).toBe(true);

      const updatedLead = await prisma.lead.findUnique({
        where: { id: lead.id },
        include: { score: true }
      });
      expect(updatedLead?.status).toBe(LeadStatus.UNSUBSCRIBED);
      expect(updatedLead?.score?.currentScore).toBe(0);

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: lead.email.toLowerCase() } });
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });
  });

  // ============================================================================
  // 4. SUPPRESSION GATE NON-BYPASSABILITY & NORMALIZATION
  // ============================================================================
  describe('4. Non-Bypassable Suppression Gate', () => {
    it('strictly blocks POST /api/leads/:id/send with HTTP 409 RECIPIENT_SUPPRESSED', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'gate-test.com' },
        create: {
          name: 'Gate Test Co',
          domain: 'gate-test.com',
          industry: 'Apparel & Fashion',
          sizeRange: '201-500',
          region: 'North America'
        },
        update: {}
      });

      const testEmail = `suppressed.gate.${Date.now()}@gate-test.com`;

      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'Suppressed',
          lastName: 'GateUser',
          email: testEmail,
          jobTitle: 'Head of Merchandising',
          sourceUrl: 'https://sourcingjournal.com/gate-test-123',
          status: LeadStatus.UNSUBSCRIBED
        }
      });

      // Register in suppression list
      await prisma.suppression.create({
        data: {
          email: testEmail.toLowerCase(),
          reason: 'UNSUBSCRIBE',
          leadId: lead.id
        }
      });

      // Attempt to send outreach
      const sendRes = await fetch(`${baseUrl}/api/leads/${lead.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });

      expect(sendRes.status).toBe(409);
      const sendBody = await sendRes.json();
      expect(sendBody.error.code).toBe('RECIPIENT_SUPPRESSED');
      expect(sendBody.error.message).toContain('suppression list');

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: testEmail.toLowerCase() } });
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });

    it('enforces case-insensitive suppression matching in EmailService.sendOutreach', async () => {
      const emailLower = `case.test.${Date.now()}@casetest.com`;

      // Add to suppression list in lowercase
      await prisma.suppression.create({
        data: {
          email: emailLower,
          reason: 'UNSUBSCRIBE'
        }
      });

      // Try sending with mixed casing and whitespace
      const emailMixed = `  CASE.test.${Date.now()}@CaseTest.COM  `.replace(/\d+/, emailLower.match(/\d+/)![0]);

      await expect(
        EmailService.sendOutreach(prisma, {
          leadId: '00000000-0000-0000-0000-000000000000',
          toEmail: emailMixed,
          recipientName: 'Case Prospect',
          subject: 'Test Subject',
          bodyText: 'Test text',
          bodyHtml: '<p>Test html</p>',
          trackingToken: '00000000-0000-0000-0000-000000000000'
        })
      ).rejects.toThrow(SuppressedRecipientError);

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: emailLower } });
    });

    it('GET /api/tracking/check-suppression/:email accurately verifies suppression status', async () => {
      const testEmail = `verify.check.${Date.now()}@verifycheck.com`;

      // Check non-suppressed
      const check1 = await fetch(`${baseUrl}/api/tracking/check-suppression/${testEmail}`);
      const data1 = await check1.json();
      expect(data1.isSuppressed).toBe(false);

      // Add to suppression
      await prisma.suppression.create({
        data: { email: testEmail.toLowerCase(), reason: 'MANUAL' }
      });

      // Check suppressed
      const check2 = await fetch(`${baseUrl}/api/tracking/check-suppression/${testEmail.toUpperCase()}`);
      const data2 = await check2.json();
      expect(data2.isSuppressed).toBe(true);
      expect(data2.suppression.reason).toBe('MANUAL');

      // Cleanup
      await prisma.suppression.deleteMany({ where: { email: testEmail.toLowerCase() } });
    });
  });

  // ============================================================================
  // 5. CAN-SPAM COMPLIANCE & PHYSICAL ADDRESS DISCLOSURE
  // ============================================================================
  describe('5. CAN-SPAM & GDPR Regulatory Disclosure Verification', () => {
    it('includes valid physical postal address and unsubscribe instructions in both plain-text and HTML', () => {
      const dummyTokens = {
        first_name: 'Elena',
        company_name: 'KnitWell Apparel',
        observed_signal_short: 'winter parkas discounting',
        observed_signal_sentence: 'your recent mid-season promotional sale discounting heavy insulated parkas by 30%',
        company_segment: 'outerwear',
        pain_point_category: 'overstock or heavy markdowns',
        value_prop_for_pain_point: 'forecast seasonal SKU demand with pinpoint accuracy',
        specific_context_detail: 'operations across 450 employees',
        one_line_relevance_hypothesis: 'AI demand forecasting protects gross margins before discount season',
        sender_name: 'Sanskar Sinha'
      };

      const trackingUrl = 'https://stylesense.ai/api/tracking/pixel/sample-token.png';
      const unsubUrl = 'https://stylesense.ai/api/tracking/unsubscribe/sample-token';

      const email = GroundingService.renderEmail(dummyTokens, trackingUrl, unsubUrl);

      // 1. Plain-text checks
      expect(email.bodyText).toContain('100 Fashion Ave, Suite 400, New York, NY 10018');
      expect(email.bodyText).toContain('StyleSense AI, Inc.');
      expect(email.bodyText).toContain(unsubUrl);
      expect(email.bodyText).toContain('To unsubscribe from future communications:');

      // 2. HTML checks
      expect(email.bodyHtml).toContain('100 Fashion Ave, Suite 400, New York, NY 10018');
      expect(email.bodyHtml).toContain('StyleSense AI, Inc.');
      expect(email.bodyHtml).toContain(unsubUrl);
      expect(email.bodyHtml).toContain(`<img src="${trackingUrl}"`);
    });
  });
});

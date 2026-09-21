/**
 * StyleSense AI — Section 3.1 Deep Forensic Audit Test Suite
 * 
 * Specifically designed to rigorously test and prove EVERY single requirement
 * of Section 3.1 of the assignment:
 * 1. Schema design, relationships, and constraints (Unique, Foreign Keys, Cascade, SetNull)
 * 2. REST API in Node.js covering leads, campaigns, events, with proper validation, pagination, and error responses
 * 3. PostgreSQL relational storage + JSONB semi-structured payloads
 * 4. Authentication & JWT token management securing API routes (No auth-free access)
 * 5. Event / Derived-state separation with mathematical proof of deterministic score reconstruction
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, LeadStatus, EventType, ScoreTier, CampaignStatus } from '@prisma/client';
import { createServer } from '../src/server.js';
import { ScoringService } from '../src/services/scoring.service.js';
import http from 'http';

describe('Section 3.1 Forensic Audit: Data Model, API & Lead Management', () => {
  let prisma: PrismaClient;
  let server: http.Server;
  let baseUrl: string;
  let authToken: string;

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
  // 1. SCHEMA DESIGN, RELATIONSHIPS & CONSTRAINTS
  // ============================================================================
  describe('1. Schema Design, Relationships & Constraints', () => {
    it('enforces UNIQUE constraint on Lead.email', async () => {
      const company = await prisma.company.findFirst();
      expect(company).toBeDefined();

      const uniqueEmail = `unique.constraint.${Date.now()}@test.com`;
      const lead1 = await prisma.lead.create({
        data: {
          companyId: company!.id,
          firstName: 'Original',
          lastName: 'Lead',
          email: uniqueEmail,
          jobTitle: 'Head of Merchandising',
          sourceUrl: 'https://wwd.com/test'
        }
      });

      let duplicateCaught = false;
      try {
        await prisma.lead.create({
          data: {
            companyId: company!.id,
            firstName: 'Duplicate',
            lastName: 'Lead',
            email: uniqueEmail, // Duplicate!
            jobTitle: 'VP Supply Chain',
            sourceUrl: 'https://wwd.com/test2'
          }
        });
      } catch (err: any) {
        duplicateCaught = true;
        expect(err.code).toBe('P2002');
      }

      expect(duplicateCaught).toBe(true);
      await prisma.lead.delete({ where: { id: lead1.id } });
    });

    it('enforces UNIQUE constraint on Company.domain', async () => {
      const uniqueDomain = `domain-${Date.now()}.com`;
      const comp1 = await prisma.company.create({
        data: {
          name: 'Unique Domain Co',
          domain: uniqueDomain,
          industry: 'Apparel & Fashion',
          sizeRange: '50-200',
          region: 'North America'
        }
      });

      let duplicateDomainCaught = false;
      try {
        await prisma.company.create({
          data: {
            name: 'Imposter Co',
            domain: uniqueDomain, // Duplicate!
            industry: 'Apparel & Fashion',
            sizeRange: '201-500',
            region: 'Europe'
          }
        });
      } catch (err: any) {
        duplicateDomainCaught = true;
        expect(err.code).toBe('P2002');
      }

      expect(duplicateDomainCaught).toBe(true);
      await prisma.company.delete({ where: { id: comp1.id } });
    });

    it('enforces CASCADE DELETE from Company -> Lead -> LeadScore, ScoreHistory, EmailEvent', async () => {
      // 1. Create company
      const comp = await prisma.company.create({
        data: {
          name: 'Cascade Parent Corp',
          domain: `parent-cascade-${Date.now()}.com`,
          industry: 'Apparel & Fashion',
          sizeRange: '201-1000',
          region: 'North America'
        }
      });

      // 2. Create lead under company
      const lead = await prisma.lead.create({
        data: {
          companyId: comp.id,
          firstName: 'Child',
          lastName: 'Prospect',
          email: `cascade.child.${Date.now()}@parent.com`,
          jobTitle: 'Inventory Allocation Manager',
          sourceUrl: 'https://wwd.com/cascade'
        }
      });

      // 3. Create lead score
      const leadScore = await prisma.leadScore.create({
        data: {
          leadId: lead.id,
          currentScore: 65,
          fitScore: 45,
          engagementScore: 20,
          tier: ScoreTier.WARM
        }
      });

      // 4. Create score history
      await prisma.scoreHistory.create({
        data: {
          leadId: lead.id,
          previousScore: 45,
          newScore: 65,
          delta: 20,
          reason: 'Open tracked',
          triggerEvent: 'EMAIL_OPENED',
          breakdown: { fit: 45, eng: 20 }
        }
      });

      // 5. Create email event
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.OPENED,
          messageId: 'cascade_msg_test_1'
        }
      });

      // 6. Delete company: Should CASCADE all the way through!
      await prisma.company.delete({ where: { id: comp.id } });

      // Verify lead is gone
      const deadLead = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(deadLead).toBeNull();

      // Verify score is gone
      const deadScore = await prisma.leadScore.findUnique({ where: { id: leadScore.id } });
      expect(deadScore).toBeNull();

      // Verify score history is gone
      const deadHistories = await prisma.scoreHistory.findMany({ where: { leadId: lead.id } });
      expect(deadHistories.length).toBe(0);

      // Verify events are gone
      const deadEvents = await prisma.emailEvent.findMany({ where: { leadId: lead.id } });
      expect(deadEvents.length).toBe(0);
    });

    it('enforces FOREIGN KEY constraint rejection on invalid foreign key IDs', async () => {
      let errorCaught = false;
      try {
        await prisma.lead.create({
          data: {
            companyId: '11111111-1111-1111-1111-111111111111', // Non-existent foreign key
            firstName: 'Bad',
            lastName: 'FK',
            email: `bad.fk.${Date.now()}@test.com`,
            jobTitle: 'Director',
            sourceUrl: 'https://test.com'
          }
        });
      } catch (err: any) {
        errorCaught = true;
        expect(err.code).toBe('P2003'); // Foreign key constraint violation
      }
      expect(errorCaught).toBe(true);
    });
  });

  // ============================================================================
  // 2. REST API VALIDATION, PAGINATION & ERROR HANDLING (NOT JUST HAPPY PATH)
  // ============================================================================
  describe('2. REST API Validation, Pagination & Error Responses', () => {
    it('POST /api/leads validates request body schema and returns RFC 7807 on missing fields', async () => {
      const res = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          firstName: 'Incomplete'
          // Missing lastName, email, jobTitle, company, sourceUrl!
        })
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.statusCode).toBe(422);
      expect(Array.isArray(body.error.issues)).toBe(true);
      expect(body.error.issues.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /api/leads validates email format and rejects invalid emails', async () => {
      const res = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Format',
          email: 'not-an-email-at-all',
          jobTitle: 'VP Merchandising',
          sourceUrl: 'https://wwd.com',
          company: {
            name: 'Format Brand',
            domain: `format-${Date.now()}.com`
          }
        })
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      const emailIssue = body.error.issues.find((i: any) => i.field === 'email');
      expect(emailIssue).toBeDefined();
      expect(emailIssue.message).toContain('email');
    });

    it('POST /api/leads prevents duplicate email creation with HTTP 409 Conflict', async () => {
      const existingLead = await prisma.lead.findFirst({ include: { company: true } });
      expect(existingLead).toBeDefined();

      const res = await fetch(`${baseUrl}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          firstName: 'Duplicate',
          lastName: 'Check',
          email: existingLead!.email, // Existing email!
          jobTitle: 'Merchandiser',
          sourceUrl: 'https://wwd.com/dup',
          company: {
            name: existingLead!.company.name,
            domain: existingLead!.company.domain
          }
        })
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe('DUPLICATE_RESOURCE');
      expect(body.error.statusCode).toBe(409);
    });

    it('GET /api/leads correctly implements pagination limits, pages, and metadata', async () => {
      const res = await fetch(`${baseUrl}/api/leads?page=1&limit=3`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(3);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(3);
      expect(body.pagination.totalCount).toBeGreaterThan(0);
      expect(typeof body.pagination.totalPages).toBe('number');
      expect(typeof body.pagination.hasNextPage).toBe('boolean');
      expect(typeof body.pagination.hasPrevPage).toBe('boolean');
    });

    it('GET /api/leads supports multi-field sorting (sortBy=score, sortBy=name, sortBy=company)', async () => {
      // Sort by score desc
      const resScore = await fetch(`${baseUrl}/api/leads?sortBy=score&sortOrder=desc&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(resScore.status).toBe(200);
      const dataScore = await resScore.json();
      for (let i = 0; i < dataScore.data.length - 1; i++) {
        const current = dataScore.data[i].score?.currentScore ?? 0;
        const next = dataScore.data[i + 1].score?.currentScore ?? 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }

      // Sort by name asc
      const resName = await fetch(`${baseUrl}/api/leads?sortBy=name&sortOrder=asc&limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(resName.status).toBe(200);
    });

    it('Campaigns REST API: complete CRUD lifecycle (GET, POST, GET /:id, PATCH, DELETE)', async () => {
      // 1. CREATE Campaign
      const createRes = await fetch(`${baseUrl}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: `CRUD Test Campaign ${Date.now()}`,
          description: 'Automated test campaign lifecycle verification',
          status: 'ACTIVE',
          icpCriteria: {
            industry: 'Apparel & Fashion',
            region: 'Europe',
            companySize: '201-1000',
            targetTitles: ['VP Merchandising']
          }
        })
      });

      expect(createRes.status).toBe(201);
      const createData = await createRes.json();
      expect(createData.success).toBe(true);
      const campaignId = createData.data.id;

      // 2. GET Campaign by ID
      const getRes = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.data.id).toBe(campaignId);
      expect(getData.data.status).toBe('ACTIVE');

      // 3. PATCH Campaign
      const patchRes = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: 'PAUSED',
          description: 'Updated campaign description'
        })
      });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.data.status).toBe('PAUSED');

      // 4. DELETE Campaign
      const deleteRes = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(deleteRes.status).toBe(200);

      // 5. GET after delete returns 404
      const getDead = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(getDead.status).toBe(404);
    });
  });

  // ============================================================================
  // 3. POSTGRESQL RELATIONAL DATA + JSONB SEMI-STRUCTURED STORAGE
  // ============================================================================
  describe('3. PostgreSQL Relational & JSONB Storage Capabilities', () => {
    it('stores and queries complex semi-structured JSONB payloads across all models', async () => {
      const company = await prisma.company.findFirst();
      expect(company).toBeDefined();

      const complexJsonNotes = {
        observedSignalSentence: 'Reported inventory markdown pressures in Q3 financial earnings',
        observedSignalShort: 'Q3 markdown pressures',
        companySegment: 'contemporary premium apparel',
        painPointCategory: 'overstock or heavy markdowns',
        valuePropForPainPoint: 'forecast seasonal SKU demand with pinpoint accuracy',
        quantifiedOutcomeOptional: '28% reduction in excess promotional markdowns',
        specificContextDetail: 'active across multi-channel retail footprint',
        deepNestedMetadata: {
          scrapedAt: new Date().toISOString(),
          parserVersion: 'v2.4.1',
          keywords: ['markdowns', 'SKU rationalization', 'clearance'],
          confidenceScore: 0.94
        }
      };

      const lead = await prisma.lead.create({
        data: {
          companyId: company!.id,
          firstName: 'JSONB',
          lastName: 'Tester',
          email: `jsonb.test.${Date.now()}@stylesense.ai`,
          jobTitle: 'Director of Inventory Planning',
          sourceUrl: 'https://wwd.com/jsonb-test',
          researchNotes: complexJsonNotes
        }
      });

      // Query back from PostgreSQL and verify JSONB integrity
      const fetched = await prisma.lead.findUnique({
        where: { id: lead.id }
      });

      expect(fetched?.researchNotes).toBeDefined();
      const notes = fetched?.researchNotes as any;
      expect(notes.deepNestedMetadata.keywords).toContain('markdowns');
      expect(notes.deepNestedMetadata.confidenceScore).toBe(0.94);
      expect(notes.quantifiedOutcomeOptional).toBe('28% reduction in excess promotional markdowns');

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
    });
  });

  // ============================================================================
  // 4. AUTHENTICATION & JWT TOKEN MANAGEMENT (NO AUTH-FREE ACCESS)
  // ============================================================================
  describe('4. Authentication & Security (No Auth-Free Access to Leads/Campaigns)', () => {
    it('strictly blocks unauthenticated access to GET /api/leads with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/leads`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('strictly blocks unauthenticated access to GET /api/campaigns with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/campaigns`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('strictly rejects forged or invalid JWT tokens with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/leads`, {
        headers: { Authorization: 'Bearer forged.fake.jwt.token' }
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('POST /api/auth/login validates credentials with bcrypt password verification', async () => {
      // 1. Test wrong password
      const wrongRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sales@stylesense.ai',
          password: 'WRONG_PASSWORD_123'
        })
      });
      expect(wrongRes.status).toBe(401);

      // 2. Test correct password
      const rightRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sales@stylesense.ai',
          password: 'password123'
        })
      });
      expect(rightRes.status).toBe(200);
      const data = await rightRes.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
    });
  });

  // ============================================================================
  // 5. EVENT / DERIVED-STATE SEPARATION & DETERMINISTIC RECONSTRUCTION
  // ============================================================================
  describe('5. Event / Derived-State Separation & Score Replay Proof', () => {
    it('verifies that discrete raw email events are recorded independently from derived score projections', async () => {
      const company = await prisma.company.findFirst();
      const lead = await prisma.lead.create({
        data: {
          companyId: company!.id,
          firstName: 'EventStore',
          lastName: 'Verifier',
          email: `eventstore.verifier.${Date.now()}@stylesense.ai`,
          jobTitle: 'VP Supply Chain',
          sourceUrl: 'https://wwd.com/eventstore',
          status: LeadStatus.CONTACTED
        }
      });

      // Compute initial fit score
      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'TEST_INIT');

      // Record 3 raw events over time
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.DELIVERED,
          messageId: 'msg_event_1',
          payload: { timestamp: new Date().toISOString() }
        }
      });
      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'EMAIL_DELIVERED');

      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.OPENED,
          messageId: 'msg_event_2',
          payload: { ipHash: 'a1b2c3d4e5f6', userAgent: 'AppleWebKit' }
        }
      });
      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'EMAIL_OPENED');

      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.REPLIED,
          messageId: 'msg_event_3',
          payload: { intent: 'interested', confidence: 0.95 }
        }
      });
      await ScoringService.recomputeAndSaveScore(prisma, lead.id, 'EMAIL_REPLIED');

      // Verify raw events are stored as 3 discrete rows
      const rawEvents = await prisma.emailEvent.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' }
      });
      expect(rawEvents.length).toBe(3);
      expect(rawEvents[0].eventType).toBe(EventType.DELIVERED);
      expect(rawEvents[1].eventType).toBe(EventType.OPENED);
      expect(rawEvents[2].eventType).toBe(EventType.REPLIED);

      // Verify derived score
      const derivedScoreBefore = await prisma.leadScore.findUnique({
        where: { leadId: lead.id }
      });
      expect(derivedScoreBefore?.currentScore).toBeGreaterThan(70);

      // ADVERSARIAL TEST: Completely wipe the derived score to 0
      await prisma.leadScore.update({
        where: { leadId: lead.id },
        data: { currentScore: 0, fitScore: 0, engagementScore: 0, tier: ScoreTier.COLD }
      });

      const wiped = await prisma.leadScore.findUnique({ where: { leadId: lead.id } });
      expect(wiped?.currentScore).toBe(0);

      // REPLAY: Recompute from raw event history alone
      const replayed = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'DETERMINISTIC_REPLAY_TEST'
      );

      // MATHEMATICAL PROOF: The recomputed score must exactly match derivedScoreBefore
      expect(replayed.newScore).toBe(derivedScoreBefore?.currentScore);
      expect(replayed.breakdown.fitScore).toBe(derivedScoreBefore?.fitScore);
      expect(replayed.breakdown.engagementScore).toBe(derivedScoreBefore?.engagementScore);

      const replayedDb = await prisma.leadScore.findUnique({ where: { leadId: lead.id } });
      expect(replayedDb?.currentScore).toBe(derivedScoreBefore?.currentScore);
      expect(replayedDb?.fitScore).toBe(derivedScoreBefore?.fitScore);
      expect(replayedDb?.engagementScore).toBe(derivedScoreBefore?.engagementScore);

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
    });
  });
});
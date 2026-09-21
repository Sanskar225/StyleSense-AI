import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, ScoreTier, EventType, LeadStatus } from '@prisma/client';
import { ScoringService } from '../src/services/scoring.service.js';
import { SCORING_CONFIG } from '../src/config/scoring.config.js';

describe('Section 3.3 — Lead Scoring Engine & Config Forensic Audit', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================================
  // 1. CONFIGURATION INTEGRITY & NO HARDCODED WEIGHTS
  // ============================================================================
  describe('1. Configuration File Integrity (scoring.config.ts)', () => {
    it('enforces that maxFitScore + maxEngagementScore equals exactly 100', () => {
      const { fit, engagement } = SCORING_CONFIG;
      expect(fit.maxFitScore).toBe(50);
      expect(engagement.maxEngagementScore).toBe(50);
      expect(fit.maxFitScore + engagement.maxEngagementScore).toBe(100);
    });

    it('enforces monotonic threshold order: hot > warm > cold', () => {
      const { hot, warm, cold } = SCORING_CONFIG.thresholds;
      expect(hot).toBeGreaterThan(warm);
      expect(warm).toBeGreaterThan(cold);
      expect(cold).toBe(0);
      expect(hot).toBe(75);
      expect(warm).toBe(45);
    });

    it('contains comprehensive primary and secondary title weights for apparel ICP', () => {
      const { titleWeights } = SCORING_CONFIG.fit;
      expect(titleWeights.primaryTitles.length).toBeGreaterThan(5);
      expect(titleWeights.primaryTitles).toContain('Head of Merchandising');
      expect(titleWeights.primaryTitles).toContain('VP Merchandising');
      expect(titleWeights.primaryTitles).toContain('Director of Demand Planning');
      expect(titleWeights.primaryWeight).toBe(25);
      expect(titleWeights.secondaryWeight).toBe(15);
      expect(titleWeights.defaultWeight).toBe(5);
    });

    it('configures distinct size tier brackets centered around sweet spot (201-1000)', () => {
      const { companySizeWeights } = SCORING_CONFIG.fit;
      const sweetSpot = companySizeWeights.ranges.find((r) => r.min === 201 && r.max === 1000);
      expect(sweetSpot).toBeDefined();
      expect(sweetSpot?.weight).toBe(15); // Highest size weight
    });
  });

  // ============================================================================
  // 2. MATHEMATICAL SCORE CALCULATION & BOUNDS
  // ============================================================================
  describe('2. Pure Fit and Engagement Calculation Logic', () => {
    it('calculates primary title match with maximum title points capped at maxFitScore', () => {
      const lead = {
        jobTitle: 'Head of Merchandising',
        company: {
          industry: 'Apparel & Fashion',
          sizeRange: '201-1000',
          region: 'North America'
        }
      };

      const result = ScoringService.calculateFitScore(lead);
      // Title (25) + Size (15) + Industry (10) + Region (5) = 55 -> capped at 50
      expect(result.score).toBe(SCORING_CONFIG.fit.maxFitScore);
      expect(result.factors.titleMatch.points).toBe(SCORING_CONFIG.fit.titleWeights.primaryWeight);
      expect(result.factors.industryMatch.points).toBe(SCORING_CONFIG.fit.industryWeights.matchWeight);
    });

    it('assigns secondary title weight for mid-tier merchandising roles', () => {
      const lead = {
        jobTitle: 'Senior Demand Planner',
        company: {
          industry: 'Footwear & Accessories',
          sizeRange: '50-200',
          region: 'Europe'
        }
      };

      const result = ScoringService.calculateFitScore(lead);
      expect(result.factors.titleMatch.points).toBe(SCORING_CONFIG.fit.titleWeights.secondaryWeight);
      expect(result.score).toBeLessThanOrEqual(SCORING_CONFIG.fit.maxFitScore);
    });

    it('falls back to default weights for non-matching industries and titles', () => {
      const lead = {
        jobTitle: 'Junior Intern',
        company: {
          industry: 'Aerospace Engineering',
          sizeRange: '10-20',
          region: 'Antarctica'
        }
      };

      const result = ScoringService.calculateFitScore(lead);
      expect(result.factors.titleMatch.points).toBe(SCORING_CONFIG.fit.titleWeights.defaultWeight);
      expect(result.factors.industryMatch.points).toBe(SCORING_CONFIG.fit.industryWeights.defaultWeight);
      expect(result.factors.regionMatch.points).toBe(SCORING_CONFIG.fit.regionWeights.defaultWeight);
      expect(result.score).toBe(
        SCORING_CONFIG.fit.titleWeights.defaultWeight +
        SCORING_CONFIG.fit.companySizeWeights.defaultWeight +
        SCORING_CONFIG.fit.industryWeights.defaultWeight +
        SCORING_CONFIG.fit.regionWeights.defaultWeight
      );
    });

    it('computes engagement score correctly for delivered, opened, and interested reply', () => {
      const events = [
        { eventType: 'DELIVERED' as any },
        { eventType: 'OPENED' as any },
        { eventType: 'REPLIED' as any, payload: { intent: 'interested' } }
      ];

      const result = ScoringService.calculateEngagementScore(events);
      // Delivered (5) + Opened (15) + Interested (30) = 50
      expect(result.score).toBe(50);
      expect(result.isUnsubscribed).toBe(false);
      expect(result.factors.replyImpact.points).toBe(30);
    });

    it('caps engagement score at maxEngagementScore even with excessive events', () => {
      const events = [
        { eventType: 'DELIVERED' as any },
        { eventType: 'OPENED' as any },
        { eventType: 'CLICKED' as any },
        { eventType: 'REPLIED' as any, payload: { intent: 'interested' } }
      ];

      const result = ScoringService.calculateEngagementScore(events);
      // 5 + 15 + 10 + 30 = 60, capped at maxEngagementScore (50)
      expect(result.score).toBe(SCORING_CONFIG.engagement.maxEngagementScore);
    });

    it('drops engagement score strictly to 0 upon unsubscribe event', () => {
      const events = [
        { eventType: 'DELIVERED' as any },
        { eventType: 'OPENED' as any },
        { eventType: 'CLICKED' as any },
        { eventType: 'REPLIED' as any, payload: { intent: 'interested' } },
        { eventType: 'UNSUBSCRIBED' as any }
      ];

      const result = ScoringService.calculateEngagementScore(events);
      expect(result.score).toBe(0);
      expect(result.isUnsubscribed).toBe(true);
    });

    it('categorizes score tiers accurately based on configured thresholds', () => {
      expect(ScoringService.getTier(100)).toBe(ScoreTier.HOT);
      expect(ScoringService.getTier(85)).toBe(ScoreTier.HOT);
      expect(ScoringService.getTier(75)).toBe(ScoreTier.HOT);
      expect(ScoringService.getTier(74)).toBe(ScoreTier.WARM);
      expect(ScoringService.getTier(60)).toBe(ScoreTier.WARM);
      expect(ScoringService.getTier(45)).toBe(ScoreTier.WARM);
      expect(ScoringService.getTier(44)).toBe(ScoreTier.COLD);
      expect(ScoringService.getTier(30)).toBe(ScoreTier.COLD);
      expect(ScoringService.getTier(0)).toBe(ScoreTier.COLD);
    });
  });

  // ============================================================================
  // 3. DATABASE EVENT RECOMPUTATION & AUDIT TRAIL FORENSIC VERIFICATION
  // ============================================================================
  describe('3. Database Event Recomputation & Audit Trail (ScoreHistory)', () => {
    it('recomputes score on each discrete event and logs reason and delta in ScoreHistory', async () => {
      const company = await prisma.company.upsert({
        where: { domain: 'audit-scoring-co.com' },
        create: {
          name: 'Audit Scoring Co',
          domain: 'audit-scoring-co.com',
          industry: 'Apparel & Fashion', // 10 pts
          sizeRange: '201-1000',          // 15 pts
          region: 'North America'         // 5 pts
        },
        update: {}
      });

      const testEmail = `scoring.audit.${Date.now()}@audit-scoring-co.com`;
      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: 'Sienna',
          lastName: 'Miller',
          email: testEmail,
          jobTitle: 'VP Merchandising',
          sourceUrl: 'https://wwd.com/apparel/scoring-audit-test',
          status: LeadStatus.DISCOVERED
        }
      });

      // Event 0: Initial scoring on lead creation
      const initResult = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'LEAD_DISCOVERED',
        'Initial discovery scoring'
      );
      expect(initResult.newScore).toBe(50); // Fit: 50, Eng: 0
      expect(initResult.breakdown.tier).toBe(ScoreTier.WARM);

      // Event 1: Email DELIVERED (+5 pts)
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.DELIVERED,
          payload: { provider: 'sandbox' }
        }
      });
      const deliveredResult = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'EMAIL_DELIVERED',
        'Outreach email successfully delivered (+5 pts)'
      );
      expect(deliveredResult.newScore).toBe(55); // 50 + 5
      expect(deliveredResult.delta).toBe(5);

      // Event 2: Email OPENED via pixel (+15 pts)
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.OPENED,
          payload: { userAgent: 'MailClient/1.0', ipHash: 'abc123456789' }
        }
      });
      const openedResult = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'EMAIL_OPENED',
        'Prospect opened email (+15 pts)'
      );
      expect(openedResult.newScore).toBe(70); // 55 + 15 = 70 (Fit: 50, Eng: 20)
      expect(openedResult.delta).toBe(15);
      expect(openedResult.breakdown.tier).toBe(ScoreTier.WARM);

      // Event 3: Prospect REPLIED with 'interested' intent (+30 pts)
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.REPLIED,
          payload: { intent: 'interested', confidence: 0.96 }
        }
      });
      const replyResult = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'REPLY_RECEIVED',
        'Prospect replied with interested intent (+30 pts)'
      );
      expect(replyResult.newScore).toBe(100); // 50 fit + 50 eng (capped at max 50) = 100
      expect(replyResult.delta).toBe(30);
      expect(replyResult.breakdown.tier).toBe(ScoreTier.HOT);

      // Verify ScoreHistory audit trail in DB
      const history = await prisma.scoreHistory.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'asc' }
      });

      expect(history.length).toBe(4);
      expect(history[0].triggerEvent).toBe('LEAD_DISCOVERED');
      expect(history[1].triggerEvent).toBe('EMAIL_DELIVERED');
      expect(history[1].delta).toBe(5);
      expect(history[2].triggerEvent).toBe('EMAIL_OPENED');
      expect(history[2].delta).toBe(15);
      expect(history[3].triggerEvent).toBe('REPLY_RECEIVED');
      expect(history[3].delta).toBe(30);
      expect(history[3].newScore).toBe(100);

      // Verify audit history includes complete JSONB breakdown
      const lastAudit = history[3];
      const breakdown = lastAudit.breakdown as any;
      expect(breakdown.fitScore).toBe(50);
      expect(breakdown.engagementScore).toBe(50);
      expect(breakdown.factors.titleMatch.title).toBe('VP Merchandising');
      expect(breakdown.factors.replyImpact.intent).toBe('interested');

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.company.delete({ where: { id: company.id } });
    });
  });
});

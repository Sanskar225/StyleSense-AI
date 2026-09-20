import { describe, it, expect } from 'vitest';
import { ScoringService } from '../src/services/scoring.service.js';
import { SCORING_CONFIG } from '../src/config/scoring.config.js';
import { ScoreTier } from '@prisma/client';

describe('ScoringService — Lead Scoring Engine', () => {
  it('calculates primary title match with maximum title points', () => {
    const lead = {
      jobTitle: 'Head of Merchandising',
      company: {
        industry: 'Apparel & Fashion',
        sizeRange: '201-1000',
        region: 'North America'
      }
    };

    const result = ScoringService.calculateFitScore(lead);
    // Title (25) + Size (15) + Industry (10) + Region (5) = 55, capped at maxFitScore (50)
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

  it('drops engagement score to 0 upon unsubscribe event', () => {
    const events = [
      { eventType: 'DELIVERED' as any },
      { eventType: 'OPENED' as any },
      { eventType: 'UNSUBSCRIBED' as any }
    ];

    const result = ScoringService.calculateEngagementScore(events);
    expect(result.score).toBe(0);
    expect(result.isUnsubscribed).toBe(true);
  });

  it('categorizes score tiers accurately based on configured thresholds', () => {
    expect(ScoringService.getTier(85)).toBe(ScoreTier.HOT);
    expect(ScoringService.getTier(75)).toBe(ScoreTier.HOT);
    expect(ScoringService.getTier(60)).toBe(ScoreTier.WARM);
    expect(ScoringService.getTier(45)).toBe(ScoreTier.WARM);
    expect(ScoringService.getTier(30)).toBe(ScoreTier.COLD);
    expect(ScoringService.getTier(0)).toBe(ScoreTier.COLD);
  });
});

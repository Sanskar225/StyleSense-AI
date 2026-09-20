/**
 * StyleSense AI - Lead Scoring Engine
 * 
 * Requirement 3.3:
 * "A 0–100 score per lead combining fit (ICP match) and engagement (opened, replied).
 *  Recompute on every event and record why the score changed.
 *  Weights live in a config file, not scattered as constants through the codebase.
 *  Store raw events (opens, clicks, replies) separately from derived state (scores)
 *  so scores can be recomputed from history."
 */

import { SCORING_CONFIG } from '../config/scoring.config.js';
import { PrismaClient, Prisma, EventType, ScoreTier, LeadStatus } from '@prisma/client';

export interface ScoreBreakdown {
  fitScore: number;
  engagementScore: number;
  totalScore: number;
  tier: ScoreTier;
  factors: {
    titleMatch: { points: number; title: string };
    companySizeMatch: { points: number; sizeRange: string };
    industryMatch: { points: number; industry: string };
    regionMatch: { points: number; region: string };
    eventsBreakdown: { eventType: string; count: number; points: number }[];
    replyImpact: { intent?: string; points: number };
  };
}

export class ScoringService {
  /**
   * Calculate ICP Fit Score (0 to maxFitScore, default 50 pts)
   */
  public static calculateFitScore(lead: {
    jobTitle: string;
    company: {
      industry: string;
      sizeRange: string;
      region: string;
    };
  }): { score: number; factors: any } {
    const config = SCORING_CONFIG.fit;
    let titlePoints = config.titleWeights.defaultWeight;
    const normalizedTitle = lead.jobTitle.toLowerCase();

    // Check primary titles
    if (config.titleWeights.primaryTitles.some(t => normalizedTitle.includes(t.toLowerCase()) || t.toLowerCase().includes(normalizedTitle))) {
      titlePoints = config.titleWeights.primaryWeight;
    } else if (config.titleWeights.secondaryTitles.some(t => normalizedTitle.includes(t.toLowerCase()) || t.toLowerCase().includes(normalizedTitle))) {
      titlePoints = config.titleWeights.secondaryWeight;
    }

    // Check company size
    let sizePoints = config.companySizeWeights.defaultWeight;
    const sizeStr = lead.company.sizeRange;
    const sizeMatch = sizeStr.match(/(\d+)/);
    const parsedSize = sizeMatch ? parseInt(sizeMatch[1], 10) : 100;

    for (const range of config.companySizeWeights.ranges) {
      if (parsedSize >= range.min && parsedSize <= range.max) {
        sizePoints = range.weight;
        break;
      }
    }

    // Check industry
    let industryPoints = config.industryWeights.defaultWeight;
    if (config.industryWeights.targetIndustries.some(ind => lead.company.industry.toLowerCase().includes(ind.toLowerCase()))) {
      industryPoints = config.industryWeights.matchWeight;
    }

    // Check region
    let regionPoints = config.regionWeights.defaultWeight;
    if (config.regionWeights.targetRegions.some(reg => lead.company.region.toLowerCase().includes(reg.toLowerCase()))) {
      regionPoints = config.regionWeights.matchWeight;
    }

    const totalFit = Math.min(config.maxFitScore, titlePoints + sizePoints + industryPoints + regionPoints);

    return {
      score: totalFit,
      factors: {
        titleMatch: { points: titlePoints, title: lead.jobTitle },
        companySizeMatch: { points: sizePoints, sizeRange: lead.company.sizeRange },
        industryMatch: { points: industryPoints, industry: lead.company.industry },
        regionMatch: { points: regionPoints, region: lead.company.region }
      }
    };
  }

  /**
   * Calculate Engagement Score (0 to maxEngagementScore, default 50 pts)
   * from raw event history.
   */
  public static calculateEngagementScore(events: { eventType: EventType; payload?: any }[]): {
    score: number;
    factors: any;
    isUnsubscribed: boolean;
  } {
    const config = SCORING_CONFIG.engagement;
    let deliveredCount = 0;
    let openedCount = 0;
    let clickedCount = 0;
    let replyPoints = 0;
    let detectedIntent: string | undefined = undefined;
    let isUnsubscribed = false;

    for (const ev of events) {
      if (ev.eventType === 'UNSUBSCRIBED') {
        isUnsubscribed = true;
      } else if (ev.eventType === 'DELIVERED') {
        deliveredCount++;
      } else if (ev.eventType === 'OPENED') {
        openedCount++;
      } else if (ev.eventType === 'CLICKED') {
        clickedCount++;
      } else if (ev.eventType === 'REPLIED') {
        const intent = ev.payload?.intent || 'interested';
        detectedIntent = intent;
        if (intent === 'interested') {
          replyPoints = Math.max(replyPoints, config.replyIntents.interested);
        } else if (intent === 'needs_info') {
          replyPoints = Math.max(replyPoints, config.replyIntents.needs_info);
        } else if (intent === 'not_now') {
          replyPoints = Math.max(replyPoints, config.replyIntents.not_now);
        } else if (intent === 'wrong_person') {
          replyPoints = Math.max(replyPoints, config.replyIntents.wrong_person);
        } else if (intent === 'unsubscribe') {
          isUnsubscribed = true;
        }
      }
    }

    if (isUnsubscribed) {
      return {
        score: 0,
        factors: {
          eventsBreakdown: [{ eventType: 'UNSUBSCRIBED', count: 1, points: -100 }],
          replyImpact: { intent: 'unsubscribe', points: -100 }
        },
        isUnsubscribed: true
      };
    }

    // Engagement points (opens capped at 1 for primary scoring, delivering points)
    const deliveredPts = deliveredCount > 0 ? config.events.delivered : 0;
    const openedPts = openedCount > 0 ? config.events.opened : 0;
    const clickedPts = clickedCount > 0 ? config.events.clicked : 0;

    const rawEngagement = deliveredPts + openedPts + clickedPts + replyPoints;
    const totalEngagement = Math.min(config.maxEngagementScore, rawEngagement);

    return {
      score: totalEngagement,
      factors: {
        eventsBreakdown: [
          { eventType: 'DELIVERED', count: deliveredCount, points: deliveredPts },
          { eventType: 'OPENED', count: openedCount, points: openedPts },
          { eventType: 'CLICKED', count: clickedCount, points: clickedPts }
        ],
        replyImpact: { intent: detectedIntent, points: replyPoints }
      },
      isUnsubscribed: false
    };
  }

  /**
   * Determine score tier (COLD, WARM, HOT) based on config thresholds
   */
  public static getTier(score: number): ScoreTier {
    if (score >= SCORING_CONFIG.thresholds.hot) return ScoreTier.HOT;
    if (score >= SCORING_CONFIG.thresholds.warm) return ScoreTier.WARM;
    return ScoreTier.COLD;
  }

  /**
   * Recompute score for a single lead in database, record history audit trail,
   * and update derived LeadScore record.
   */
  public static async recomputeAndSaveScore(
    prisma: PrismaClient | Prisma.TransactionClient,
    leadId: string,
    triggerEvent: string,
    reasonOverride?: string
  ): Promise<{ newScore: number; delta: number; breakdown: ScoreBreakdown }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        company: true,
        events: { orderBy: { createdAt: 'asc' } },
        score: true
      }
    });

    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found`);
    }

    // 1. Calculate Fit Score
    const fitResult = this.calculateFitScore(lead);

    // 2. Calculate Engagement Score from raw event log
    const engagementResult = this.calculateEngagementScore(lead.events);

    let totalScore = 0;
    if (engagementResult.isUnsubscribed) {
      totalScore = 0;
    } else {
      totalScore = Math.min(100, fitResult.score + engagementResult.score);
    }

    const tier = this.getTier(totalScore);
    const previousScore = lead.score?.currentScore ?? 0;
    const delta = totalScore - previousScore;

    const breakdown: ScoreBreakdown = {
      fitScore: engagementResult.isUnsubscribed ? 0 : fitResult.score,
      engagementScore: engagementResult.score,
      totalScore,
      tier,
      factors: {
        ...fitResult.factors,
        ...engagementResult.factors
      }
    };

    const reason = reasonOverride || (
      delta === 0
        ? `Score evaluated at ${totalScore} pts (Fit: ${breakdown.fitScore}, Engagement: ${breakdown.engagementScore})`
        : delta > 0
          ? `Score increased by +${delta} pts due to ${triggerEvent.replace(/_/g, ' ').toLowerCase()}`
          : `Score decreased by ${delta} pts due to ${triggerEvent.replace(/_/g, ' ').toLowerCase()}`
    );

    // 3. Upsert LeadScore (Derived state)
    await prisma.leadScore.upsert({
      where: { leadId },
      create: {
        leadId,
        currentScore: totalScore,
        fitScore: breakdown.fitScore,
        engagementScore: breakdown.engagementScore,
        tier,
        lastComputedAt: new Date()
      },
      update: {
        currentScore: totalScore,
        fitScore: breakdown.fitScore,
        engagementScore: breakdown.engagementScore,
        tier,
        lastComputedAt: new Date()
      }
    });

    // 4. Record Score History audit trail if changed or triggered
    await prisma.scoreHistory.create({
      data: {
        leadId,
        previousScore,
        newScore: totalScore,
        delta,
        reason,
        triggerEvent,
        breakdown: breakdown as any
      }
    });

    return { newScore: totalScore, delta, breakdown };
  }

  /**
   * Recompute all lead scores in the entire database from history.
   * Demonstrates complete separation of raw events from derived state.
   */
  public static async recomputeAll(prisma: PrismaClient): Promise<{ total: number }> {
    const leads = await prisma.lead.findMany({ select: { id: true } });
    for (const lead of leads) {
      await this.recomputeAndSaveScore(prisma, lead.id, 'BATCH_HISTORY_RECOMPUTE', 'Recalculated from raw event history');
    }
    return { total: leads.length };
  }
}

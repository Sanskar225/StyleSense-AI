/**
 * StyleSense AI - Behaviour-Driven Follow-Up Engine
 * 
 * Stretch Goal 1:
 * "Click tracking and a behaviour-driven follow-up rule (e.g. no open after N days → resend)."
 */

import { PrismaClient, EventType, LeadStatus } from '@prisma/client';
import { EmailService } from './email.service.js';

export type FollowUpRuleType = 'NO_OPEN_3_DAYS' | 'OPENED_NO_REPLY_2_DAYS' | 'CLICKED_NO_REPLY_1_DAY';

export interface FollowUpCandidate {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  currentScore: number;
  status: LeadStatus;
  ruleType: FollowUpRuleType;
  ruleDescription: string;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  daysElapsed: number;
  suggestedSubject: string;
  suggestedBody: string;
}

export interface FollowUpThresholds {
  noOpenDays: number;         // Default: 3 days (or 72 hours)
  openedNoReplyDays: number;  // Default: 2 days (or 48 hours)
  clickedNoReplyDays: number; // Default: 1 day  (or 24 hours)
}

const DEFAULT_THRESHOLDS: FollowUpThresholds = {
  noOpenDays: 3,
  openedNoReplyDays: 2,
  clickedNoReplyDays: 1
};

export class FollowUpService {
  /**
   * Evaluates all active leads in the database and returns those qualifying for follow-up.
   * Suppressed, unsubscribed, bounced, or already replied leads are strictly excluded.
   */
  public static async getFollowUpQueue(
    prisma: PrismaClient,
    options?: {
      campaignId?: string;
      customThresholds?: Partial<FollowUpThresholds>;
      referenceNow?: Date;
    }
  ): Promise<{ totalEligible: number; queue: FollowUpCandidate[] }> {
    const now = options?.referenceNow || new Date();
    const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.customThresholds };

    // Fetch leads that have been contacted or opened
    const leads = await prisma.lead.findMany({
      where: {
        status: { in: [LeadStatus.CONTACTED, LeadStatus.OPENED] },
        suppression: null // Non-negotiable: Exclude suppressed leads
      },
      include: {
        company: true,
        score: true,
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const candidates: FollowUpCandidate[] = [];

    for (const lead of leads) {
      // Collect event flags
      const deliveryEvents = lead.events.filter(e => e.eventType === EventType.DELIVERED);
      const openEvents = lead.events.filter(e => e.eventType === EventType.OPENED);
      const clickEvents = lead.events.filter(e => e.eventType === EventType.CLICKED);
      const replyEvents = lead.events.filter(e => e.eventType === EventType.REPLIED);
      const unsubscribeEvents = lead.events.filter(e => e.eventType === EventType.UNSUBSCRIBED);

      // Guard: already replied or unsubscribed
      if (replyEvents.length > 0 || unsubscribeEvents.length > 0) {
        continue;
      }

      if (deliveryEvents.length === 0) {
        continue;
      }

      // Most recent delivery event
      const latestDelivery = deliveryEvents[0];
      const msSinceDelivery = now.getTime() - new Date(latestDelivery.createdAt).getTime();
      const daysSinceDelivery = Math.floor(msSinceDelivery / (1000 * 60 * 60 * 24));

      // 1. High Priority: Clicked link but no reply after N days
      if (clickEvents.length > 0) {
        const latestClick = clickEvents[0];
        const msSinceClick = now.getTime() - new Date(latestClick.createdAt).getTime();
        const daysSinceClick = Math.floor(msSinceClick / (1000 * 60 * 60 * 24));

        if (daysSinceClick >= thresholds.clickedNoReplyDays) {
          const draft = this.generateDraft(lead, 'CLICKED_NO_REPLY_1_DAY');
          candidates.push({
            leadId: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            companyName: lead.company.name,
            currentScore: lead.score?.currentScore ?? 0,
            status: lead.status,
            ruleType: 'CLICKED_NO_REPLY_1_DAY',
            ruleDescription: `Prospect clicked outreach link ${daysSinceClick}d ago with no reply recorded. High intent!`,
            priority: 'HIGH',
            daysElapsed: daysSinceClick,
            suggestedSubject: draft.subject,
            suggestedBody: draft.body
          });
          continue;
        }
      }

      // 2. Medium Priority: Opened email but no reply after N days
      if (openEvents.length > 0) {
        const latestOpen = openEvents[0];
        const msSinceOpen = now.getTime() - new Date(latestOpen.createdAt).getTime();
        const daysSinceOpen = Math.floor(msSinceOpen / (1000 * 60 * 60 * 24));

        if (daysSinceOpen >= thresholds.openedNoReplyDays) {
          const draft = this.generateDraft(lead, 'OPENED_NO_REPLY_2_DAYS');
          candidates.push({
            leadId: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            companyName: lead.company.name,
            currentScore: lead.score?.currentScore ?? 0,
            status: lead.status,
            ruleType: 'OPENED_NO_REPLY_2_DAYS',
            ruleDescription: `Prospect opened outreach email ${openEvents.length} time(s) (${daysSinceOpen}d ago) but has not replied.`,
            priority: 'MEDIUM',
            daysElapsed: daysSinceOpen,
            suggestedSubject: draft.subject,
            suggestedBody: draft.body
          });
          continue;
        }
      }

      // 3. Standard Priority: No open after N days -> Resend bump
      if (openEvents.length === 0 && daysSinceDelivery >= thresholds.noOpenDays) {
        const draft = this.generateDraft(lead, 'NO_OPEN_3_DAYS');
        candidates.push({
          leadId: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          companyName: lead.company.name,
          currentScore: lead.score?.currentScore ?? 0,
          status: lead.status,
          ruleType: 'NO_OPEN_3_DAYS',
          ruleDescription: `No open recorded ${daysSinceDelivery}d after outreach delivery. Trigger alternative hook bump.`,
          priority: 'STANDARD',
          daysElapsed: daysSinceDelivery,
          suggestedSubject: draft.subject,
          suggestedBody: draft.body
        });
      }
    }

    // Sort queue by priority and score
    const priorityRank = { HIGH: 3, MEDIUM: 2, STANDARD: 1 };
    candidates.sort((a, b) => {
      const pDiff = priorityRank[b.priority] - priorityRank[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.currentScore - a.currentScore;
    });

    return {
      totalEligible: candidates.length,
      queue: candidates
    };
  }

  /**
   * Generates a grounded, contextual follow-up draft using Appendix A tone and brand context.
   */
  public static generateDraft(
    lead: any,
    ruleType: FollowUpRuleType
  ): { subject: string; body: string } {
    const notes = (lead.researchNotes as any) || {};
    const company = lead.company?.name || 'your team';
    const name = lead.firstName || 'there';

    if (ruleType === 'CLICKED_NO_REPLY_1_DAY') {
      return {
        subject: `Quick question re: ${company}'s merchandising demo`,
        body: `Hi ${name},\n\nI noticed you had a chance to check out our demand forecasting benchmark. Given ${company}'s focus on seasonal allocation, I'd love to share our 3-minute interactive model showing how apparel retailers protect gross margins by up to 26%.\n\nWould you have 10 minutes this Thursday afternoon for a quick walk-through?\n\nBest,\nSanskar Sinha\nStyleSense AI`
      };
    }

    if (ruleType === 'OPENED_NO_REPLY_2_DAYS') {
      return {
        subject: `${company}'s inventory allocation - quick case study`,
        body: `Hi ${name},\n\nFollowing up on my note regarding ${notes.observedSignalShort || 'seasonal merchandising'}. Thought you might find this relevant: another ${notes.companySegment || 'apparel'} brand facing markdown pressure cut clearance deadstock by 19% in their first 90 days with StyleSense AI.\n\nOpen to reviewing our 1-page benchmark data for ${company}?\n\nBest,\nSanskar Sinha\nStyleSense AI`
      };
    }

    // Default: NO_OPEN_3_DAYS
    return {
      subject: `Following up: ${company} / StyleSense AI`,
      body: `Hi ${name},\n\nFloating this to the top of your inbox in case it slipped by. We've been helping apparel merchandising teams automate localized SKU demand curves to avoid overstock markdowns.\n\nWorth a brief 10-minute conversation this week?\n\nBest,\nSanskar Sinha\nStyleSense AI`
    };
  }

  /**
   * Dispatches a follow-up outreach email to an eligible lead, enforcing suppression.
   */
  public static async executeFollowUp(
    prisma: PrismaClient,
    leadId: string,
    ruleType: FollowUpRuleType
  ): Promise<{ success: boolean; messageId: string; followUpEventId: string }> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { company: true, suppression: true }
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    if (lead.suppression) {
      throw new Error(`Cannot execute follow-up: Recipient ${lead.email} is in the suppression list (${lead.suppression.reason})`);
    }

    const draft = this.generateDraft(lead, ruleType);
    const trackingPixelUrl = EmailService.getTrackingPixelUrl(lead.trackingToken);
    const unsubscribeUrl = EmailService.getUnsubscribeUrl(lead.trackingToken);

    // Send outreach email via EmailService
    const sendResult = await EmailService.sendOutreach(prisma, {
      leadId: lead.id,
      toEmail: lead.email,
      recipientName: `${lead.firstName} ${lead.lastName}`,
      subject: draft.subject,
      bodyText: draft.body,
      bodyHtml: `<p>${draft.body.replace(/\\n\\n/g, '</p><p>').replace(/\\n/g, '<br/>')}</p><br/><img src="${trackingPixelUrl}" width="1" height="1" alt="" /><br/><small><a href="${unsubscribeUrl}">Unsubscribe</a></small>`,
      trackingToken: lead.trackingToken
    });

    // Tag the event with follow-up metadata
    const followUpEvent = await prisma.emailEvent.create({
      data: {
        leadId: lead.id,
        eventType: EventType.DELIVERED,
        messageId: `followup_${Date.now()}_${lead.trackingToken.substring(0, 8)}`,
        payload: {
          isFollowUp: true,
          ruleType,
          sequenceStep: 2,
          deliveredAt: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      messageId: sendResult.messageId,
      followUpEventId: followUpEvent.id
    };
  }
}

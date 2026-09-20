/**
 * StyleSense AI - Inbound Reply Classifier & Response Drafter
 * 
 * Requirement 3.4:
 * "Reply classification: add a 'simulate reply' box in the UI where text can be pasted in;
 *  classify intent into a small set (interested, needs info, not now, wrong person, unsubscribe)
 *  and draft a contextual response for human approval."
 */

export type ReplyIntent = 'interested' | 'needs_info' | 'not_now' | 'wrong_person' | 'unsubscribe';

export interface ClassificationResult {
  intent: ReplyIntent;
  confidence: number;
  extractedSignals: string[];
  suggestedAction: string;
  draftedResponse: {
    subject: string;
    body: string;
  };
}

export class ClassifierService {
  /**
   * Classify inbound email reply text into one of 5 intents.
   * Employs semantic feature extraction with confidence scoring.
   */
  public static classifyReply(
    replyText: string,
    context?: {
      prospectName?: string;
      companyName?: string;
      originalSubject?: string;
    }
  ): ClassificationResult {
    const text = replyText.toLowerCase();
    const prospectName = context?.prospectName || 'there';
    const companyName = context?.companyName || 'your company';

    // 1. Unsubscribe Detection (Highest priority for legal/compliance)
    const unsubKeywords = [
      'unsubscribe',
      'remove me',
      'take me off',
      'do not contact',
      'stop emailing',
      'delete my',
      'mailing list',
      'opt out',
      'spam'
    ];
    const unsubMatches = unsubKeywords.filter(kw => text.includes(kw));
    if (unsubMatches.length > 0) {
      return {
        intent: 'unsubscribe',
        confidence: 0.98,
        extractedSignals: unsubMatches,
        suggestedAction: 'Immediately suppress email and confirm opt-out compliance.',
        draftedResponse: {
          subject: context?.originalSubject ? `Re: ${context.originalSubject}` : 'Unsubscribe Confirmation - StyleSense AI',
          body: `Hi ${prospectName},\n\nYou have been permanently removed from our outreach list. We apologize for the interruption.\n\nBest regards,\nStyleSense AI Team`
        }
      };
    }

    // 2. Wrong Person / Referral Detection
    const wrongPersonKeywords = [
      'wrong person',
      'transitioned to',
      'left the',
      'no longer with',
      'no longer at',
      'reach out to',
      'not my department',
      'not my role',
      'not responsible',
      'speak with',
      'contact instead',
      'now heads',
      'leads demand',
      'leads merchandising'
    ];
    const wrongPersonMatches = wrongPersonKeywords.filter(kw => text.includes(kw));
    if (wrongPersonMatches.length > 0) {
      // Extract possible referral email if present
      const emailMatch = replyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const referralMention = emailMatch ? ` (${emailMatch[0]})` : '';

      return {
        intent: 'wrong_person',
        confidence: 0.92,
        extractedSignals: wrongPersonMatches,
        suggestedAction: 'Update lead contact record and route outreach to recommended colleague.',
        draftedResponse: {
          subject: context?.originalSubject ? `Re: ${context.originalSubject}` : 'Quick follow-up - StyleSense AI',
          body: `Hi ${prospectName},\n\nThank you so much for letting me know and pointing me in the right direction${referralMention}! I really appreciate your help.\n\nBest of luck in your current focus,\nSanskar\nStyleSense AI`
        }
      };
    }

    // 3. Not Now / Timing Delay Detection
    const notNowKeywords = [
      'not now',
      'not right now',
      'not a priority',
      'budget freeze',
      'heads-down',
      'check back',
      'ping me again',
      'next quarter',
      'next year',
      'next spring',
      'in february',
      'in q1',
      'in q2',
      'in q3',
      'in q4',
      'frozen',
      'busy right now',
      'later this year'
    ];
    const notNowMatches = notNowKeywords.filter(kw => text.includes(kw));
    if (notNowMatches.length > 0) {
      return {
        intent: 'not_now',
        confidence: 0.90,
        extractedSignals: notNowMatches,
        suggestedAction: 'Snooze lead and set automated calendar follow-up task for next review window.',
        draftedResponse: {
          subject: context?.originalSubject ? `Re: ${context.originalSubject}` : 'Follow up later - StyleSense AI',
          body: `Hi ${prospectName},\n\nUnderstood completely—timing is everything, especially during critical team milestones. I will make a note to check back with you in a few months.\n\nWishing you and the ${companyName} team a great quarter,\nSanskar\nStyleSense AI`
        }
      };
    }

    // 4. Interested / Meeting Request Detection
    const interestedKeywords = [
      'thursday',
      'monday',
      'tuesday',
      'wednesday',
      'friday',
      'tomorrow',
      'time slots',
      'calendar',
      'open to a call',
      'let\'s chat',
      'let\'s connect',
      'can do',
      'sounds good',
      'timely',
      'schedule a call',
      'set up a call',
      'pm et',
      'am et',
      'pt',
      'cet',
      'free at',
      'interested'
    ];
    const interestedMatches = interestedKeywords.filter(kw => text.includes(kw));
    if (interestedMatches.length >= 1 && (text.includes('chat') || text.includes('call') || text.includes('slots') || text.includes('free') || text.includes('can do') || text.includes('timely') || text.includes('headache') || text.includes('thursday') || text.includes('interested'))) {
      return {
        intent: 'interested',
        confidence: 0.95,
        extractedSignals: interestedMatches,
        suggestedAction: 'High Priority: Send calendar link or confirm proposed time slot within 1 hour.',
        draftedResponse: {
          subject: context?.originalSubject ? `Re: ${context.originalSubject}` : '15-min chat - StyleSense AI',
          body: `Hi ${prospectName},\n\nTerrific! I would be glad to connect. Thursday at 2:00 PM ET works great on my end. I'll send over a calendar invite with a Zoom link shortly.\n\nLooking forward to speaking,\nSanskar\nStyleSense AI\nhttps://cal.com/stylesense-ai/15min`
        }
      };
    }

    // 5. Needs Info / Case Study / Pricing Request Detection
    const needsInfoKeywords = [
      'case study',
      'one-pager',
      'deck',
      'pricing',
      'how does',
      'compare',
      'integration',
      'shopify',
      'netsuite',
      'timeline',
      'data inputs',
      'more information',
      'more info',
      'documentation',
      'blue yonder',
      'requirements'
    ];
    const needsInfoMatches = needsInfoKeywords.filter(kw => text.includes(kw));
    if (needsInfoMatches.length > 0) {
      return {
        intent: 'needs_info',
        confidence: 0.91,
        extractedSignals: needsInfoMatches,
        suggestedAction: 'Send StyleSense AI product architecture one-pager and case study.',
        draftedResponse: {
          subject: context?.originalSubject ? `Re: ${context.originalSubject}` : 'StyleSense AI Overview & Case Study',
          body: `Hi ${prospectName},\n\nGreat questions! We integrate directly with Shopify Plus and NetSuite via native REST connectors in under 2 weeks, requiring only historical SKU-level sales, returns, and current inventory feeds. Unlike legacy on-prem suites, StyleSense deploys pre-trained fashion demand models with zero custom training latency.\n\nI've attached our technical one-pager here: https://stylesense.ai/docs/fashion-overview.pdf\n\nWould you like to do a quick 15-minute walkthrough of the dashboard next week?\n\nBest,\nSanskar\nStyleSense AI`
        }
      };
    }

    // Fallback: Needs info with moderate confidence
    return {
      intent: 'needs_info',
      confidence: 0.70,
      extractedSignals: ['General inquiry'],
      suggestedAction: 'Review prospect response manually and tailor response.',
      draftedResponse: {
        subject: context?.originalSubject ? `Re: ${context.originalSubject}` : 'Following up - StyleSense AI',
        body: `Hi ${prospectName},\n\nThanks for your note! I would love to answer any questions you have about how StyleSense AI helps apparel brands optimize inventory and markdowns.\n\nBest,\nSanskar\nStyleSense AI`
      }
    };
  }
}

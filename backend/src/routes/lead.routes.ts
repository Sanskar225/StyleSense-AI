import { Router, Request, Response } from 'express';
import { PrismaClient, LeadStatus, ScoreTier } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { LeadService } from '../services/lead.service.js';
import { ScoringService } from '../services/scoring.service.js';
import { GroundingService, AppendixATokens } from '../services/grounding.service.js';
import { EmailService } from '../services/email.service.js';

export function createLeadRouter(prisma: PrismaClient): Router {
  const router = Router();

  // All lead routes require authentication
  router.use(authenticateJWT);

  // Validation schemas
  const listQuerySchema = z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
    status: z.nativeEnum(LeadStatus).optional(),
    tier: z.nativeEnum(ScoreTier).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['score', 'createdAt', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  });

  // GET /api/leads/metrics - KPI stats for console
  router.get('/metrics', async (req: Request, res: Response, next) => {
    try {
      const metrics = await LeadService.getPipelineMetrics(prisma);
      res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/leads - Ranked list of leads
  router.get('/', async (req: Request, res: Response, next) => {
    try {
      const filters = listQuerySchema.parse(req.query);
      const result = await LeadService.listLeads(prisma, filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/leads/:id - Detail view with relations
  router.get('/:id', async (req: Request, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const lead = await LeadService.getLeadById(prisma, id);

      if (!lead) {
        res.status(404).json({
          error: {
            code: 'LEAD_NOT_FOUND',
            message: `Lead with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/leads/:id/preview-email - Grounding verification and Appendix A preview
  router.post('/:id/preview-email', async (req: Request, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const lead = await LeadService.getLeadById(prisma, id);

      if (!lead) {
        res.status(404).json({
          error: {
            code: 'LEAD_NOT_FOUND',
            message: `Lead with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      const notes = (lead.researchNotes as any) || {};

      // Synthesize tokens from stored lead & company records
      const candidateTokens: AppendixATokens = {
        first_name: lead.firstName,
        company_name: lead.company.name,
        observed_signal_short: notes.observedSignalShort || 'recent collections launch',
        observed_signal_sentence: notes.observedSignalSentence || `your recent merchandise initiatives at ${lead.company.name}`,
        company_segment: notes.companySegment || 'apparel and fashion',
        pain_point_category: notes.painPointCategory || 'overstock or heavy markdowns',
        value_prop_for_pain_point: notes.valuePropForPainPoint || 'forecast seasonal SKU demand with pinpoint accuracy',
        quantified_outcome_optional: notes.quantifiedOutcomeOptional || undefined,
        specific_context_detail: notes.specificContextDetail || `operations across ${lead.company.sizeRange} employees`,
        one_line_relevance_hypothesis: notes.oneLineRelevanceHypothesis || 'data-driven allocation can prevent costly inventory imbalances',
        sender_name: req.user?.name || 'Sanskar Sinha',
        proposed_time_window: notes.proposedTimeWindow || undefined,
        optional_soft_proof_point: notes.optionalSoftProofPoint || undefined
      };

      // Run Programmatic Grounding Check (Section 3.4)
      const groundingResult = GroundingService.verifyGrounding(candidateTokens, {
        firstName: lead.firstName,
        sourceUrl: lead.sourceUrl,
        company: lead.company,
        researchNotes: lead.researchNotes
      });

      if (!groundingResult.isValid) {
        res.status(422).json({
          error: {
            code: 'GROUNDING_VERIFICATION_FAILED',
            message: 'Outreach generation blocked by grounding check: unverifiable claims detected.',
            statusCode: 422,
            details: groundingResult
          }
        });
        return;
      }

      const trackingPixelUrl = EmailService.getTrackingPixelUrl(lead.trackingToken);
      const unsubscribeUrl = EmailService.getUnsubscribeUrl(lead.trackingToken);

      const rendered = GroundingService.renderEmail(candidateTokens, trackingPixelUrl, unsubscribeUrl, 1);

      res.json({
        success: true,
        data: {
          leadId: lead.id,
          recipientEmail: lead.email,
          rendered,
          groundingCheck: groundingResult
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/leads/:id/send - Send cold outreach email
  router.post('/:id/send', async (req: Request, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const lead = await LeadService.getLeadById(prisma, id);

      if (!lead) {
        res.status(404).json({
          error: {
            code: 'LEAD_NOT_FOUND',
            message: `Lead with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      // Check suppression immediately
      const suppressed = await prisma.suppression.findUnique({
        where: { email: lead.email.toLowerCase() }
      });

      if (suppressed) {
        res.status(409).json({
          error: {
            code: 'RECIPIENT_SUPPRESSED',
            message: `Cannot send email to ${lead.email}: Recipient is in the suppression list (${suppressed.reason}).`,
            statusCode: 409
          }
        });
        return;
      }

      const notes = (lead.researchNotes as any) || {};
      const tokens: AppendixATokens = {
        first_name: lead.firstName,
        company_name: lead.company.name,
        observed_signal_short: notes.observedSignalShort || 'merchandise operations',
        observed_signal_sentence: notes.observedSignalSentence || `your brand's current seasonal strategy`,
        company_segment: notes.companySegment || 'apparel',
        pain_point_category: notes.painPointCategory || 'overstock or heavy markdowns',
        value_prop_for_pain_point: notes.valuePropForPainPoint || 'forecast seasonal SKU demand',
        quantified_outcome_optional: notes.quantifiedOutcomeOptional,
        specific_context_detail: notes.specificContextDetail || 'current market footprint',
        one_line_relevance_hypothesis: notes.oneLineRelevanceHypothesis || 'StyleSense demand forecasting protects gross margins',
        sender_name: req.user?.name || 'Sanskar Sinha',
        proposed_time_window: notes.proposedTimeWindow,
        optional_soft_proof_point: notes.optionalSoftProofPoint
      };

      // Grounding check prior to dispatch
      const grounding = GroundingService.verifyGrounding(tokens, {
        firstName: lead.firstName,
        sourceUrl: lead.sourceUrl,
        company: lead.company,
        researchNotes: lead.researchNotes
      });

      if (!grounding.isValid) {
        res.status(422).json({
          error: {
            code: 'GROUNDING_VERIFICATION_FAILED',
            message: 'Outreach generation blocked by grounding check: unverifiable claims detected.',
            statusCode: 422,
            details: grounding
          }
        });
        return;
      }

      const trackingPixelUrl = EmailService.getTrackingPixelUrl(lead.trackingToken);
      const unsubscribeUrl = EmailService.getUnsubscribeUrl(lead.trackingToken);
      const rendered = GroundingService.renderEmail(tokens, trackingPixelUrl, unsubscribeUrl, 1);

      // Send outreach through provider (enforces suppression!)
      const sendResult = await EmailService.sendOutreach(prisma, {
        leadId: lead.id,
        toEmail: lead.email,
        recipientName: `${lead.firstName} ${lead.lastName}`,
        subject: rendered.subject,
        bodyText: rendered.bodyText,
        bodyHtml: rendered.bodyHtml,
        trackingToken: lead.trackingToken
      });

      const updatedLead = await LeadService.getLeadById(prisma, id);

      res.json({
        success: true,
        data: {
          sendResult,
          lead: updatedLead
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/leads/:id/recompute-score - Recomputes score from event history
  router.post('/:id/recompute-score', async (req: Request, res: Response, next) => {
    try {
      const id = req.params.id as string;
      const result = await ScoringService.recomputeAndSaveScore(
        prisma,
        id,
        'MANUAL_USER_RECOMPUTE',
        'Manual score recalculation triggered from console'
      );

      const lead = await LeadService.getLeadById(prisma, id);

      res.json({
        success: true,
        data: {
          lead,
          scoreResult: result
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/leads/recompute-all - Batch recalculation of all scores from raw history
  router.post('/recompute-all', async (req: Request, res: Response, next) => {
    try {
      const result = await ScoringService.recomputeAll(prisma);
      res.json({
        success: true,
        message: `Successfully recomputed scores for ${result.total} leads from raw event history.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

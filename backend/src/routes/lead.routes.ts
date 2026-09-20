import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma, LeadStatus, ScoreTier } from '@prisma/client';
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
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1))
      .refine((v) => !isNaN(v) && v >= 1, { message: 'Page must be a positive integer >= 1' }),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 10))
      .refine((v) => !isNaN(v) && v >= 1 && v <= 100, { message: 'Limit must be between 1 and 100' }),
    status: z.nativeEnum(LeadStatus).optional(),
    tier: z.nativeEnum(ScoreTier).optional(),
    search: z.string().max(100, 'Search query cannot exceed 100 characters').optional(),
    sortBy: z.enum(['score', 'createdAt', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  });

  const leadIdParamSchema = z.object({
    id: z.string().uuid('Lead ID must be a valid UUID format')
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
      const { id } = leadIdParamSchema.parse(req.params);
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
      const { id } = leadIdParamSchema.parse(req.params);
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
      const { id } = leadIdParamSchema.parse(req.params);
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
      const { id } = leadIdParamSchema.parse(req.params);
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

  // POST /api/leads - Create new lead manually with company and initial fit score
  router.post('/', async (req: Request, res: Response, next) => {
    try {
      const createLeadSchema = z.object({
        firstName: z.string().min(1, 'First name is required').max(50),
        lastName: z.string().min(1, 'Last name is required').max(50),
        email: z.string().email('Invalid email address format').transform((v) => v.trim().toLowerCase()),
        jobTitle: z.string().min(1, 'Job title is required').max(100),
        department: z.string().default('Merchandising'),
        sourceUrl: z.string().url('Source URL must be a valid URL'),
        company: z.object({
          name: z.string().min(1, 'Company name is required'),
          domain: z.string().min(1, 'Company domain is required').transform((v) => v.trim().toLowerCase()),
          industry: z.string().default('Apparel & Fashion'),
          sizeRange: z.string().default('201-1000'),
          region: z.string().default('North America')
        }),
        researchNotes: z.record(z.any()).optional()
      });

      const body = createLeadSchema.parse(req.body);

      // Check if lead already exists
      const existing = await prisma.lead.findUnique({
        where: { email: body.email }
      });

      if (existing) {
        res.status(409).json({
          error: {
            code: 'DUPLICATE_RESOURCE',
            message: `A lead with email ${body.email} already exists.`,
            statusCode: 409
          }
        });
        return;
      }

      // Upsert company
      const company = await prisma.company.upsert({
        where: { domain: body.company.domain },
        create: {
          name: body.company.name,
          domain: body.company.domain,
          industry: body.company.industry,
          sizeRange: body.company.sizeRange,
          region: body.company.region
        },
        update: {
          name: body.company.name,
          industry: body.company.industry,
          sizeRange: body.company.sizeRange,
          region: body.company.region
        }
      });

      // Check if email is already in suppression list
      const suppressed = await prisma.suppression.findUnique({
        where: { email: body.email }
      });

      // Create lead (if suppressed, set status to UNSUBSCRIBED immediately)
      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          jobTitle: body.jobTitle,
          department: body.department,
          sourceUrl: body.sourceUrl,
          status: suppressed ? LeadStatus.UNSUBSCRIBED : LeadStatus.DISCOVERED,
          researchNotes: body.researchNotes ? (body.researchNotes as Prisma.InputJsonValue) : Prisma.DbNull
        },
        include: { company: true }
      });

      if (suppressed && !suppressed.leadId) {
        await prisma.suppression.update({
          where: { email: body.email },
          data: { leadId: lead.id }
        });
      }

      // Calculate initial fit score (will evaluate to 0 if suppressed)
      await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        suppressed ? 'MANUAL_LEAD_CREATED_SUPPRESSED' : 'MANUAL_LEAD_CREATED',
        suppressed 
          ? `New prospect created but already on suppression list (${suppressed.reason}); score set to 0`
          : `New prospect created for ${company.name} (${lead.jobTitle})`
      );

      const createdLead = await LeadService.getLeadById(prisma, lead.id);
      res.status(201).json({ 
        success: true, 
        data: createdLead,
        suppressed: !!suppressed,
        warning: suppressed ? `Recipient is on the suppression list (${suppressed.reason}). Outreach sending is blocked.` : undefined
      });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/leads/:id - Update lead details
  router.patch('/:id', async (req: Request, res: Response, next) => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);

      const updateLeadSchema = z.object({
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        jobTitle: z.string().min(1).max(100).optional(),
        department: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        researchNotes: z.record(z.any()).optional()
      });

      const body = updateLeadSchema.parse(req.body);
      const { researchNotes, ...restData } = body;
      const updatePayload: Prisma.LeadUpdateInput = { ...restData };
      if (researchNotes !== undefined) {
        updatePayload.researchNotes = researchNotes ? (researchNotes as Prisma.InputJsonValue) : Prisma.DbNull;
      }

      const lead = await prisma.lead.update({
        where: { id },
        data: updatePayload,
        include: { company: true, score: true }
      });

      // Recompute score in case jobTitle or attributes changed
      if (body.jobTitle) {
        await ScoringService.recomputeAndSaveScore(
          prisma,
          lead.id,
          'LEAD_TITLE_UPDATED',
          `Job title updated to ${body.jobTitle}`
        );
      }

      const updated = await LeadService.getLeadById(prisma, id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/leads/:id - Delete lead with cascading removal of events and scores
  router.delete('/:id', async (req: Request, res: Response, next) => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);

      await prisma.lead.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: `Lead with ID ${id} and all related scores/events were successfully deleted.`
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/leads/:id/events - Paginated discrete raw email events for a lead
  router.get('/:id/events', async (req: Request, res: Response, next) => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);

      const events = await prisma.emailEvent.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/leads/:id/history - Complete score history audit trail for a lead
  router.get('/:id/history', async (req: Request, res: Response, next) => {
    try {
      const { id } = leadIdParamSchema.parse(req.params);

      const history = await prisma.scoreHistory.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: history });
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

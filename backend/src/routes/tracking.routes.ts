import { Router, Request, Response } from 'express';
import { PrismaClient, EventType, LeadStatus, SuppressionReason } from '@prisma/client';
import { z } from 'zod';
import { ScoringService } from '../services/scoring.service.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import crypto from 'crypto';

// 1x1 Transparent GIF buffer (43 bytes standard tracking pixel)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Shared atomic transaction helper to process unsubscribe and enforce suppression
 */
async function processUnsubscribe(
  prisma: PrismaClient,
  lead: { id: string; email: string },
  sourceReason: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Record raw immutable UNSUBSCRIBED event
    await tx.emailEvent.create({
      data: {
        leadId: lead.id,
        eventType: EventType.UNSUBSCRIBED,
        payload: {
          reason: sourceReason,
          timestamp: new Date().toISOString()
        }
      }
    });

    // 2. Upsert recipient into suppression list (strictly lowercase)
    const suppression = await tx.suppression.upsert({
      where: { email: lead.email.toLowerCase() },
      create: {
        email: lead.email.toLowerCase(),
        leadId: lead.id,
        reason: SuppressionReason.UNSUBSCRIBE,
        notes: sourceReason
      },
      update: {
        suppressedAt: new Date(),
        notes: `Re-confirmed unsubscribe (${sourceReason})`
      }
    });

    // 3. Advance lead status to UNSUBSCRIBED
    await tx.lead.update({
      where: { id: lead.id },
      data: { status: LeadStatus.UNSUBSCRIBED }
    });

    // 4. Recalculate score from history (score drops to 0)
    const scoreResult = await ScoringService.recomputeAndSaveScore(
      tx,
      lead.id,
      'UNSUBSCRIBED',
      'Lead opted out via unsubscribe link; score reset to 0'
    );

    return { suppression, scoreResult };
  });
}

export function createTrackingRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/tracking/pixel/:token.png - Public Tracking Pixel
  router.get('/pixel/:token.png', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    // Immediately return the 1x1 transparent GIF with aggressive no-cache headers and cross-origin permissions
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_BUFFER.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    res.end(TRANSPARENT_GIF_BUFFER);

    // Process tracking event asynchronously
    try {
      const lead = await prisma.lead.findUnique({
        where: { trackingToken: token },
        include: { score: true }
      });

      if (!lead) {
        console.warn(`[TRACKING_PIXEL_MISS] Unknown tracking token: ${token}`);
        return;
      }

      // Extract client IP safely (first forwarded or remote socket)
      const forwarded = (req.headers['x-forwarded-for'] as string) || '';
      const clientIp = (forwarded.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').trim();
      const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 12);
      const userAgent = req.headers['user-agent'] || 'Unknown';

      await prisma.$transaction(async (tx) => {
        await tx.emailEvent.create({
          data: {
            leadId: lead.id,
            eventType: EventType.OPENED,
            messageId: `open_${Date.now()}_${token.substring(0, 8)}`,
            payload: {
              userAgent,
              ipHash,
              openedAt: new Date().toISOString()
            }
          }
        });

        // Advance status to OPENED if currently CONTACTED or DISCOVERED
        if (lead.status === LeadStatus.CONTACTED || lead.status === LeadStatus.DISCOVERED) {
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: LeadStatus.OPENED }
          });
        }

        // Recompute score from event history atomically
        await ScoringService.recomputeAndSaveScore(
          tx,
          lead.id,
          'EMAIL_OPENED',
          'Prospect opened outreach email (+15 pts)'
        );
      });

      console.log(`[TRACKING_PIXEL_HIT] Recorded OPENED event for lead ${lead.email} (${lead.firstName})`);
    } catch (err) {
      console.error('[TRACKING_PIXEL_ERROR]', err);
    }
  });

  // GET /api/tracking/unsubscribe/:token - Working Human-Facing Unsubscribe Page
  router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    const tokenParsed = z.string().uuid().safeParse(token);
    if (!tokenParsed.success) {
      res.status(400).send('<h1>Invalid unsubscribe token format.</h1>');
      return;
    }

    try {
      const lead = await prisma.lead.findUnique({
        where: { trackingToken: token }
      });

      if (!lead) {
        res.status(404).send('<h1>Invalid or expired unsubscribe link.</h1>');
        return;
      }

      await processUnsubscribe(prisma, lead, 'One-click unsubscribe link clicked by recipient (GET)');

      // Render clean confirmation page (CAN-SPAM & GDPR Compliant)
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed — StyleSense AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F9FAFB; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); max-width: 500px; width: 100%; text-align: center; border: 1px solid #E5E7EB; }
            .icon-wrapper { width: 56px; height: 56px; border-radius: 50%; background: #ECFDF5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
            .icon { color: #059669; font-size: 28px; line-height: 1; }
            h1 { color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; }
            p { color: #4B5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
            .email-badge { background: #F3F4F6; color: #1F2937; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 600; }
            .compliance-tag { border-top: 1px solid #F3F4F6; padding-top: 16px; font-size: 12px; color: #9CA3AF; line-height: 1.5; }
            .brand { font-weight: 700; color: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">
              <span class="icon">&#10003;</span>
            </div>
            <h1>Unsubscribe Confirmed</h1>
            <p>
              <span class="email-badge">${lead.email}</span> has been permanently added to our global suppression list. You will not receive any future outreach from StyleSense AI.
            </p>
            <div class="compliance-tag">
              Operated by <span class="brand">StyleSense AI, Inc.</span> &bull; 100 Fashion Ave, Suite 400, New York, NY 10018<br/>
              Honoured in strict compliance with U.S. CAN-SPAM Act & EU GDPR.
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('[UNSUBSCRIBE_ERROR]', err);
      res.status(500).send('<h1>An error occurred while processing your unsubscribe request.</h1>');
    }
  });

  // POST /api/tracking/unsubscribe/:token - RFC 8058 One-Click Unsubscribe (Automated Email Clients)
  router.post('/unsubscribe/:token', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    const tokenParsed = z.string().uuid().safeParse(token);
    if (!tokenParsed.success) {
      res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid unsubscribe token format' } });
      return;
    }

    try {
      const lead = await prisma.lead.findUnique({
        where: { trackingToken: token }
      });

      if (!lead) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead not found or expired token' } });
        return;
      }

      const result = await processUnsubscribe(prisma, lead, 'RFC 8058 One-Click Unsubscribe (POST)');

      res.status(200).json({
        success: true,
        message: 'Unsubscribe processed successfully in accordance with RFC 8058.',
        email: lead.email,
        suppressed: true,
        suppressionId: result.suppression.id,
        scoreResult: result.scoreResult
      });
    } catch (err) {
      console.error('[RFC8058_UNSUBSCRIBE_ERROR]', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process unsubscribe' } });
    }
  });

  // POST /api/tracking/simulate-open/:leadId - Helper for UI demoing
  router.post('/simulate-open/:leadId', async (req: Request, res: Response, next) => {
    try {
      const { leadId } = z.object({ leadId: z.string().uuid('leadId must be a valid UUID') }).parse(req.params);
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });

      if (!lead) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead not found' } });
        return;
      }

      let scoreResult: any;
      await prisma.$transaction(async (tx) => {
        await tx.emailEvent.create({
          data: {
            leadId: lead.id,
            eventType: EventType.OPENED,
            messageId: `open_sim_${Date.now()}`,
            payload: { userAgent: 'Simulated Client (Console Demo)', ipHash: 'demo1234' }
          }
        });

        if (lead.status === LeadStatus.CONTACTED || lead.status === LeadStatus.DISCOVERED) {
          await tx.lead.update({
            where: { id: lead.id },
            data: { status: LeadStatus.OPENED }
          });
        }

        scoreResult = await ScoringService.recomputeAndSaveScore(
          tx,
          lead.id,
          'EMAIL_OPENED',
          'Simulated email open (+15 pts)'
        );
      });

      res.json({ success: true, message: 'Simulated email open recorded', scoreResult });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tracking/simulate-unsubscribe/:leadId - Helper for console UI demo
  router.post('/simulate-unsubscribe/:leadId', async (req: Request, res: Response, next) => {
    try {
      const { leadId } = z.object({ leadId: z.string().uuid('leadId must be a valid UUID') }).parse(req.params);
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });

      if (!lead) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lead not found' } });
        return;
      }

      const result = await processUnsubscribe(prisma, lead, 'Simulated Unsubscribe Triggered from Salesperson Console');

      res.json({
        success: true,
        message: `Successfully unsubscribed ${lead.email} and recorded in suppression list.`,
        email: lead.email,
        suppressed: true,
        scoreResult: result.scoreResult
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tracking/check-suppression/:email - Quick suppression lookup
  router.get('/check-suppression/:email', async (req: Request, res: Response, next) => {
    try {
      const email = (req.params.email as string).trim().toLowerCase();
      const suppression = await prisma.suppression.findUnique({
        where: { email }
      });

      res.json({
        email,
        isSuppressed: !!suppression,
        suppression: suppression || null
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/tracking/suppression - List all suppressed recipients (Protected)
  router.get('/suppression', authenticateJWT, async (req: Request, res: Response, next) => {
    try {
      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = Math.min(100, parseInt((req.query.limit as string) || '20', 10));
      const skip = (page - 1) * limit;

      const whereClause = search
        ? { email: { contains: search.toLowerCase(), mode: 'insensitive' as const } }
        : {};

      const [total, items] = await Promise.all([
        prisma.suppression.count({ where: whereClause }),
        prisma.suppression.findMany({
          where: whereClause,
          orderBy: { suppressedAt: 'desc' },
          skip,
          take: limit,
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: { select: { name: true } }
              }
            }
          }
        })
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          page,
          limit,
          totalCount: total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/tracking/suppression - Manually add email to suppression list (Protected)
  router.post('/suppression', authenticateJWT, async (req: Request, res: Response, next) => {
    try {
      const schema = z.object({
        email: z.string().email().transform((v) => v.trim().toLowerCase()),
        reason: z.nativeEnum(SuppressionReason).default(SuppressionReason.MANUAL),
        notes: z.string().optional()
      });

      const body = schema.parse(req.body);

      const suppression = await prisma.suppression.upsert({
        where: { email: body.email },
        create: {
          email: body.email,
          reason: body.reason,
          notes: body.notes || 'Manually added via suppression API'
        },
        update: {
          reason: body.reason,
          suppressedAt: new Date(),
          notes: body.notes || 'Updated via suppression API'
        }
      });

      // If a lead with this email exists, update its status to UNSUBSCRIBED and score to 0
      const lead = await prisma.lead.findUnique({ where: { email: body.email } });
      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.UNSUBSCRIBED }
        });
        await ScoringService.recomputeAndSaveScore(
          prisma,
          lead.id,
          'MANUAL_SUPPRESSION',
          'Lead manually added to suppression list; score reset to 0'
        );
      }

      res.status(201).json({
        success: true,
        message: `${body.email} is now permanently suppressed.`,
        data: suppression
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

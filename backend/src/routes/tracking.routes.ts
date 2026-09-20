import { Router, Request, Response } from 'express';
import { PrismaClient, EventType, LeadStatus } from '@prisma/client';
import { z } from 'zod';
import { ScoringService } from '../services/scoring.service.js';
import crypto from 'crypto';

// 1x1 Transparent GIF buffer (43 bytes standard tracking pixel)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export function createTrackingRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/tracking/pixel/:token.png - Public Tracking Pixel
  router.get('/pixel/:token.png', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    // Immediately return the 1x1 transparent GIF with aggressive no-cache headers
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_BUFFER.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
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

      // Record discrete OPENED event in raw immutable event store
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 12);

      await prisma.emailEvent.create({
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
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.OPENED }
        });
      }

      // Recompute score from event history
      await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'EMAIL_OPENED',
        'Prospect opened outreach email (+15 pts)'
      );

      console.log(`[TRACKING_PIXEL_HIT] Recorded OPENED event for lead ${lead.email} (${lead.firstName})`);
    } catch (err) {
      console.error('[TRACKING_PIXEL_ERROR]', err);
    }
  });

  // GET /api/tracking/unsubscribe/:token - Working Unsubscribe Link
  router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
    const token = req.params.token as string;

    // Check valid UUID token
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

      // 1. Record UNSUBSCRIBED event in raw event store
      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.UNSUBSCRIBED,
          payload: {
            reason: 'One-click unsubscribe link clicked by recipient',
            timestamp: new Date().toISOString()
          }
        }
      });

      // 2. Add to Suppression List (strictly honored on all future sends)
      await prisma.suppression.upsert({
        where: { email: lead.email.toLowerCase() },
        create: {
          email: lead.email.toLowerCase(),
          leadId: lead.id,
          reason: 'UNSUBSCRIBE',
          notes: 'Unsubscribed via email opt-out link'
        },
        update: {
          suppressedAt: new Date(),
          notes: 'Re-confirmed unsubscribe'
        }
      });

      // 3. Mark Lead as UNSUBSCRIBED
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.UNSUBSCRIBED }
      });

      // 4. Recompute score (will be reset to 0 per scoring config)
      await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'UNSUBSCRIBED',
        'Lead opted out via unsubscribe link; score reset to 0'
      );

      // Render clean confirmation page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed — StyleSense AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F9FAFB; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 480px; text-align: center; }
            h1 { color: #111827; font-size: 24px; margin-bottom: 12px; }
            p { color: #4B5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
            .badge { display: inline-block; background: #DEF7EC; color: #03543F; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Opt-Out Confirmed</span>
            <h1>You have been unsubscribed</h1>
            <p><strong>${lead.email}</strong> has been permanently added to our suppression list. You will not receive any future outreach from StyleSense AI.</p>
            <p style="font-size: 12px; color: #9CA3AF;">In compliance with CAN-SPAM Act & GDPR requirements.</p>
          </div>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('[UNSUBSCRIBE_ERROR]', err);
      res.status(500).send('<h1>An error occurred while processing your unsubscribe request.</h1>');
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

      await prisma.emailEvent.create({
        data: {
          leadId: lead.id,
          eventType: EventType.OPENED,
          messageId: `open_sim_${Date.now()}`,
          payload: { userAgent: 'Simulated Client (Console)', ipHash: 'demo1234' }
        }
      });

      if (lead.status === LeadStatus.CONTACTED || lead.status === LeadStatus.DISCOVERED) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.OPENED }
        });
      }

      const scoreResult = await ScoringService.recomputeAndSaveScore(
        prisma,
        lead.id,
        'EMAIL_OPENED',
        'Simulated email open (+15 pts)'
      );

      res.json({ success: true, message: 'Simulated email open recorded', scoreResult });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

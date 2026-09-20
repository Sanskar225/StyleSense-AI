import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { AgentService } from '../services/agent.service.js';

export function createAgentRouter(prisma: PrismaClient): Router {
  const router = Router();
  router.use(authenticateJWT);

  const discoverSchema = z.object({
    industry: z.string().default('Apparel & Fashion'),
    region: z.string().default('North America'),
    companySize: z.string().default('201-1000'),
    targetTitles: z.array(z.string()).default([
      'Head of Merchandising',
      'VP Supply Chain',
      'Director of Demand Planning',
      'Head of Inventory Allocation'
    ])
  });

  const simulateReplySchema = z.object({
    leadId: z.string().uuid('Valid lead ID is required'),
    replyText: z.string().min(3, 'Reply text must contain at least 3 characters'),
    campaignId: z.string().optional()
  });

  // POST /api/agent/discover - Trigger 2-step ICP lead discovery
  router.post('/discover', async (req: Request, res: Response, next) => {
    try {
      const icp = discoverSchema.parse(req.body);
      const result = await AgentService.discoverLeads(prisma, icp);
      res.status(201).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/agent/simulate-reply - Simulate inbound prospect reply
  router.post('/simulate-reply', async (req: Request, res: Response, next) => {
    try {
      const { leadId, replyText, campaignId } = simulateReplySchema.parse(req.body);
      const result = await AgentService.processSimulatedReply(prisma, leadId, replyText, campaignId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

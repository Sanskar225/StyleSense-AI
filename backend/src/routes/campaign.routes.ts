import { Router, Request, Response } from 'express';
import { PrismaClient, CampaignStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth.middleware.js';

export function createCampaignRouter(prisma: PrismaClient): Router {
  const router = Router();
  router.use(authenticateJWT);

  const createCampaignSchema = z.object({
    name: z.string().min(2, 'Campaign name must be at least 2 characters'),
    description: z.string().optional(),
    icpCriteria: z.object({
      industry: z.string().default('Apparel & Fashion'),
      region: z.string().default('North America'),
      companySize: z.string().default('50-1000'),
      targetTitles: z.array(z.string()).default(['Head of Merchandising', 'VP Supply Chain', 'Director of Demand Planning'])
    }),
    status: z.nativeEnum(CampaignStatus).optional().default(CampaignStatus.ACTIVE)
  });

  // GET /api/campaigns
  router.get('/', async (req: Request, res: Response, next) => {
    try {
      const campaigns = await prisma.campaign.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { events: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: campaigns });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/campaigns
  router.post('/', async (req: Request, res: Response, next) => {
    try {
      const data = createCampaignSchema.parse(req.body);
      const campaign = await prisma.campaign.create({
        data: {
          name: data.name,
          description: data.description,
          icpCriteria: data.icpCriteria,
          status: data.status,
          createdById: req.user?.id
        }
      });

      res.status(201).json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

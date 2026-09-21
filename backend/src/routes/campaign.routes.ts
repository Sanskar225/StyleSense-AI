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

  const campaignIdParamSchema = z.object({
    id: z.string().uuid('Campaign ID must be a valid UUID format')
  });

  const updateCampaignSchema = createCampaignSchema.partial();

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

  // GET /api/campaigns/:id
  router.get('/:id', async (req: Request, res: Response, next) => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { events: true } }
        }
      });

      if (!campaign) {
        res.status(404).json({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      res.json({ success: true, data: campaign });
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

  // PATCH /api/campaigns/:id
  router.patch('/:id', async (req: Request, res: Response, next) => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      const data = updateCampaignSchema.parse(req.body);

      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      const updated = await prisma.campaign.update({
        where: { id },
        data
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/campaigns/:id
  router.delete('/:id', async (req: Request, res: Response, next) => {
    try {
      const { id } = campaignIdParamSchema.parse(req.params);
      const existing = await prisma.campaign.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({
          error: {
            code: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign with ID ${id} was not found.`,
            statusCode: 404
          }
        });
        return;
      }

      await prisma.campaign.delete({ where: { id } });
      res.json({ success: true, message: `Campaign ${id} successfully deleted.` });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

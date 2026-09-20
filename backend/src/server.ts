import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error.middleware.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createLeadRouter } from './routes/lead.routes.js';
import { createCampaignRouter } from './routes/campaign.routes.js';
import { createTrackingRouter } from './routes/tracking.routes.js';
import { createAgentRouter } from './routes/agent.routes.js';

export function createServer(prisma: PrismaClient) {
  const app = express();

  // Middleware
  app.use(cors({
    origin: true, // Allow any local development origin
    credentials: true
  }));
  app.use(express.json());

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'StyleSense AI Engine',
      timestamp: new Date().toISOString()
    });
  });

  // Public Tracking Routes (Tracking Pixel & Unsubscribe Links)
  app.use('/api/tracking', createTrackingRouter(prisma));

  // Authentication Routes
  app.use('/api/auth', createAuthRouter(prisma));

  // Protected Resource Routes
  app.use('/api/leads', createLeadRouter(prisma));
  app.use('/api/campaigns', createCampaignRouter(prisma));
  app.use('/api/agent', createAgentRouter(prisma));

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found.`,
        statusCode: 404
      }
    });
  });

  // Standardized Error Handler
  app.use(errorHandler);

  return app;
}

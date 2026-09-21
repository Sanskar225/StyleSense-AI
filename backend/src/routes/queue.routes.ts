import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { globalJobQueue, JobType, JobStatus } from '../services/queue.service.js';

export function createQueueRouter(): Router {
  const router = Router();
  router.use(authenticateJWT);

  const enqueueSchema = z.object({
    type: z.enum(['LEAD_DISCOVERY', 'BATCH_OUTREACH', 'FOLLOWUP_EVALUATION', 'INBOUND_WEBHOOK_PROCESSING']),
    payload: z.record(z.any()),
    maxRetries: z.number().int().min(0).max(5).optional()
  });

  // GET /api/queue/metrics - Real-time queue metrics and worker load
  router.get('/metrics', (req: Request, res: Response) => {
    const metrics = globalJobQueue.getMetrics();
    res.json({ success: true, data: metrics });
  });

  // GET /api/queue/jobs - List background jobs with status filter
  router.get('/jobs', (req: Request, res: Response) => {
    const status = req.query.status as JobStatus | undefined;
    const type = req.query.type as JobType | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const jobs = globalJobQueue.listJobs({ status, type, limit });
    res.json({ success: true, count: jobs.length, data: jobs });
  });

  // GET /api/queue/jobs/:id - Check status and progress of a background job
  router.get('/jobs/:id', (req: Request, res: Response) => {
    const job = globalJobQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Job ${req.params.id} not found` } });
      return;
    }
    res.json({ success: true, data: job });
  });

  // POST /api/queue/jobs - Enqueue a new background job
  router.post('/jobs', async (req: Request, res: Response, next) => {
    try {
      const { type, payload, maxRetries } = enqueueSchema.parse(req.body);
      const job = await globalJobQueue.enqueue(type as JobType, payload, { maxRetries });
      res.status(202).json({
        success: true,
        message: `Job ${job.id} enqueued successfully for asynchronous background processing`,
        data: job
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken, authenticateJWT } from '../middleware/auth.middleware.js';

export function createAuthRouter(prisma: PrismaClient): Router {
  const router = Router();

  const loginSchema = z.object({
    email: z.string().email('Valid email address is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response, next) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            statusCode: 401
          }
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            statusCode: 401
          }
        });
        return;
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/demo-login
  // Frictionless single-click login for evaluation
  router.post('/demo-login', async (req: Request, res: Response, next) => {
    try {
      let user = await prisma.user.findUnique({
        where: { email: 'sales@stylesense.ai' }
      });

      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        user = await prisma.user.create({
          data: {
            email: 'sales@stylesense.ai',
            name: 'Sanskar Sinha',
            passwordHash,
            role: 'account_executive'
          }
        });
      }

      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/me
  router.get('/me', authenticateJWT, async (req: Request, res: Response, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true }
      });

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User session not found.',
            statusCode: 404
          }
        });
        return;
      }

      res.json({ success: true, user });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

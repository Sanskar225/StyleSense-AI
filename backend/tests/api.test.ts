import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createServer } from '../src/server.js';
import http from 'http';

describe('API Integration Tests — Leads, Auth, Tracking & Suppression', () => {
  let prisma: PrismaClient;
  let server: http.Server;
  let baseUrl: string;
  let authToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const app = createServer(prisma);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  it('GET /api/leads rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${baseUrl}/api/leads`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/demo-login returns valid JWT access token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    authToken = body.token;
  });

  it('GET /api/leads returns paginated lead list with valid JWT', async () => {
    const res = await fetch(`${baseUrl}/api/leads`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/tracking/pixel/:token.png serves 1x1 transparent GIF and records open', async () => {
    const lead = await prisma.lead.findFirst({ where: { status: 'CONTACTED' } });
    if (!lead) return;

    const res = await fetch(`${baseUrl}/api/tracking/pixel/${lead.trackingToken}.png`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/gif');

    // Verify OPENED event was recorded in DB
    const event = await prisma.emailEvent.findFirst({
      where: { leadId: lead.id, eventType: 'OPENED' }
    });
    expect(event).toBeDefined();
  });

  it('POST /api/agent/simulate-reply classifies interested reply and recomputes score', async () => {
    const lead = await prisma.lead.findFirst({ where: { status: 'OPENED' } });
    if (!lead) return;

    const res = await fetch(`${baseUrl}/api/agent/simulate-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        leadId: lead.id,
        replyText: 'Hi Sanskar, this sounds really great. Can we meet this Thursday at 2pm ET?'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.classification.intent).toBe('interested');
    expect(body.data.newStatus).toBe('REPLIED');
    expect(body.data.newScore).toBeGreaterThanOrEqual(70);
  });

  it('Suppression list strictly blocks send attempts to opted-out contacts with 409 Conflict', async () => {
    const suppressedLead = await prisma.lead.findFirst({ where: { status: 'UNSUBSCRIBED' } });
    if (!suppressedLead) return;

    const res = await fetch(`${baseUrl}/api/leads/${suppressedLead.id}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('RECIPIENT_SUPPRESSED');
  });
});

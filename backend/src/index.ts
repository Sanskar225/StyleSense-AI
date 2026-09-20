import { PrismaClient } from '@prisma/client';
import { createServer } from './server.js';
import { ENV } from './config/env.js';

const prisma = new PrismaClient();
const app = createServer(prisma);

const server = app.listen(ENV.PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 StyleSense AI Backend running on http://localhost:${ENV.PORT}`);
  console.log(`📊 Mode: ${ENV.NODE_ENV} | Email Provider: ${ENV.EMAIL_PROVIDER}`);
  console.log(`🔗 Database: PostgreSQL (stylesense_dev)`);
  console.log(`================================================================`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

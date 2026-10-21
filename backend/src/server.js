import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';
import { schedulerService } from './services/schedulerService.js';
import { platformRateService } from './services/platformRateService.js';
import { seedPlansIfEmpty } from './services/planService.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');

    // Seed default package plans and platform credit rates if missing
    await seedPlansIfEmpty();
    await platformRateService.seedPlatformRatesIfEmpty();

    // Start background scheduled posts processor
    schedulerService.start();

    const server = app.listen(config.port, () => {
      console.log(`🚀 SocialFlow AI Backend running on port ${config.port}`);
      console.log(`📍 Health Check: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async () => {
      console.log('\nGracefully shutting down SocialFlow AI Backend...');
      schedulerService.stop();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connection closed. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

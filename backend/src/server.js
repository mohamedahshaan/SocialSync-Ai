import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');

    const server = app.listen(config.port, () => {
      console.log(`🚀 SocialFlow AI Backend running on port ${config.port}`);
      console.log(`📍 Health Check: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async () => {
      console.log('\nGracefully shutting down SocialFlow AI Backend...');
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

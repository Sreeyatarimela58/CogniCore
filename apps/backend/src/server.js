import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import prisma from './prisma.js';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Connected to the application database');
    
    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();


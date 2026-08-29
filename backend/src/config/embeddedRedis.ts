import net from 'net';
import { logger } from '../utils/logger';
import { env } from './env';

let memoryServerInstance: any = null;

export const isPortListening = (port: number, host: string = '127.0.0.1'): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
};

export const startEmbeddedRedisIfRequired = async (): Promise<void> => {
  if (env.REDIS_HOST !== 'localhost' && env.REDIS_HOST !== '127.0.0.1') {
    return;
  }

  const isRunning = await isPortListening(env.REDIS_PORT, env.REDIS_HOST);
  if (isRunning) {
    logger.info(`⚡ Redis instance detected on ${env.REDIS_HOST}:${env.REDIS_PORT}`);
    return;
  }

  try {
    logger.info(`🔄 No Redis server found on ${env.REDIS_HOST}:${env.REDIS_PORT}. Initializing embedded Redis server...`);
    const { RedisMemoryServer } = await import('redis-memory-server');
    memoryServerInstance = new RedisMemoryServer({
      instance: {
        port: env.REDIS_PORT,
      },
    });
    await memoryServerInstance.start();
    logger.info(`✅ Embedded Redis server successfully started on port ${env.REDIS_PORT}`);
  } catch (err: any) {
    logger.warn(`Could not start embedded Redis server: ${err.message}`);
  }
};

export const stopEmbeddedRedis = async (): Promise<void> => {
  if (memoryServerInstance) {
    try {
      await memoryServerInstance.stop();
      logger.info('Embedded Redis server stopped.');
    } catch (err: any) {
      logger.error('Error stopping embedded Redis:', err);
    }
  }
};

import { app } from './app';
import { connectDb, disconnectDb } from './src/config/db';
import { getEnv } from './src/config/env';

const env = getEnv();

async function start(): Promise<void> {
  await connectDb();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${env.port}`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      try {
        await disconnectDb();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
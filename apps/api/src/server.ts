import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { runAutoCollection } from './modules/collection/collection.engine.js';

const COLLECTION_INTERVAL_MS = 60 * 60 * 1000; // de hora em hora

async function main() {
  const app = await buildApp();

  // motor de cobrança automática (respeita a janela de horário das regras)
  const tick = () =>
    runAutoCollection()
      .then((r) => r.sent > 0 && app.log.info(`[cobranca-auto] ${r.sent} cobrança(s) enviada(s)`))
      .catch((err) => app.log.error({ err }, '[cobranca-auto] falhou'));
  const collectionTimer = setInterval(tick, COLLECTION_INTERVAL_MS);
  setTimeout(tick, 10_000); // primeira passada 10s após subir

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down...`);
    clearInterval(collectionTimer);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();

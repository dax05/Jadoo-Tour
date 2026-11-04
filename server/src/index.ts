import app from './app';
import { ENV } from './config/env';
import { checkDatabaseConnection, pool } from './config/db';

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('       ✈️ JADOO TRAVEL — EXPRESS REST API          ');
  console.log('----------------------------------------------------');

  // Verify PostgreSQL connectivity
  await checkDatabaseConnection();

  const server = app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[Express] Server running on: http://localhost:${ENV.PORT}`);
    console.log(`[Express] Health Check URL : http://localhost:${ENV.PORT}/api/health`);
    console.log(`[Express] API Documentation:`);
    console.log(`  • Auth        : POST /api/auth/register, POST /api/auth/login, GET /api/auth/profile`);
    console.log(`  • Destinations: GET  /api/destinations, GET /api/destinations/:id`);
    console.log(`  • Bookings    : POST /api/bookings, GET /api/bookings, PATCH /api/bookings/:id/cancel`);
    console.log(`  • Wishlists   : GET  /api/wishlist, POST /api/wishlist/toggle, DELETE /api/wishlist`);
    console.log(`  • Reviews     : GET  /api/testimonials, POST /api/testimonials`);
    console.log(`  • Newsletter  : POST /api/newsletter/subscribe`);
    console.log('----------------------------------------------------');
  });

  // Graceful shutdown handlers
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP listener closed. Draining database connection pool...');
      try {
        await pool.end();
        console.log('[PostgreSQL] Connection pool cleanly closed.');
        process.exit(0);
      } catch (err) {
        console.error('[PostgreSQL] Error closing pool:', err);
        process.exit(1);
      }
    });

    // Force exit after 10 seconds if hanging
    setTimeout(() => {
      console.error('[Server] Forced shutdown timeout exceeded. Exiting.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();

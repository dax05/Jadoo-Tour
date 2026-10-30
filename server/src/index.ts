import app from './app';
import { ENV } from './config/env';
import { checkDatabaseConnection } from './config/db';

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('       ✈️ JADOO TRAVEL — EXPRESS REST API          ');
  console.log('----------------------------------------------------');

  // Verify PostgreSQL connectivity
  await checkDatabaseConnection();

  app.listen(ENV.PORT, () => {
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
}

startServer();

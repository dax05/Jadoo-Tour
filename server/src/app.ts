import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import { checkDatabaseConnection, getLastDbError } from './config/db';
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import destinationRoutes from './routes/destination.routes';
import bookingRoutes from './routes/booking.routes';
import wishlistRoutes from './routes/wishlist.routes';
import testimonialRoutes from './routes/testimonial.routes';
import newsletterRoutes from './routes/newsletter.routes';

const app: Application = express();

// Cross-Origin Resource Sharing with safe origins
const allowedOrigins = [
  ENV.CLIENT_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server) or matched origins
      if (!origin || allowedOrigins.includes(origin) || ENV.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked: Origin not allowed.'));
      }
    },
    credentials: true,
  })
);

// Body Parsers with explicit size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const isConnected = await checkDatabaseConnection();
  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'online' : 'database_disconnected',
    service: 'Jadoo Travel API',
    databaseConnected: isConnected,
    databaseError: isConnected ? null : getLastDbError(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Explicit 404 handler for unmatched /api/* routes
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Optional: Serve frontend static assets from root if desired
const rootDir = path.resolve(__dirname, '../../');
app.use(express.static(rootDir));

// Global Error Handler
app.use(errorHandler);

export default app;

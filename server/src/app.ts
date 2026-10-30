import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { getDbConnectionStatus } from './config/db';
import { errorHandler } from './middleware/error.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import destinationRoutes from './routes/destination.routes';
import bookingRoutes from './routes/booking.routes';
import wishlistRoutes from './routes/wishlist.routes';
import testimonialRoutes from './routes/testimonial.routes';
import newsletterRoutes from './routes/newsletter.routes';

const app: Application = express();

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: true, // Allow frontend on any port/origin
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'Jadoo Travel API',
    databaseConnected: getDbConnectionStatus(),
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

// Optional: Serve frontend static assets from root if desired
const rootDir = path.resolve(__dirname, '../../');
app.use(express.static(rootDir));

// Global Error Handler
app.use(errorHandler);

export default app;

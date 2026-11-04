import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Express middleware to verify JWT in Authorization header with algorithm restriction and payload validation
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing or invalid.',
    });
    return;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Malformed authorization header.',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET, { algorithms: ['HS256'] }) as any;
    if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.email) {
      throw new Error('Invalid token payload');
    }
    req.user = {
      id: Number(decoded.id),
      email: String(decoded.email),
      name: String(decoded.name || 'Traveler'),
      role: String(decoded.role || 'traveler'),
    };
    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
}

/**
 * Optional Auth middleware (populates req.user if token is present, but allows guest access)
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
      try {
        const decoded = jwt.verify(parts[1], ENV.JWT_SECRET, { algorithms: ['HS256'] }) as any;
        if (decoded && typeof decoded === 'object' && decoded.id && decoded.email) {
          req.user = {
            id: Number(decoded.id),
            email: String(decoded.email),
            name: String(decoded.name || 'Traveler'),
            role: String(decoded.role || 'traveler'),
          };
        }
      } catch {
        // Ignore invalid token for optional auth
      }
    }
  }
  next();
}

/**
 * RBAC authorization middleware: requires authenticated administrator
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access forbidden. Administrator privileges required.',
    });
    return;
  }
  next();
}

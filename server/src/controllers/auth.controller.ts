import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

function generateToken(user: { id: number; email: string; name: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export const AuthController = {
  /**
   * Register a new traveler account
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
      if (existing.rows.length > 0) {
        res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert new user
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, points)
         VALUES ($1, $2, $3, 1250)
         RETURNING id, name, email, role, avatar_url, bio, phone, home_city, points, created_at`,
        [name.trim(), cleanEmail, passwordHash]
      );

      const user = result.rows[0];
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully! Welcome to Jadoo.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          points: user.points,
        },
      });
    } catch (err: unknown) {
      console.error('[AuthController.register] Error:', err);
      res.status(500).json({ success: false, message: 'Registration failed due to a server error.' });
    }
  },

  /**
   * Login user with email & password
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Fetch user by email
      const result = await pool.query(
        `SELECT id, name, email, password_hash, role, avatar_url, bio, phone, home_city, passport_number, travel_style, seat_preference, dietary_requirements, points
         FROM users WHERE email = $1`,
        [cleanEmail]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const user = result.rows[0];

      // Verify bcrypt password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      const token = generateToken(user);

      res.status(200).json({
        success: true,
        message: 'Signed in successfully!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          phone: user.phone,
          homeCity: user.home_city,
          passportNumber: user.passport_number,
          travelStyle: user.travel_style,
          seatPreference: user.seat_preference,
          dietaryRequirements: user.dietary_requirements,
          points: user.points,
        },
      });
    } catch (err: unknown) {
      console.error('[AuthController.login] Error:', err);
      res.status(500).json({ success: false, message: 'Login failed due to a server error.' });
    }
  },

  /**
   * Get current authenticated user session & calculated profile stats
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const userResult = await pool.query(
        `SELECT id, name, email, role, avatar_url, bio, phone, home_city, passport_number, travel_style, seat_preference, dietary_requirements, points, created_at
         FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const user = userResult.rows[0];

      // Compute dynamic stats from PostgreSQL
      const bookingsCountResult = await pool.query(
        `SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status != 'cancelled'`,
        [req.user.id]
      );
      const wishlistCountResult = await pool.query(
        `SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1`,
        [req.user.id]
      );
      const countriesResult = await pool.query(
        `SELECT COUNT(DISTINCT d.country) as count 
         FROM bookings b
         JOIN destinations d ON b.destination_id = d.id
         WHERE b.user_id = $1 AND b.status != 'cancelled'`,
        [req.user.id]
      );

      const tripsBooked = parseInt(bookingsCountResult.rows[0]?.count || '0', 10);
      const wishlistCount = parseInt(wishlistCountResult.rows[0]?.count || '0', 10);
      const countriesVisited = parseInt(countriesResult.rows[0]?.count || '0', 10);

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          phone: user.phone,
          homeCity: user.home_city,
          passportNumber: user.passport_number,
          travelStyle: user.travel_style,
          seatPreference: user.seat_preference,
          dietaryRequirements: user.dietary_requirements,
          points: user.points,
          createdAt: user.created_at,
          stats: {
            tripsBooked,
            countriesVisited,
            wishlistCount,
            points: user.points,
          },
        },
      });
    } catch (err: unknown) {
      console.error('[AuthController.getProfile] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to retrieve user profile.' });
    }
  },

  /**
   * Update personal details & preferences
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        name,
        phone,
        bio,
        homeCity,
        passportNumber,
        travelStyle,
        seatPreference,
        dietaryRequirements,
      } = req.body;

      if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
        const phoneDigits = String(phone).replace(/\D/g, '');
        const phoneRegex = /^(\+)?[\d\s\-().]{7,25}$/;
        if (!phoneRegex.test(String(phone).trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) {
          res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Must contain between 7 and 15 digits.',
          });
          return;
        }
        if (/^(\d)\1+$/.test(phoneDigits)) {
          res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Cannot consist of repeated identical digits.',
          });
          return;
        }
      }

      const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             bio = COALESCE($3, bio),
             home_city = COALESCE($4, home_city),
             passport_number = COALESCE($5, passport_number),
             travel_style = COALESCE($6, travel_style),
             seat_preference = COALESCE($7, seat_preference),
             dietary_requirements = COALESCE($8, dietary_requirements),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING id, name, email, phone, bio, home_city, passport_number, travel_style, seat_preference, dietary_requirements, points`,
        [name, phone, bio, homeCity, passportNumber, travelStyle, seatPreference, dietaryRequirements, req.user.id]
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        user: result.rows[0],
      });
    } catch (err: unknown) {
      console.error('[AuthController.updateProfile] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  },

  /**
   * Change user password
   */
  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current and new password are required.' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
        return;
      }

      const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (userRes.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'The current password you entered is incorrect.' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        newHash,
        req.user.id,
      ]);

      res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (err: unknown) {
      console.error('[AuthController.changePassword] Error:', err);
      res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  },
};

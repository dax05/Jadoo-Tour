import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. First attempt to load from server/.env if present
const serverEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

// 2. Also parse REQUIRED_INPUTS.txt from root if it exists, to allow user to configure there
const requiredInputsPath = path.resolve(__dirname, '../../../REQUIRED_INPUTS.txt');
if (fs.existsSync(requiredInputsPath)) {
  try {
    const content = fs.readFileSync(requiredInputsPath, 'utf-8');
    const lines = content.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('=')) continue;
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        // Only set if not already overridden by process.env
        if (!process.env[key] && value && !value.includes('your_postgres_password_here')) {
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn('[Env] Notice: Could not read REQUIRED_INPUTS.txt:', err);
  }
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:8080',
  JWT_SECRET: process.env.JWT_SECRET || 'jadoo_super_secret_jwt_key_2026_curated_escapes',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'jadoo_travel_db',
  DB_SSL: process.env.DB_SSL === 'true',
};

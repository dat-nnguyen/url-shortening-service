import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

const { PrismaClient } = pkg;
const { Pool } = pg;

// Cloud DB SSL Compatibility (Render, Neon, Supabase, AWS RDS)
const isLocalDb = env.DATABASE_URL.includes('sslmode=disable') || env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('postgres:5432');
const poolConfig = {
    connectionString: env.DATABASE_URL,
    ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }),
};

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export default prisma;

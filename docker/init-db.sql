-- Campaign Optimization System - Database Initialization Script
-- This script runs automatically when PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges (user is already created by POSTGRES_USER env var)
-- This is just for documentation purposes
-- GRANT ALL PRIVILEGES ON DATABASE campaign_optimization TO campaign_user;

-- Note: Tables are created by Prisma migrations, not this script
-- This script is for initial database setup only

-- Create schemas if needed
-- CREATE SCHEMA IF NOT EXISTS public;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Run Prisma migrations to create tables: npx prisma migrate deploy';
END $$;

-- Add type column to steps table
ALTER TABLE steps ADD COLUMN type TEXT NOT NULL DEFAULT 'normal:general';

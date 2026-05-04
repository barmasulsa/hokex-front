-- Make poster_url nullable to allow events without posters
-- Run this in Supabase SQL Editor

ALTER TABLE events 
ALTER COLUMN poster_url DROP NOT NULL;

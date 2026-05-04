-- Fix RLS policy to allow crawler to insert events
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON events;

-- Create new policies that allow anon key to insert
CREATE POLICY "Allow public read access"
ON events FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow anon insert for crawler"
ON events FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon update for crawler"
ON events FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated insert"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update"
ON events FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

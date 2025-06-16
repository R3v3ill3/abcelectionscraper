/*
  # Create RLS Policies for Data Operations

  1. Security Policies
    - Allow public SELECT access to all tables (for reading existing data)
    - Allow authenticated INSERT/UPDATE operations for data management
    - Maintain data integrity while allowing necessary operations

  2. Tables Covered
    - states (already has public read policy)
    - parties (needs public read policy)
    - electorates (needs public read policy)
    - mps (needs public read policy)
*/

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE electorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mps ENABLE ROW LEVEL SECURITY;

-- Create public read policies for parties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parties' AND policyname = 'Allow public read access to parties'
  ) THEN
    CREATE POLICY "Allow public read access to parties"
      ON parties
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create public read policies for electorates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'electorates' AND policyname = 'Allow public read access to electorates'
  ) THEN
    CREATE POLICY "Allow public read access to electorates"
      ON electorates
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create public read policies for mps table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mps' AND policyname = 'Allow public read access to mps'
  ) THEN
    CREATE POLICY "Allow public read access to mps"
      ON mps
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create authenticated insert/update policies for parties
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parties' AND policyname = 'Allow authenticated insert to parties'
  ) THEN
    CREATE POLICY "Allow authenticated insert to parties"
      ON parties
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parties' AND policyname = 'Allow authenticated update to parties'
  ) THEN
    CREATE POLICY "Allow authenticated update to parties"
      ON parties
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create authenticated insert/update policies for electorates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'electorates' AND policyname = 'Allow authenticated insert to electorates'
  ) THEN
    CREATE POLICY "Allow authenticated insert to electorates"
      ON electorates
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'electorates' AND policyname = 'Allow authenticated update to electorates'
  ) THEN
    CREATE POLICY "Allow authenticated update to electorates"
      ON electorates
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create authenticated insert/update policies for mps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mps' AND policyname = 'Allow authenticated insert to mps'
  ) THEN
    CREATE POLICY "Allow authenticated insert to mps"
      ON mps
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mps' AND policyname = 'Allow authenticated update to mps'
  ) THEN
    CREATE POLICY "Allow authenticated update to mps"
      ON mps
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create authenticated delete policies for data management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mps' AND policyname = 'Allow authenticated delete from mps'
  ) THEN
    CREATE POLICY "Allow authenticated delete from mps"
      ON mps
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
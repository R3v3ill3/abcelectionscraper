/*
  # Update Electorates Schema for Enhanced Election Data

  1. Schema Changes
    - Rename `two_party_preferred_margin` to `total_votes_cast` (stores total votes cast in electorate)
    - Rename `two_party_preferred_percent` to `previous_margin_percentage` (stores previous election margin %)
    - Add `current_margin_votes` (current election margin in votes)
    - Add `current_margin_percentage` (current election margin as percentage)
    - Add `winner_two_party_preferred_percent` (winning candidate's TPP percentage)
    - Add `loser_two_party_preferred_percent` (losing candidate's TPP percentage)

  2. Data Migration
    - Preserve existing data during column renames
    - Set appropriate defaults for new columns

  3. Security
    - Maintain existing RLS policies
*/

-- Rename existing columns to reflect their actual meaning
DO $$
BEGIN
  -- Rename two_party_preferred_margin to total_votes_cast
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'two_party_preferred_margin'
  ) THEN
    ALTER TABLE electorates RENAME COLUMN two_party_preferred_margin TO total_votes_cast;
  END IF;

  -- Rename two_party_preferred_percent to previous_margin_percentage
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'two_party_preferred_percent'
  ) THEN
    ALTER TABLE electorates RENAME COLUMN two_party_preferred_percent TO previous_margin_percentage;
  END IF;
END $$;

-- Add new columns for enhanced election data
DO $$
BEGIN
  -- Add current_margin_votes column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'current_margin_votes'
  ) THEN
    ALTER TABLE electorates ADD COLUMN current_margin_votes numeric DEFAULT 0;
  END IF;

  -- Add current_margin_percentage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'current_margin_percentage'
  ) THEN
    ALTER TABLE electorates ADD COLUMN current_margin_percentage numeric DEFAULT 0;
  END IF;

  -- Add winner_two_party_preferred_percent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'winner_two_party_preferred_percent'
  ) THEN
    ALTER TABLE electorates ADD COLUMN winner_two_party_preferred_percent numeric DEFAULT 0;
  END IF;

  -- Add loser_two_party_preferred_percent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'loser_two_party_preferred_percent'
  ) THEN
    ALTER TABLE electorates ADD COLUMN loser_two_party_preferred_percent numeric DEFAULT 0;
  END IF;
END $$;

-- Add comments to clarify column purposes
COMMENT ON COLUMN electorates.total_votes_cast IS 'Total number of formal votes cast in the electorate';
COMMENT ON COLUMN electorates.previous_margin_percentage IS 'Margin percentage from the previous election';
COMMENT ON COLUMN electorates.current_margin_votes IS 'Current election margin in raw vote count';
COMMENT ON COLUMN electorates.current_margin_percentage IS 'Current election margin as percentage';
COMMENT ON COLUMN electorates.winner_two_party_preferred_percent IS 'Winning candidate two-party preferred percentage';
COMMENT ON COLUMN electorates.loser_two_party_preferred_percent IS 'Losing candidate two-party preferred percentage';
COMMENT ON COLUMN electorates.swing_at_last_election IS 'Swing percentage compared to previous election';
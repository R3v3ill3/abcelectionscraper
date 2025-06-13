/*
  # Add Two-Party Preferred Vote Counts to Electorates

  1. New Columns
    - `winner_two_party_preferred_votes` (numeric) - Raw vote count for winning TPP candidate
    - `loser_two_party_preferred_votes` (numeric) - Raw vote count for losing TPP candidate

  2. Security
    - Maintain existing RLS policies
    - Add appropriate defaults and comments
*/

-- Add winner_two_party_preferred_votes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'winner_two_party_preferred_votes'
  ) THEN
    ALTER TABLE electorates ADD COLUMN winner_two_party_preferred_votes numeric DEFAULT 0;
  END IF;
END $$;

-- Add loser_two_party_preferred_votes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'electorates' AND column_name = 'loser_two_party_preferred_votes'
  ) THEN
    ALTER TABLE electorates ADD COLUMN loser_two_party_preferred_votes numeric DEFAULT 0;
  END IF;
END $$;

-- Add comments to clarify column purposes
COMMENT ON COLUMN electorates.winner_two_party_preferred_votes IS 'Raw vote count for winning two-party preferred candidate';
COMMENT ON COLUMN electorates.loser_two_party_preferred_votes IS 'Raw vote count for losing two-party preferred candidate';
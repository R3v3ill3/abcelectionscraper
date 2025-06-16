/*
  # Add New South Wales to States Table

  1. New State
    - Add NSW state record with proper UUID and details

  2. Security
    - Maintain existing RLS policies
*/

-- Insert NSW state if it doesn't exist
INSERT INTO states (id, name, code, created_at)
VALUES (
  'f7d3c4e8-9b2a-4f6d-8e1c-3a5b7c9d0e2f',
  'New South Wales',
  'NSW',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Also ensure we have the other states if they don't exist
INSERT INTO states (id, name, code, created_at)
VALUES 
  (
    '34e083cf-a179-4536-a934-86692f14609d',
    'Queensland',
    'QLD',
    now()
  ),
  (
    '5c397f74-047c-4548-a97e-757b168715ab',
    'Western Australia',
    'WA',
    now()
  )
ON CONFLICT (id) DO NOTHING;
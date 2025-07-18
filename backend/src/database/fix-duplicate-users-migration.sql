-- Migration to fix duplicate users and add unique constraint
-- Step 1: Identify and handle duplicate users

-- First, let's see the current duplicate users
SELECT couple_id, role, COUNT(*) as count, 
       array_agg(id ORDER BY created_at ASC) as user_ids,
       array_agg(name ORDER BY created_at ASC) as names
FROM users 
GROUP BY couple_id, role 
HAVING COUNT(*) > 1;

-- Step 2: Remove duplicate users (keep the first created one)
-- This will delete newer duplicate users, keeping the oldest one for each (couple_id, role) combination
WITH ranked_users AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY couple_id, role ORDER BY created_at ASC) as rn
    FROM users
)
DELETE FROM users 
WHERE id IN (
    SELECT id 
    FROM ranked_users 
    WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE users 
ADD CONSTRAINT unique_couple_role 
UNIQUE (couple_id, role);

-- Step 4: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_users_couple_role ON users (couple_id, role); 

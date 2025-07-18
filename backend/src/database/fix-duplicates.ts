import { pool } from './connection-postgres';

interface DuplicateUser {
  couple_id: string;
  role: string;
  count: number;
  user_ids: string[];
  names: string[];
}

async function fixDuplicateUsers() {
  console.log('🔍 Checking for duplicate users...');
  
  try {
    // Step 1: Find duplicate users
    const duplicateQuery = `
      SELECT couple_id, role, COUNT(*) as count, 
             array_agg(id ORDER BY created_at ASC) as user_ids,
             array_agg(name ORDER BY created_at ASC) as names
      FROM users 
      GROUP BY couple_id, role 
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    const duplicates: DuplicateUser[] = duplicateResult.rows;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate users found.');
      return;
    }
    
    console.log(`⚠️  Found ${duplicates.length} sets of duplicate users:`);
    duplicates.forEach((dup, index) => {
      console.log(`  ${index + 1}. Couple: ${dup.couple_id}, Role: ${dup.role === 'husband' ? '夫' : '妻'}, Count: ${dup.count}`);
      console.log(`     Users: ${dup.names.join(', ')}`);
      console.log(`     IDs: ${dup.user_ids.join(', ')}`);
    });
    
    // Step 2: Remove duplicates (keep the first created one)
    console.log('\n🔧 Removing duplicate users (keeping the oldest one for each couple/role)...');
    
    const deleteQuery = `
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
      )
      RETURNING id, name, role
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    const deletedUsers = deleteResult.rows;
    
    console.log(`✅ Deleted ${deletedUsers.length} duplicate users:`);
    deletedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.role === 'husband' ? '夫' : '妻'}) - ID: ${user.id}`);
    });
    
    // Step 3: Add unique constraint if it doesn't exist
    console.log('\n🔒 Adding unique constraint to prevent future duplicates...');
    
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD CONSTRAINT unique_couple_role 
        UNIQUE (couple_id, role)
      `);
      console.log('✅ Unique constraint added successfully.');
    } catch (constraintError: any) {
      if (constraintError.code === '42P07' || constraintError.message.includes('already exists')) {
        console.log('ℹ️  Unique constraint already exists.');
      } else {
        console.error('❌ Failed to add unique constraint:', constraintError.message);
      }
    }
    
    // Step 4: Create index for performance
    console.log('\n📊 Creating index for performance...');
    
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_couple_role 
        ON users (couple_id, role)
      `);
      console.log('✅ Index created successfully.');
    } catch (indexError: any) {
      console.error('❌ Failed to create index:', indexError.message);
    }
    
    // Step 5: Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const verifyResult = await pool.query(duplicateQuery);
    const remainingDuplicates = verifyResult.rows;
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ All duplicate users have been successfully removed!');
    } else {
      console.log(`⚠️  ${remainingDuplicates.length} duplicate sets still remain. Manual intervention may be required.`);
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Execute the migration if this file is run directly
if (require.main === module) {
  fixDuplicateUsers()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export { fixDuplicateUsers };

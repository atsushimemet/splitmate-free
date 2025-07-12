import fs from 'fs';
import path from 'path';
import { Pool, PoolConfig } from 'pg';

// Database configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'splitmate_user',
  password: process.env.DB_PASSWORD || 'splitmate_password',
  database: process.env.DB_NAME || 'splitmate',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Initialize database
export async function initializeDatabase() {
  try {
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'postgres-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (PostgreSQL can handle multiple statements)
    await pool.query(schema);
    console.log('Database schema initialized');
    
    // Create indexes separately to handle duplicates
    await createIndexes();
    
    await seedInitialData();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Seed initial data
async function seedInitialData() {
  try {
    // Check if default users exist
    const userResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userResult.rows[0].count);

    if (userCount === 0) {
      // Insert default users
      const defaultUsers = [
        { id: 'husband-001', name: '夫', role: 'husband' },
        { id: 'wife-001', name: '妻', role: 'wife' }
      ];

      for (const user of defaultUsers) {
        await pool.query(
          'INSERT INTO users (id, name, role) VALUES ($1, $2, $3)',
          [user.id, user.name, user.role]
        );
      }
      console.log('Default users created');
    }

    // Check if default allocation ratio exists
    const ratioResult = await pool.query('SELECT COUNT(*) as count FROM allocation_ratios');
    const ratioCount = parseInt(ratioResult.rows[0].count);

    if (ratioCount === 0) {
      // Insert default allocation ratio (70% husband, 30% wife)
      await pool.query(
        'INSERT INTO allocation_ratios (id, husband_ratio, wife_ratio) VALUES ($1, $2, $3)',
        ['default-ratio', 0.7, 0.3]
      );
      console.log('Default allocation ratio created (70% husband, 30% wife)');
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

// Create indexes with error handling
async function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_monthly ON expenses(expense_year, expense_month)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_monthly_payer ON expenses(expense_year, expense_month, payer_id)',
    'CREATE INDEX IF NOT EXISTS idx_settlements_expense_id ON settlements(expense_id)',
    'CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_custom_ratio ON expenses(uses_custom_ratio)'
  ];

  for (const indexSql of indexes) {
    try {
      await pool.query(indexSql);
      console.log(`Index created: ${indexSql.substring(0, 50)}...`);
    } catch (error: any) {
      console.error(`Error creating index: ${error.message}`);
    }
  }
}

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Connected to PostgreSQL database');
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
} 

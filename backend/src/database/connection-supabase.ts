import { Pool, PoolConfig } from 'pg';

// Supabase Database configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Supabaseの場合は通常CONNECTION_STRINGを使用しますが、個別設定も可能
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Supabaseは常にSSLが必要
  ssl: { rejectUnauthorized: false },
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Initialize database (Supabaseでは基本的にスキーマは手動で設定)
export async function initializeDatabase() {
  try {
    console.log('🔗 Testing Supabase connection...');
    await testConnection();
    
    // Supabaseでは、スキーマの初期化は基本的にSupabase管理画面で行う
    // ここでは接続テストのみ実行
    console.log('✅ Supabase database connection verified');
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error);
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

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('🌐 Connected to Supabase PostgreSQL database at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('🚫 Error connecting to Supabase database:', error);
    return false;
  }
}

// Helper function to execute raw SQL (for migrations if needed)
export async function executeSql(sql: string) {
  try {
    const result = await pool.query(sql);
    console.log('SQL executed successfully');
    return result;
  } catch (error) {
    console.error('Error executing SQL:', error);
    throw error;
  }
} 

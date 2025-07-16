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
  connectionTimeoutMillis: 10000, // タイムアウトを10秒に延長
  // Supabaseは常にSSLが必要
  ssl: { rejectUnauthorized: false },
};

// 接続設定のログ出力（機密情報は隠す）
console.log('🔗 Supabase Database Configuration:');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('   DB_HOST:', process.env.DB_HOST || 'Not set');
console.log('   DB_USER:', process.env.DB_USER || 'Not set');
console.log('   DB_NAME:', process.env.DB_NAME || 'Not set');
console.log('   DB_PORT:', process.env.DB_PORT || '5432');

// Create connection pool
export const pool = new Pool(dbConfig);

// Initialize database (Supabaseでは基本的にスキーマは手動で設定)
export async function initializeDatabase() {
  try {
    console.log('🔗 Testing Supabase connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    // Supabaseでは、スキーマの初期化は基本的にSupabase管理画面で行う
    // ここでは接続テストのみ実行
    console.log('✅ Supabase database connection verified');
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error);
    console.error('❌ Connection details:', {
      hasConnectionString: !!process.env.DATABASE_URL,
      hasHost: !!process.env.DB_HOST,
      hasUser: !!process.env.DB_USER,
      hasPassword: !!process.env.DB_PASSWORD,
      hasDatabase: !!process.env.DB_NAME,
      port: process.env.DB_PORT || '5432'
    });
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

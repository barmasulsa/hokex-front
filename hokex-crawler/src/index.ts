import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 HOKEX Event Data Crawler');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔗 Supabase URL:', process.env.SUPABASE_URL);

// TODO: Initialize and start the crawler server
// This will be implemented in subsequent tasks

async function main() {
  console.log('✅ Crawler initialized successfully');
  console.log('⏳ Waiting for implementation...');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

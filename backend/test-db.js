import db from './src/db.js';

async function main() {
  const res = await db.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

main().catch(console.error);

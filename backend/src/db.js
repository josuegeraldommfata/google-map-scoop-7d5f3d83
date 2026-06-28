import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  password: '32080910',
  host: 'localhost',
  port: 5432,
  database: 'leadshunter',
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export default pool;

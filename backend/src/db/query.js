import { pool } from './pool.js';

/** All SQL in the app goes through here — enforces parameterized queries, never string concatenation. */
export async function executeQuery(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

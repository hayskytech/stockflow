import { pool } from './pool.js';

/**
 * Runs `callback` inside a single MySQL transaction on one dedicated connection.
 * `callback` receives an `execute(sql, params)` bound to that connection — services
 * must use it instead of the pool-wide `executeQuery()` whenever multiple statements
 * (e.g. `SELECT ... FOR UPDATE` followed by an `UPDATE`) must be atomic together,
 * since `executeQuery()` acquires and releases a new pool connection per call.
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const execute = async (sql, params = []) => {
      const [result] = await connection.execute(sql, params);
      return result;
    };
    const result = await callback(execute);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

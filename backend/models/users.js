const db = require('../db'); // assuming this exports a mariadb pool

// Create a new user
const createUser = async (username, email, password) => {
  let conn;
  try {
    conn = await db.connect();
    console.log('Trying to insert:', username, email);
    const result = await conn.query(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, password]
    );
    console.log('Insert result:', result);
    return result.insertId; // return ID on success
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.sqlMessage.includes('username')) {
        throw new Error('Username already exists');
      } else if (err.sqlMessage.includes('email')) {
        throw new Error('Email already exists');
      }
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
};


// Find user by username
const getUserByUsername = async (username, callback) => {
  let conn;
  try {
    conn = await db.connect();
    const rows = await conn.query(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
    // rows is usually an array, return first element or null
    callback(null, rows[0] || null);
  } catch (err) {
    callback(err, null);
  } finally {
    if (conn) conn.release();
  }
};
const getAllUsers = async (callback) => {
  let conn;
  try {
    conn = await db.connect();
    const rows = await conn.query('SELECT * FROM users');
    callback(null, rows);
  } catch (err) {
    callback(err, null);
  } finally {
    if (conn) conn.release();
  }
};


module.exports = {
  createUser,
  getUserByUsername,
  getAllUsers
};

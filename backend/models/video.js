const db = require('../db');

// Adds a video
const addVideo = async (video) => {
  console.log('[upload] before DB');
  const { title, filename, filepath, mimetype, size, duration, author, thumbnail, codec } = video;
  let conn;

  try {
    conn = await db.getConnection();
    const result = await conn.query(
      `INSERT INTO videos 
       (title, filename, filepath, mimetype, size, duration, author, thumbnail, codec) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, filename, filepath, mimetype, size, duration, author, thumbnail, codec]
    );
    console.log('[upload] after DB');
    return result.insertId.toString(); // BigInt → string
  } finally {
    console.log('[upload] after DB');
    if (conn) conn.release();
  }
  
};

const getVideosByAuthor = async (authorId) => {
  let conn;
  try {
    conn = await db.getConnection();
    const rows = await conn.query(
      `SELECT * FROM videos WHERE author = ?`,
      [authorId]
    );

    // Normalize BigInts → strings/numbers
    const clean = rows.map(r => {
      const out = { ...r };
      for (const key in out) {
        if (typeof out[key] === 'bigint') {
          out[key] = out[key].toString();
        }
      }
      return out;
    });

    return clean;
  } finally {
    if (conn) conn.release();
  }
};


// Get a single video by ID
const getVideoById = async (id) => {
  let conn;
  try {
    conn = await db.getConnection();
    const rows = await conn.query(
      `SELECT * FROM videos WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) return null;

    // Normalize BigInts to strings
    const row = { ...rows[0] };
    for (const key in row) {
      if (typeof row[key] === 'bigint') {
        row[key] = row[key].toString();
      }
    }

    return row;
  } catch (err) {
    console.error("DB error in getVideoById:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};


// Delete a video
const deleteVideo = async (id) => {
  let conn;
  try {
    conn = await db.getConnection();
    const result = await conn.query(`DELETE FROM videos WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  addVideo,
  getVideosByAuthor,
  getVideoById,
  deleteVideo,
};

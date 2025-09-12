const mariadb = require('mariadb');

const db = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'mydatabase',
  connectionLimit: 5,
  acquireTimeout: 60000,
  idleTimeout: 60000,
});

// Init logic without messing with exports
(async () => {
  let conn;
  try {
    console.log('Attempting Connection...')
    conn = await db.getConnection();
    console.log('Connection successful.');
    // Create users Table
    await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
    `);
    // Create Video 
    await conn.query(` 
        CREATE TABLE IF NOT EXISTS videos (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(255) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            filepath VARCHAR(255) NOT NULL,
            mimetype VARCHAR(100) NOT NULL,
            size BIGINT NOT NULL,
            duration INT NOT NULL,
            uploadDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            author INT NOT NULL,
            thumbnail VARCHAR(255),
            codec VARCHAR(50),
            FOREIGN KEY (author) REFERENCES users(id)
        );
        `)
  } catch (err) {
    console.error('DB init failed:', err.message);
  } finally {
    if (conn) {
      conn.release();
      console.log('Releasing connection...');
    }
  }
})();

module.exports = db;
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // Low limit for shared hosting
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('MySQL connection error:', err.message);
    console.error('Make sure your database credentials are correct in .env');
  });

module.exports = pool;

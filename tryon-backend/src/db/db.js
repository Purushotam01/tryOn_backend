const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connected successfully');
        connection.release();
    } catch (error) {
        console.warn('MySQL connection failed (optional):', error.message);
    }
}

module.exports = { pool, testConnection };

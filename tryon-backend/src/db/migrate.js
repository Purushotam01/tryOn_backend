/**
 * Database Migration Script
 *
 * Run this once to create the database and tables:
 *   node src/db/migrate.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
    // Connect without database first to create it
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        multipleStatements: true,
    });

    try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        await connection.query(sql);
        console.log('✅ Database and tables created successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();

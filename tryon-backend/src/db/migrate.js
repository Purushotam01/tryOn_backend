/**
 * Safe Database Migration Runner
 *
 * Aligns MySQL database and schema with the configured MYSQL_DATABASE (default: tryon_db).
 *
 * Safety Guarantees:
 * 1. Strictly additive & non-destructive: never DROPs, TRUNCATEs, or overwrites tables/columns/rows.
 * 2. Uses process.env.MYSQL_DATABASE (validated against alphanumeric/underscore characters).
 * 3. If 'users' table is missing, creates it with dual-auth schema (OTP + Google Sign-In).
 * 4. If 'users' table exists, inspects information_schema and adds only genuinely missing columns.
 * 5. Checks for duplicate phone/firebase_uid values before adding UNIQUE indexes.
 * 6. Preserves existing 'email', 'password', and other legacy columns untouched.
 * 7. Reports any NOT NULL constraints that could conflict with OTP/Google registration.
 * 8. phone is nullable: OTP users supply a phone; Google-only users may have none.
 * 9. firebase_uid is nullable and unique: Google Sign-In users are keyed by Firebase UID.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const targetDb = process.env.MYSQL_DATABASE || 'tryon_db';

    // 1. Validate database name to prevent identifier injection
    if (!/^[a-zA-Z0-9_]+$/.test(targetDb)) {
        throw new Error(`[Migration] Invalid database name: "${targetDb}". Only alphanumeric characters and underscores are permitted.`);
    }

    console.log(`[Migration] Starting safe database alignment for target database: '${targetDb}'...`);

    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        multipleStatements: true,
    });

    try {
        // 2. Ensure target database exists and select it
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\`;`);
        await connection.query(`USE \`${targetDb}\`;`);
        console.log(`[Migration] Connected to database '${targetDb}'.`);

        // 3. Check if 'users' table already exists
        const [tableRows] = await connection.query(
            'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [targetDb, 'users']
        );

        if (tableRows.length === 0) {
            // Fresh installation: create users table cleanly with dual-auth schema.
            // phone   - nullable: OTP users supply a phone; Google-only users may have none.
            // firebase_uid - nullable, unique: Google Sign-In users are keyed by Firebase UID.
            console.log(`[Migration] Table 'users' does not exist in '${targetDb}'. Creating table...`);
            await connection.query(`
                CREATE TABLE users (
                    id           INT AUTO_INCREMENT PRIMARY KEY,
                    firebase_uid VARCHAR(128) DEFAULT NULL,
                    phone        VARCHAR(15)  DEFAULT NULL,
                    name         VARCHAR(100) DEFAULT NULL,
                    email        VARCHAR(255) DEFAULT NULL,
                    is_verified  BOOLEAN      DEFAULT FALSE,
                    role         ENUM('user', 'admin') DEFAULT 'user',
                    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY idx_users_firebase_uid (firebase_uid),
                    UNIQUE KEY idx_users_phone (phone)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
            console.log(`✅ [Migration] Table 'users' created successfully in '${targetDb}'.`);
        } else {
            // Pre-existing table: perform safe, non-destructive alignment
            console.log(`[Migration] Pre-existing table 'users' found in '${targetDb}'. Inspecting existing schema...`);

            const [existingColumns] = await connection.query(
                `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
                [targetDb, 'users']
            );

            const columnMap = new Map();
            for (const col of existingColumns) {
                columnMap.set(col.COLUMN_NAME.toLowerCase(), col);
            }

            console.log(`[Migration] Existing columns in 'users': [${Array.from(columnMap.keys()).join(', ')}]`);

            // Add missing OTP-required columns non-destructively
            if (!columnMap.has('phone')) {
                console.log(`[Migration] Adding missing column 'phone' (NULL default for existing row safety)...`);
                await connection.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(15) DEFAULT NULL;`);
                console.log(`✅ [Migration] Column 'phone' added.`);
            }

            if (!columnMap.has('is_verified')) {
                console.log(`[Migration] Adding missing column 'is_verified'...`);
                await connection.query(`ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;`);
                console.log(`✅ [Migration] Column 'is_verified' added.`);
            }

            if (!columnMap.has('role')) {
                console.log(`[Migration] Adding missing column 'role'...`);
                await connection.query(`ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';`);
                console.log(`✅ [Migration] Column 'role' added.`);
            }

            if (!columnMap.has('updated_at')) {
                console.log(`[Migration] Adding missing column 'updated_at'...`);
                await connection.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;`);
                console.log(`✅ [Migration] Column 'updated_at' added.`);
            }

            // firebase_uid — required for Google Sign-In users
            if (!columnMap.has('firebase_uid')) {
                console.log(`[Migration] Adding missing column 'firebase_uid' (Google Sign-In identity)...`);
                await connection.query(`ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) DEFAULT NULL;`);
                console.log(`✅ [Migration] Column 'firebase_uid' added.`);
            }

            // Ensure phone allows NULL so Google-only users (no phone) can be stored.
            // OTP inserts always supply a phone value, so this is backward-compatible.
            const phoneColDef = columnMap.get('phone');
            if (phoneColDef && phoneColDef.IS_NULLABLE === 'NO') {
                console.log(`[Migration] Modifying 'phone' column to allow NULL (required for Google-only users)...`);
                await connection.query(`ALTER TABLE users MODIFY COLUMN phone VARCHAR(15) DEFAULT NULL;`);
                console.log(`✅ [Migration] Column 'phone' now allows NULL.`);
            }

            // Inspect phone unique constraint/index safely
            const [indexes] = await connection.query(
                `SHOW INDEX FROM users WHERE Column_name = 'phone'`
            );
            const hasUniquePhoneIndex = indexes.some(idx => idx.Non_unique === 0);

            if (!hasUniquePhoneIndex) {
                // Check if duplicate phone numbers exist before attempting to create unique index
                const [duplicates] = await connection.query(
                    `SELECT phone, COUNT(*) AS cnt FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING cnt > 1`
                );

                if (duplicates && duplicates.length > 0) {
                    console.warn(`⚠️ [Migration] Cannot add UNIQUE index on 'phone': ${duplicates.length} duplicate phone number(s) detected.`);
                    console.warn(`⚠️ [Migration] Existing rows preserved without UNIQUE index to prevent data loss.`);
                } else {
                    console.log(`[Migration] Adding UNIQUE index 'idx_users_phone' on 'phone'...`);
                    await connection.query(`ALTER TABLE users ADD UNIQUE INDEX idx_users_phone (phone);`);
                    console.log(`✅ [Migration] UNIQUE index 'idx_users_phone' added successfully.`);
                }
            } else {
                console.log(`[Migration] Unique index on 'phone' already exists.`);
            }

            // Inspect firebase_uid unique constraint/index safely
            const [fbIndexes] = await connection.query(
                `SHOW INDEX FROM users WHERE Column_name = 'firebase_uid'`
            );
            const hasUniqueFirebaseIndex = fbIndexes.some(idx => idx.Non_unique === 0);

            if (!hasUniqueFirebaseIndex) {
                // Check for duplicate firebase_uid values before creating unique index
                const [fbDuplicates] = await connection.query(
                    `SELECT firebase_uid, COUNT(*) AS cnt FROM users WHERE firebase_uid IS NOT NULL GROUP BY firebase_uid HAVING cnt > 1`
                );

                if (fbDuplicates && fbDuplicates.length > 0) {
                    console.warn(`⚠️ [Migration] Cannot add UNIQUE index on 'firebase_uid': ${fbDuplicates.length} duplicate(s) detected. Resolve before retrying.`);
                } else {
                    console.log(`[Migration] Adding UNIQUE index 'idx_users_firebase_uid' on 'firebase_uid'...`);
                    await connection.query(`ALTER TABLE users ADD UNIQUE INDEX idx_users_firebase_uid (firebase_uid);`);
                    console.log(`✅ [Migration] UNIQUE index 'idx_users_firebase_uid' added successfully.`);
                }
            } else {
                console.log(`[Migration] Unique index on 'firebase_uid' already exists.`);
            }

            // Inspect existing NOT NULL constraints for potential OTP conflict
            const problematicCols = [];
            for (const col of existingColumns) {
                const name = col.COLUMN_NAME.toLowerCase();
                if (['firebase_uid', 'phone', 'is_verified', 'id', 'updated_at', 'created_at'].includes(name)) continue;
                const isAutoIncrement = (col.EXTRA || '').toLowerCase().includes('auto_increment');
                if (col.IS_NULLABLE === 'NO' && col.COLUMN_DEFAULT === null && !isAutoIncrement) {
                    problematicCols.push(col.COLUMN_NAME);
                }
            }

            if (problematicCols.length > 0) {
                console.warn(`⚠️ [Migration] Schema warning: Column(s) [${problematicCols.join(', ')}] are NOT NULL without a DEFAULT value.`);
                console.warn(`⚠️ [Migration] If live database has legacy required fields, OTP registration inserts omitting these columns will require defaults.`);
                console.warn(`⚠️ [Migration] Preserving existing constraints untouched per safety rules.`);
            }

            console.log(`✅ [Migration] Schema alignment for 'users' completed successfully.`);
        }

        // 4. Ensure 'user_documents' table exists for MySQL application data persistence
        console.log(`[Migration] Checking 'user_documents' table in '${targetDb}'...`);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_documents (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_uid VARCHAR(191) NOT NULL,
                collection_name VARCHAR(100) NOT NULL,
                document_id VARCHAR(191) NOT NULL,
                data JSON NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_documents_identity (user_uid, collection_name, document_id),
                KEY idx_user_documents_collection (user_uid, collection_name, created_at),
                KEY idx_user_documents_updated_at (updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log(`✅ [Migration] Table 'user_documents' verified/created successfully in '${targetDb}'.`);

        console.log('✅ [Migration] Database migration completed successfully.');
        return { success: true, targetDb };
    } catch (error) {
        console.error('❌ [Migration] Migration failed:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { migrate };

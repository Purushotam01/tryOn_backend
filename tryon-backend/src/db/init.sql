-- ============================================
-- TryFit Backend Database Initialization
-- ============================================

-- Users table (OTP + Google Sign-In authentication)
-- Executed in the context of the configured MYSQL_DATABASE (default: tryon_db)
--
-- Identity columns:
--   phone       — set for OTP/phone-verified users; NULL for Google-only users.
--   firebase_uid — set for Google Sign-In users; NULL for OTP-only users.
--   At least one of phone or firebase_uid must be present for a valid user.
CREATE TABLE IF NOT EXISTS users (
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
);

-- Generic MySQL-backed user documents. This table replaces Firestore for all
-- application records while preserving the existing document-shaped service
-- payloads and API contracts. Firebase Storage remains separate for files.
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


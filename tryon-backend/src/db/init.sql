-- ============================================
-- Tryon Backend Database Initialization
-- ============================================

CREATE DATABASE IF NOT EXISTS tryon_db;
USE tryon_db;

-- Users table (phone-based OTP authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(15) NOT NULL UNIQUE,
    name VARCHAR(100) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Note: phone column already has a unique index via the UNIQUE constraint,
-- so no additional index is needed for phone lookups.



-- Lead Form Database Schema for Hostinger MySQL
-- Run this in phpMyAdmin after creating your database

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  zip_code VARCHAR(10) NOT NULL,
  preferred_filing VARCHAR(20) DEFAULT 'remote',
  ref_code VARCHAR(10) DEFAULT 'ow',
  consent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_created_at (created_at),
  INDEX idx_zip_code (zip_code),
  INDEX idx_ref_code (ref_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- View to see recent leads
CREATE OR REPLACE VIEW recent_leads AS
SELECT
  id,
  CONCAT(first_name, ' ', last_name) AS full_name,
  phone,
  email,
  zip_code,
  preferred_filing,
  ref_code,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 100;

-- Migration: 001_create_all_tables.sql
-- Description: Creates all required tables for CollectoVault API
-- Date: 2026-05-14

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- ===========================================
-- MIGRATIONS TABLE (for tracking migrations)
-- ===========================================
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ===========================================
-- CHAT MESSAGES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clientId INT NOT NULL,
  senderType ENUM('customer', 'support') NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT NULL COMMENT 'JSON array of attachment URLs',
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_client_id (clientId),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB;

-- ===========================================
-- WHATSAPP CONTACTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clientId INT NOT NULL,
  whatsappNumber VARCHAR(20) NOT NULL,
  isPreferred BOOLEAN DEFAULT FALSE,
  verifiedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_client_preferred (clientId, isPreferred),
  INDEX idx_client_id (clientId)
) ENGINE=InnoDB;

-- ===========================================
-- BUSINESS CONTACTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS business_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contactType ENUM('whatsapp', 'email', 'phone') NOT NULL,
  value VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contact_type (contactType, isActive)
) ENGINE=InnoDB;

-- ===========================================
-- FEEDBACK TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clientId INT NOT NULL,
  feedbackType ENUM('order', 'service', 'app', 'general') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT NULL COMMENT 'JSON array of attachment URLs',
  status ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_client_id (clientId),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB;

-- ===========================================
-- RATINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clientId INT NOT NULL,
  transactionId INT NOT NULL,
  orderRating TINYINT NOT NULL CHECK (orderRating BETWEEN 1 AND 5),
  paymentRating TINYINT NOT NULL CHECK (paymentRating BETWEEN 1 AND 5),
  serviceRating TINYINT NOT NULL CHECK (serviceRating BETWEEN 1 AND 5),
  overallRating TINYINT NOT NULL CHECK (overallRating BETWEEN 1 AND 5),
  comment TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_transaction_rating (clientId, transactionId),
  INDEX idx_client_id (clientId),
  INDEX idx_transaction_id (transactionId),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
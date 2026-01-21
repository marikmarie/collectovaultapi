-- Migration: Create buy_points_transactions table
-- This table stores all buy points transactions for vault customers

CREATE TABLE IF NOT EXISTS buy_points_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  collecto_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  reference_id VARCHAR(255) NOT NULL,
  points INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
  staff_id VARCHAR(255),
  staff_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_customer_id (customer_id),
  INDEX idx_collecto_id (collecto_id),
  INDEX idx_client_id (client_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_reference_id (reference_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (customer_id) REFERENCES vault_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

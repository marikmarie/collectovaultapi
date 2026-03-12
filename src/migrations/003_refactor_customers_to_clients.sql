-- Migration to refactor vault_customers into vault_clients and vault_business_clients

CREATE TABLE IF NOT EXISTS vault_clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    recordDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vault_business_clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    clientId VARCHAR(255) UNIQUE NOT NULL,
    collectoId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    current_points INT DEFAULT 0,
    earned_points INT DEFAULT 0,
    bought_points INT DEFAULT 0,
    tier_id INT DEFAULT NULL,
    total_purchased DECIMAL(15, 2) DEFAULT 0.00,
    IsActive BOOLEAN DEFAULT TRUE,
    recorddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES vault_clients(id),
    UNIQUE KEY idx_collecto_client (collectoId, clientId)
);

-- Migration to refactor vault_customers into vault_clients and vault_business_clients
-- vault_clients now holds the profile and points (global user context)
-- vault_business_clients is a simplified mapping table

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
    isActive BOOLEAN DEFAULT TRUE,
    recorddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES vault_clients(id),
    UNIQUE KEY idx_collecto_client (collectoId, clientId)
);

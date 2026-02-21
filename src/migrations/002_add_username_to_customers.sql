-- Add username column to vault_customers table
ALTER TABLE vault_customers
ADD COLUMN username VARCHAR(100) UNIQUE NULL DEFAULT NULL AFTER client_id;

-- Create an index for faster username lookups
CREATE INDEX idx_username ON vault_customers(username);

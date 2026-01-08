-- Add collecto_id column to vault_packages
ALTER TABLE vault_packages
  ADD COLUMN collecto_id VARCHAR(255) NULL AFTER id;
-- Add collecto_id column to vault_tiers
ALTER TABLE vault_tiers
  ADD COLUMN IF NOT EXISTS collecto_id VARCHAR(255) NULL AFTER id;
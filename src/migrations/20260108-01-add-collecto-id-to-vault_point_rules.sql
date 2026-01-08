-- Add collecto_id column to vault_point_rules
ALTER TABLE vault_point_rules
  ADD COLUMN IF NOT EXISTS collecto_id VARCHAR(255) NULL AFTER id;
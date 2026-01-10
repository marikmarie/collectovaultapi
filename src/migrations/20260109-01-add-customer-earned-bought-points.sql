
ALTER TABLE vault_customers
  ADD COLUMN earned_points INT NOT NULL DEFAULT 0 AFTER current_points,
  ADD COLUMN bought_points INT NOT NULL DEFAULT 0 AFTER earned_points;

-- Ensure indexes if desired (not strictly necessary)
CREATE INDEX IF NOT EXISTS idx_vault_customers_collecto_id ON vault_customers (collecto_id);


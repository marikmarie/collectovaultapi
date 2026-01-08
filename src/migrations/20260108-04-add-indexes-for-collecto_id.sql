-- Add indexes for collecto_id columns
ALTER TABLE vault_point_rules
  ADD INDEX IF NOT EXISTS idx_vpr_collecto_id (collecto_id);

ALTER TABLE vault_packages
  ADD INDEX IF NOT EXISTS idx_vp_collecto_id (collecto_id);

ALTER TABLE vault_tiers
  ADD INDEX IF NOT EXISTS idx_vt_collecto_id (collecto_id);
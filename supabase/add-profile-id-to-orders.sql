-- ── Add profile_id to crm_orders ──────────────────────────────────────────────
-- Allows CRM orders to be linked directly to a site user profile.
-- profile_id is auto-resolved from crm_clients.profile_id on order create/update.

-- 1. Add column
ALTER TABLE crm_orders
  ADD COLUMN IF NOT EXISTS profile_id UUID
    REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Index for fast lookups by profile
CREATE INDEX IF NOT EXISTS idx_crm_orders_profile ON crm_orders(profile_id);

-- 3. RLS: authenticated users can view their own orders
CREATE POLICY "Client can view own orders"
  ON crm_orders
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- 4. Backfill existing orders
UPDATE crm_orders o
SET    profile_id = c.profile_id
FROM   crm_clients c
WHERE  o.client_id     = c.id
  AND  c.profile_id   IS NOT NULL
  AND  o.profile_id   IS NULL;

-- 5. Verify
SELECT
  count(*)                                          AS total_orders,
  count(*) FILTER (WHERE profile_id IS NOT NULL)    AS linked_orders,
  count(*) FILTER (WHERE profile_id IS NULL)        AS unlinked_orders
FROM crm_orders;

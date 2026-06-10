-- ═══════════════════════════════════════════════════════════════════
--  FurryPanel CRM — Security & consistency fixes (по итогам аудита)
--  Запускать в Supabase Dashboard → SQL Editor целиком.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. ДИАГНОСТИКА: триггеры на crm_payments ─────────────────────────
-- Код приложения теперь САМ обновляет crm_orders.paid при создании и
-- удалении платежа. Если в базе есть триггер, который делает то же
-- самое — суммы будут удваиваться. Проверь:

SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'crm_payments'::regclass AND NOT tgisinternal;

-- Если запрос выше вернул триггер, обновляющий crm_orders.paid —
-- УДАЛИ его (подставь имя):
-- DROP TRIGGER <имя_триггера> ON crm_payments;

-- ── 1. Недостающие объекты (schema drift) ────────────────────────────

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS total_spent INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS crm_hidden_transactions (
  source_type TEXT        NOT NULL CHECK (source_type IN ('balance_transaction', 'purchase')),
  source_id   UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_type, source_id)
);

ALTER TABLE crm_hidden_transactions ENABLE ROW LEVEL SECURITY;

-- ── 2. CHECK-констрейнт payment_method ───────────────────────────────
-- Приложение пишет card_ua / card_ru / card_eu / card_other,
-- исходная схема разрешала только card/transfer/crypto/paypal/other.

ALTER TABLE crm_payments DROP CONSTRAINT IF EXISTS crm_payments_payment_method_check;
ALTER TABLE crm_payments ADD CONSTRAINT crm_payments_payment_method_check
  CHECK (payment_method IN (
    'card', 'card_ua', 'card_ru', 'card_eu', 'card_other',
    'transfer', 'crypto', 'paypal', 'other'
  ));

-- ── 3. RLS: доступ к CRM только владельцу ────────────────────────────
-- Было: "Allow all for authenticated" — ЛЮБОЙ зарегистрированный
-- пользователь сайта мог читать/менять все данные CRM через REST API.

CREATE OR REPLACE FUNCTION is_crm_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION is_crm_owner() TO authenticated;

-- crm_clients
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_clients;
DROP POLICY IF EXISTS "Owner full access"           ON crm_clients;
CREATE POLICY "Owner full access" ON crm_clients
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- crm_services
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_services;
DROP POLICY IF EXISTS "Owner full access"           ON crm_services;
CREATE POLICY "Owner full access" ON crm_services
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- crm_orders (политика "Client can view own orders" из
-- add-profile-id-to-orders.sql остаётся — клиент видит только свои)
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_orders;
DROP POLICY IF EXISTS "Owner full access"           ON crm_orders;
CREATE POLICY "Owner full access" ON crm_orders
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- crm_payments
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_payments;
DROP POLICY IF EXISTS "Owner full access"           ON crm_payments;
CREATE POLICY "Owner full access" ON crm_payments
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- crm_expenses
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_expenses;
DROP POLICY IF EXISTS "Owner full access"           ON crm_expenses;
CREATE POLICY "Owner full access" ON crm_expenses
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- crm_hidden_transactions
DROP POLICY IF EXISTS "Allow all for authenticated" ON crm_hidden_transactions;
DROP POLICY IF EXISTS "Owner full access"           ON crm_hidden_transactions;
CREATE POLICY "Owner full access" ON crm_hidden_transactions
  FOR ALL TO authenticated USING (is_crm_owner()) WITH CHECK (is_crm_owner());

-- ── 4. Индексы (если add-indexes.sql ещё не запускался) ──────────────

CREATE INDEX IF NOT EXISTS idx_crm_orders_client    ON crm_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status    ON crm_orders(status);
CREATE INDEX IF NOT EXISTS idx_crm_orders_deadline  ON crm_orders(deadline);
CREATE INDEX IF NOT EXISTS idx_crm_orders_profile   ON crm_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_crm_payments_order   ON crm_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_crm_payments_client  ON crm_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_profile  ON crm_clients(profile_id);

-- ── 5. Проверка результата ───────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'crm_%'
ORDER BY tablename, policyname;

SELECT pg_get_constraintdef(oid) AS payment_method_check
FROM pg_constraint
WHERE conrelid = 'crm_payments'::regclass AND conname = 'crm_payments_payment_method_check';

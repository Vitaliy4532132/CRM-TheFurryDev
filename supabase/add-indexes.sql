-- ── Индексы для оптимизации запросов CRM ─────────────────────────────────────
-- Выполни этот файл в Supabase SQL Editor (Dashboard → SQL Editor)

-- Платежи: быстрый поиск по клиенту и дате
CREATE INDEX IF NOT EXISTS idx_crm_payments_client
  ON crm_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_payments_date
  ON crm_payments(payment_date DESC);

-- Заказы: быстрый поиск по статусу и дате
CREATE INDEX IF NOT EXISTS idx_crm_orders_status
  ON crm_orders(status);
CREATE INDEX IF NOT EXISTS idx_crm_orders_created
  ON crm_orders(created_at DESC);

-- Клиенты: быстрый поиск по profile_id
CREATE INDEX IF NOT EXISTS idx_crm_clients_profile
  ON crm_clients(profile_id);

-- Сайтовые данные
CREATE INDEX IF NOT EXISTS idx_balance_tx_user
  ON balance_transactions(user_id, type, amount);
CREATE INDEX IF NOT EXISTS idx_purchases_user
  ON purchases(user_id, created_at DESC);

-- Проверка — показывает все созданные индексы
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'crm_%' OR tablename IN ('balance_transactions', 'purchases'))
ORDER BY tablename, indexname;

-- ═══════════════════════════════════════════════════════════════════
--  FurryPanel CRM — Schema
--  Supabase Dashboard → SQL Editor → New Query → вставь и запусти
--  Префикс crm_ — не трогаем существующие таблицы FurryDev
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Clients ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_clients (
  id         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT                     NOT NULL,
  telegram   TEXT,
  discord    TEXT,
  email      TEXT,
  country    TEXT,
  note       TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 2. Services ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_services (
  id          UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT                     NOT NULL,
  description TEXT,
  min_price   INTEGER                  NOT NULL DEFAULT 0,
  is_active   BOOLEAN                  NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 3. Orders ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_orders (
  id            UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  SERIAL                   UNIQUE,
  client_id     UUID                     REFERENCES crm_clients(id)  ON DELETE SET NULL,
  service_id    UUID                     REFERENCES crm_services(id) ON DELETE SET NULL,
  project_name  TEXT                     NOT NULL,
  description   TEXT,
  amount        INTEGER                  NOT NULL DEFAULT 0,
  paid          INTEGER                  NOT NULL DEFAULT 0,
  deadline      DATE,
  status        TEXT                     NOT NULL DEFAULT 'new'
                  CHECK (status IN (
                    'new', 'discussion', 'waiting_payment',
                    'in_progress', 'review', 'revision',
                    'done', 'completed', 'cancelled'
                  )),
  comment       TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_orders_client   ON crm_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status   ON crm_orders(status);
CREATE INDEX IF NOT EXISTS idx_crm_orders_deadline ON crm_orders(deadline);

-- ── 4. Payments ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_payments (
  id             UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID                     REFERENCES crm_orders(id)  ON DELETE SET NULL,
  client_id      UUID                     REFERENCES crm_clients(id) ON DELETE SET NULL,
  amount         INTEGER                  NOT NULL,
  payment_method TEXT
                   CHECK (payment_method IN ('card', 'transfer', 'crypto', 'paypal', 'other')),
  payment_date   DATE                     NOT NULL DEFAULT CURRENT_DATE,
  comment        TEXT,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_payments_order  ON crm_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_crm_payments_client ON crm_payments(client_id);

-- ── 5. Expenses ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_expenses (
  id         UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT                     NOT NULL,
  category   TEXT
               CHECK (category IN (
                 'ads', 'hosting', 'domain', 'plugins',
                 'salary', 'commission', 'refund', 'other'
               )),
  amount     INTEGER                  NOT NULL,
  date       DATE                     NOT NULL DEFAULT CURRENT_DATE,
  comment    TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON crm_expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 6. service_orders — уже существует, только расширяем ─────────────

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS discord TEXT DEFAULT '';

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';

-- ── 7. Seed: начальные услуги ─────────────────────────────────────────

INSERT INTO crm_services (name, description, min_price, is_active) VALUES
  ('Сборка сервера',      'Полная сборка Minecraft-сервера под ключ',      5000, true),
  ('Настройка плагинов',  'Установка и настройка готовых плагинов',         800, true),
  ('Разработка плагинов', 'Разработка уникальных плагинов на Java',         3000, true),
  ('Разработка модов',    'Создание модификаций для Minecraft (Forge/Fabric)', 5000, true),
  ('Билдинг',             'Строительство спавнов и локаций',                2000, true),
  ('Дизайн',              'Дизайн логотипов и баннеров',                    1500, true),
  ('Сайт',                'Разработка сайтов для серверов',                 4000, true),
  ('Discord-бот',         'Разработка ботов для Discord',                   2000, true),
  ('Telegram-бот',        'Разработка Telegram-ботов',                      1500, true),
  ('Техподдержка',        'Техническая поддержка сервера',                   500, true)
ON CONFLICT DO NOTHING;

-- ── 8. Seed: тестовые клиенты ─────────────────────────────────────────

INSERT INTO crm_clients (name, telegram, discord, email, country) VALUES
  ('FoxxArt',     '@foxxart',     'FoxxArt#1234', 'foxx@mail.ru',   'Россия'),
  ('WolfCreator', '@wolfcreator', 'Wolf#5678',     'wolf@gmail.com', 'Беларусь'),
  ('PixelPaws',   '@pixelpaws',   'Pixel#9012',    'pixel@mail.ru',  'Россия')
ON CONFLICT DO NOTHING;

-- ── 9. Проверка ───────────────────────────────────────────────────────

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'crm_%'
ORDER BY table_name;

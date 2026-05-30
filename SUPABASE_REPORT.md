# Отчёт по базе данных Supabase — FurryPanel CRM

Сгенерировано: 30.05.2026 (live данные)
Проект: `poyzvxzajqmbtiawzvtr` (SolarStudio AUTH)

> **Важно:** CRM-панель и сайт FurryDev используют **одну и ту же** Supabase БД.
> В БД уже 40+ таблиц принадлежащих FurryDev. Новые CRM-таблицы создаём с префиксом `crm_`.

---

## Все таблицы в БД (40 шт.)

| Таблица | Записей | Назначение |
|---------|---------|------------|
| `profiles` | 44 | Профили пользователей сайта |
| `orders` | 3 | Простые заказы (сайт) |
| `service_orders` | 3 | **Заявки с формы сайта** ← близко к CRM requests |
| `admin_projects` | 8 | **Проекты/заказы** ← близко к CRM orders! |
| `admin_tasks` | 52 | Задачи внутри проектов |
| `admin_subtasks` | 0 | Подзадачи |
| `admin_notifications` | 26 | Уведомления |
| `balance_transactions` | 111 | Финансовые транзакции |
| `purchases` | 40 | Покупки продуктов |
| `products` | 5 | Плагины / сборки магазина |
| `product_categories` | 2 | Категории продуктов |
| `product_versions` | 11 | Версии продуктов |
| `reviews` | 50 | Отзывы |
| `team_applications` | 15 | Заявки в команду |
| `team_members` | 3 | Участники команды |
| `portfolio_projects` | 56 | Портфолио |
| `blog_posts` | 5 | Блог |
| `blog_comments` | 1 | Комментарии блога |
| `plugin_licenses` | 19 | Лицензии плагинов |
| `license_checks` | 61 | Проверки лицензий |
| `modpack_licenses` | 1 | Лицензии модпаков |
| `modpack_license_logs` | 23 | Логи модпаков |
| `roles` | 19 | Роли |
| `user_roles` | 91 | Роли пользователей |
| `user_activity_log` | 85 | Лог активности |
| `calculator_categories` | 21 | Категории калькулятора |
| `calculator_items` | 66 | Элементы калькулятора |
| `calculator_prices` | 71 | Цены калькулятора |
| `promo_codes` | 0 | Промокоды |
| `promo_uses` | 0 | Использования промокодов |
| `order_messages` | 40 | Сообщения в заказах |
| `order_typing` | 0 | Индикатор набора текста |
| `project_access` | 1 | Доступ к проектам |
| `project_logs` | 1 | Логи проектов |
| `project_points` | 0 | Очки проектов |
| `task_comments` | 0 | Комментарии задач |
| `task_attachments` | 0 | Вложения задач |
| `review_links` | 0 | Ссылки для отзывов |
| `free_downloads` | 0 | Бесплатные скачивания |
| `furrybags_allowed_ips` | 1 | Разрешённые IP |

---

## ⚡ Ключевые находки

### `admin_projects` — почти готовая таблица заказов CRM!

```
id, name, description, color, icon, deadline,
client_id, client_name (текст "@Feter_Destraid"),
chat_url, total_price, paid_amount,
status, order_number, attachments, public_token
```

**Проблема:** `client_id` всегда NULL — клиенты хранятся как текст `client_name`.
CRM нужна нормализованная таблица `crm_clients`.

### `service_orders` — заявки с сайта = входящие обращения

```
id, service_type, service_title, telegram, budget (текст!),
deadline, description, details (JSON), status,
user_id, progress, payment_status, stage, budget_int,
deadline_at, unread_count, order_number
```

**Вывод:** Это и есть источник заявок для CRM раздела "Заявки".
Можно читать напрямую из `service_orders` вместо создания отдельной `crm_requests`.

---

## Анализ для CRM

| Таблица CRM | Статус | Вывод |
|-------------|--------|-------|
| `crm_clients` | ❌ НЕТ | Создать новую |
| `crm_orders` | ⚠️ ЧАСТИЧНО | `admin_projects` очень близко, но нельзя ломать FurryDev — создаём `crm_orders` |
| `crm_payments` | ❌ НЕТ | Создать новую (есть `balance_transactions` но для баланса сайта) |
| `crm_expenses` | ❌ НЕТ | Создать новую |
| `crm_services` | ❌ НЕТ | Создать новую (есть `products` но это магазин) |
| `crm_requests` | ⚠️ ЧАСТИЧНО | **Уже есть `service_orders`** — читать оттуда! |

---

## SQL для создания CRM-таблиц

Выполни в **Supabase Dashboard → SQL Editor**:

### 1. Клиенты

```sql
CREATE TABLE IF NOT EXISTS crm_clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  telegram   TEXT,
  discord    TEXT,
  email      TEXT,
  country    TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_clients owner" ON crm_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2. Услуги CRM

```sql
CREATE TABLE IF NOT EXISTS crm_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  min_price   NUMERIC(12,2) DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_services owner" ON crm_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Начальные данные
INSERT INTO crm_services (name, description, min_price) VALUES
  ('Разработка плагина',  'Разработка Java-плагина для Minecraft', 2000),
  ('Сборка сервера',      'Полная сборка и настройка сервера',     5000),
  ('Настройка плагинов',  'Установка и настройка готовых плагинов', 800),
  ('Разработка мода',     'Forge/Fabric мод',                      3000),
  ('Discord-бот',         'Бот на Python/JS',                      1500),
  ('Сайт',                'Веб-сайт для сервера',                  4000);
```

### 3. Заказы CRM

```sql
CREATE TABLE IF NOT EXISTS crm_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  SERIAL UNIQUE,
  client_id     UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  service_id    UUID REFERENCES crm_services(id) ON DELETE SET NULL,
  project_name  TEXT,
  description   TEXT,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid          NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline      DATE,
  status        TEXT NOT NULL DEFAULT 'Новый'
                  CHECK (status IN (
                    'Новый','В работе','На проверке',
                    'Правки','Готово','Завершён',
                    'Ожидает оплату','Отменён'
                  )),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_orders owner" ON crm_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX crm_orders_client_idx  ON crm_orders(client_id);
CREATE INDEX crm_orders_status_idx  ON crm_orders(status);
CREATE INDEX crm_orders_deadline_idx ON crm_orders(deadline);
```

### 4. Платежи CRM

```sql
CREATE TABLE IF NOT EXISTS crm_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID REFERENCES crm_orders(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  amount         NUMERIC(12,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Карта'
                   CHECK (payment_method IN ('Карта','Перевод','Крипта','PayPal','Другое')),
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_payments owner" ON crm_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX crm_payments_order_idx  ON crm_payments(order_id);
CREATE INDEX crm_payments_client_idx ON crm_payments(client_id);
```

### 5. Расходы CRM

```sql
CREATE TABLE IF NOT EXISTS crm_expenses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Другое'
               CHECK (category IN (
                 'Хостинг','Реклама','Инструменты',
                 'Зарплата','Налоги','Подписки',
                 'Оборудование','Другое'
               )),
  amount     NUMERIC(12,2) NOT NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crm_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_expenses owner" ON crm_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 6. Заявки — используем существующую `service_orders`

Новую таблицу не создаём. В CRM раздел "Заявки" подключаем `service_orders` напрямую.

Только добавляем колонки которых не хватает:

```sql
-- Добавляем discord если нет
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS discord TEXT DEFAULT '';

-- Добавляем source если нет  
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Сайт'
    CHECK (source IN ('Telegram','Discord','VK','Сайт','Сарафан','Другое'));
```

---

## Итоговая сводка

| | Таблица | Статус |
|--|---------|--------|
| ✅ | `crm_clients` | Создать (SQL выше) |
| ✅ | `crm_services` | Создать (SQL выше) |
| ✅ | `crm_orders` | Создать (SQL выше) |
| ✅ | `crm_payments` | Создать (SQL выше) |
| ✅ | `crm_expenses` | Создать (SQL выше) |
| ♻️ | `service_orders` | Уже есть — использовать для раздела "Заявки" |

---

## Следующие шаги

1. **Запусти SQL** из этого файла в Supabase Dashboard → SQL Editor
2. **Добавь `SUPABASE_SERVICE_ROLE_KEY`** в `FurryPanel/.env.local` (нужен для чтения без RLS)
3. **Подключай страницы CRM** к реальным данным (заменяем статические массивы)

```env
# Добавить в FurryPanel/.env.local:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # скопировать из FurryDev/.env.local
```

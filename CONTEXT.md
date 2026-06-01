# FurryPanel CRM — Контекст проекта

## Стек
- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (auth + database)
- Recharts (графики)

## Домены
- CRM: crm.thefurry.store
- Основной сайт: thefurry.store
- Хостинг: Vercel

## Supabase
- Общая сессия между сайтами через cookie domain: .thefurry.store
- Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Env: NEXT_PUBLIC_COOKIE_DOMAIN=.thefurry.store (продакшен)

## Доступ в CRM
- Только пользователи с role = 'owner' в таблице profiles
- Middleware проверяет роль на каждом запросе

## Таблицы CRM (префикс crm_)
- crm_clients — клиенты (profile_id связь с profiles)
- crm_orders — заказы (order_number SERIAL от 174)
- crm_payments — платежи
- crm_expenses — расходы
- crm_services — услуги
- crm_requests — заявки (создаются вручную в CRM)

## Таблицы основного сайта (только читаем)
- profiles — пользователи (role: owner/buyer/user/server_owner)
- purchases — покупки продуктов на сайте
- products — продукты (name, price, slug)
- balance_transactions — транзакции баланса
  (type: admin=доход, spend/bonus/promo=не доход)
- service_orders — заявки с сайта (больше не используем в CRM)

## Триггеры в БД
- sync_buyer_to_crm — добавляет профили в crm_clients
- sync_profile_by_telegram — синхронизация по Telegram
- sync_purchase_payment_to_crm — покупки → crm_payments
- sync_balance_transaction_to_crm — admin транзакции → crm_payments
- recalculate_order_paid — пересчёт paid при добавлении платежа
- trigger_sync_buyer — триггер на profiles
- trigger_sync_profile_telegram — триггер на profiles.telegram
- trigger_sync_purchase_payment — триггер на purchases
- trigger_sync_balance_transaction — триггер на balance_transactions
- trigger_recalculate_paid — триггер на crm_payments

## Ключевые файлы
- lib/crm/api.ts — все функции работы с БД
- lib/crm/helpers.ts — хелперы (formatMoney, getPaymentStatus и тд)
- types/crm.ts — TypeScript типы
- hooks/useUnsavedChanges.ts — хук подтверждения закрытия модалок
- components/crm/sidebar.tsx — навигация
- components/crm/topbar.tsx — поиск + кнопка создать заказ
- components/crm/combobox-client.tsx — поиск клиента в формах
- components/crm/confirm-close-modal.tsx — модалка подтверждения

## Страницы
- /dashboard — главная со статистикой и дедлайнами
- /orders — список заказов (активные сверху, от #174)
- /orders/[id] — карточка заказа
- /clients — список клиентов
- /clients/[id] — карточка клиента (редактирование inline)
- /finance — доходы и платежи
- /expenses — расходы
- /services — услуги (карточки grid)
- /requests — заявки (ручное создание)
- /analytics — графики и статистика (Recharts)
- /settings — настройки (вкладки: Профиль/Студия/Безопасность)
- /login — вход (email+pass, Google, Discord OAuth)

## Дизайн система
Тёмная тема, CSS переменные:
--crm-bg: #0F1117
--crm-sidebar: #13151F
--crm-surface: #1C1F2E
--crm-surface-hover: #222640
--crm-s3: #272A3A
--crm-blue: #4F8EF7
--crm-green: #22C55E
--crm-red: #EF4444
--crm-yellow: #F59E0B
--crm-orange: #F97316
--crm-purple: #A855F7
--crm-teal: #14B8A6
--crm-text: #E2E8F5
--crm-muted: #64748B
--crm-border: #252840
--crm-border2: #2E3350

## Способы оплаты
card_ua / card_ru / card_eu / card_other /
transfer / crypto / paypal / other

## Статусы заказов
new / discussion / waiting_payment / in_progress /
review / revision / done / completed / cancelled

## Важные правила
- Все тексты в интерфейсе на РУССКОМ языке
- Никаких эмодзи — только lucide-react иконки
- Все цвета через CSS переменные
- Не трогать таблицы без префикса crm_ (кроме чтения)
- Валюта: ₽ рубли везде
- formatMoney() для всех денежных значений
- Модалки с подтверждением закрытия (useUnsavedChanges)

## Что сделано
✅ Layout + Sidebar + Topbar
✅ Все страницы с реальными данными из Supabase
✅ CRUD для всех сущностей
✅ Авторизация + защита по роли owner
✅ Общая сессия с основным сайтом
✅ Синхронизация клиентов из profiles
✅ Синхронизация платежей из purchases и balance_transactions
✅ Триггер пересчёта paid при добавлении платежа
✅ Импорт данных из Excel
✅ Аналитика с графиками (Recharts)
✅ Модалка подтверждения закрытия форм
✅ Глобальный поиск в топбаре
✅ Нумерация заказов от #174

## Следующие задачи (в очереди)
- Задачи/чеклист по заказу
- Лог/история по заказу
- Быстрые ответы/шаблоны сообщений
- Telegram уведомления
- Напоминания о дедлайнах
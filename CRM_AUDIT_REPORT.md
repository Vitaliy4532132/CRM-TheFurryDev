# 🔍 CRM Audit Report — FurryPanel

**Дата аудита:** 2026-06-10
**Объём:** 13 страниц, 12 модалок, API-слой, кеш, хуки, middleware, SQL-схема
**Метод:** статический анализ кода + `tsc --noEmit` + анализ схемы БД (прямого доступа к Supabase нет — диагностические SQL приложены для ручного запуска)

---

## 🔴 Критические баги (исправить срочно)

### 1. Сборка проекта сломана — TypeScript не компилируется
**Файл:** [components/crm/modals/create-order-modal.tsx:118](components/crm/modals/create-order-modal.tsx#L118) + [types/crm.ts:101](types/crm.ts#L101)

`npx tsc --noEmit` падает с ошибкой:
```
error TS2345: Property 'profile_id' is missing in type '{...}' but required
in type 'Omit<CRMOrder, ...>'
```
Поле `profile_id: string | null` добавлено в `CRMOrder` как **обязательное**, а тип входа `createCRMOrder` его не исключает — модалка создания заказа не передаёт `profile_id` (и не должна — он резолвится внутри API). `next build` упадёт.

**Фикс:** в `lib/crm/api.ts` добавить `'profile_id'` в `Omit<...>` входных типов `createCRMOrder`/`updateCRMOrder`, либо в `types/crm.ts` сделать поле опциональным: `profile_id?: string | null`.

### 2. RLS-политика «Allow all for authenticated» — утечка всех CRM-данных
**Файл:** [supabase/crm-schema.sql:22-23, 38-39, 66-67, 89-90, 113-114](supabase/crm-schema.sql#L22)

Все 5 CRM-таблиц имеют политику:
```sql
CREATE POLICY "Allow all for authenticated" ON crm_clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
CRM живёт в **той же базе Supabase, что и сайт thefurry.store**. Любой зарегистрированный пользователь сайта (роль `authenticated`) может через публичный REST API Supabase (anon key виден в браузере) **читать и изменять**: всех клиентов CRM (имена, telegram, email), все заказы, все платежи с реквизитами в комментариях, все расходы студии. Middleware защищает только страницы CRM, но не сам REST API.

**Фикс:** заменить политики на проверку роли владельца, например:
```sql
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'))
```

### 3. CHECK-констрейнт `payment_method` не совпадает с кодом приложения
**Файл:** [supabase/crm-schema.sql:80-81](supabase/crm-schema.sql#L80) vs [components/crm/modals/create-payment-modal.tsx:85-93](components/crm/modals/create-payment-modal.tsx#L85)

Схема разрешает только `('card', 'transfer', 'crypto', 'paypal', 'other')`, а приложение вставляет `card_ua`, `card_ru`, `card_eu`, `card_other`. Если констрейнт в проде не был обновлён отдельной миграцией (в репозитории её нет) — **каждое добавление платежа картой падает с ошибкой БД**. Проверить в проде:
```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'crm_payments'::regclass AND contype = 'c';
```

### 4. Схема в репозитории отстала от продакшена (schema drift)
**Файл:** [supabase/crm-schema.sql](supabase/crm-schema.sql)

В коде используются, но в схеме отсутствуют: `crm_clients.profile_id`, `crm_clients.total_spent`, таблица `crm_hidden_transactions`, триггер синхронизации `total_spent` (упомянут в комментарии types/crm.ts:81), предполагаемый триггер пересчёта `crm_orders.paid` из платежей (текст подтверждения удаления на странице транзакций обещает «Сумма будет вычтена из оплаченного»). Базу нельзя воспроизвести из репозитория, а поведение триггеров невозможно проверить по коду.

### 5. Возможный двойной учёт `paid` при создании заказа с оплатой и при переносе
**Файлы:** [components/crm/modals/create-order-modal.tsx:118-149](components/crm/modals/create-order-modal.tsx#L118), [components/crm/modals/refund-transfer-modal.tsx:113-123](components/crm/modals/refund-transfer-modal.tsx#L113)

Если в проде существует триггер «платёж → orders.paid += amount» (см. п.4), то:
- **Создание заказа** с «Оплачено = X» вставляет заказ с `paid = X` **и** создаёт платёж на X → триггер добавит ещё X → `paid = 2X`.
- **Перенос оплаты**: код вручную делает `paid += num` на заказе-назначении **и** создаёт платёж на num → триггер добавит ещё num.

Если триггера нет — наоборот: «Добавить платёж» из карточки заказа не увеличивает `paid` вообще, а удаление платежа не вычитает. Любой из двух вариантов — баг. **Проверить триггеры:**
```sql
SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid IN ('crm_payments'::regclass, 'purchases'::regclass) AND NOT tgisinternal;
```

### 6. Инъекция в фильтр PostgREST в глобальном поиске
**Файл:** [lib/crm/api.ts:545-558](lib/crm/api.ts#L545)

```ts
const ordersFilter = `project_name.ilike.%${query}%,...`
supabase.from('crm_orders').select(...).or(ordersFilter)
```
Пользовательский ввод вставляется в строку `.or()` без экранирования. Запятая, скобка или `,status.eq.x` в строке поиска ломают фильтр или изменяют его логику (PostgREST filter injection). С учётом политики «allow all» (п.2) это не даёт эскалации, но поиск падает на легитимных запросах с запятыми. **Фикс:** экранировать `%`, `,`, `(`, `)` или использовать отдельные `.ilike()`-запросы.

### 7. После «Отметить завершённым» из карточки заказа пропадают клиент и услуга
**Файл:** [app/(crm)/orders/[id]/page.tsx:146-153](app/(crm)/orders/[id]/page.tsx#L146)

```ts
const updated = await updateCRMOrder(order.id, { status: 'completed' })
setOrder(updated)
```
`updateCRMOrder` делает `.select().single()` **без join'ов** `client`/`service`. После клика блок «Клиент» показывает «Клиент не указан», услуга — «—», до перезагрузки страницы. Тот же паттерн в `handleSave` карточки клиента безопасен (там нет join-полей в рендере с зависимостью), но в заказе — виден сразу. **Фикс:** `setOrder({ ...updated, client: order.client, service: order.service })` или перезагрузить через `loadOrder()`.

### 8. Колонка «Заказов» в списке клиентов всегда показывает 0
**Файл:** [app/(crm)/clients/page.tsx:372](app/(crm)/clients/page.tsx#L372)

```tsx
<SensitiveValue>{String(client.orders?.length ?? 0)}</SensitiveValue>
```
`getClients()` ([lib/crm/api.ts:13-26](lib/crm/api.ts#L13)) делает `select('*')` без join'а заказов — `client.orders` всегда `undefined`. Колонка всегда `0`. **Фикс:** join с подсчётом (`crm_orders(count)`) или маппинг из кешированных `getOrders()`.

---

## 🟡 Важные улучшения (нужно исправить)

### 9. Необработанные промисы в обработчиках действий (28 async-хендлеров, часть без catch)
Без `try/catch` — при ошибке: unhandled promise rejection, никакого фидбека пользователю, состояние не сбрасывается:
- [app/(crm)/orders/[id]/page.tsx:139-144](app/(crm)/orders/[id]/page.tsx#L139) — `handleDelete` (нет catch вовсе)
- [app/(crm)/orders/[id]/page.tsx:146-153](app/(crm)/orders/[id]/page.tsx#L146) — `handleComplete` (finally есть, catch нет → rejection)
- [app/(crm)/orders/[id]/page.tsx:155-166](app/(crm)/orders/[id]/page.tsx#L155) — `handlePaymentCreated`
- [app/(crm)/transactions/page.tsx:320-341](app/(crm)/transactions/page.tsx#L320) — `handleDelete`, `handleHide`, `handleUnhide`
- [components/crm/sidebar.tsx:38-42](components/crm/sidebar.tsx#L38) — `handleLogout`
- [app/login/page.tsx:92-112](app/login/page.tsx#L92) — `handleSubmit`: сетевой сбой `signInWithPassword` бросит исключение → кнопка навсегда зависнет в «Входим...»
- [app/login/page.tsx:116-132](app/login/page.tsx#L116) — OAuth: результат `signInWithOAuth` не проверяется, ошибка не показывается

### 10. ESC закрывает модалки в обход подтверждения несохранённых изменений
**Все 11 модалок** (например [components/crm/modals/create-order-modal.tsx:99-104](components/crm/modals/create-order-modal.tsx#L99)):
```ts
const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
```
Кнопка X вызывает `handleClose(fields, onClose)` с диалогом подтверждения, а ESC — `onClose()` напрямую: заполненная форма теряется без предупреждения. **Фикс:** в ESC-хендлере тоже вызывать `handleClose`.

### 11. `useUnsavedChanges` в edit-модалках срабатывает всегда
**Файл:** [hooks/useUnsavedChanges.ts:6-10](hooks/useUnsavedChanges.ts#L6)

`hasChanges` проверяет «есть ли непустые поля», а не «изменились ли поля относительно начальных». В edit-модалках (заказ, клиент, расход, услуга) поля **предзаполнены** → закрытие нетронутой формы всегда показывает «Несохранённые изменения». **Фикс:** сравнивать снапшот начальных значений с текущими.

### 12. Middleware: запрос роли в БД на каждый запрос
**Файл:** [middleware.ts:55-69](middleware.ts#L55)

На каждый matched-запрос (включая все API-роуты и переходы) выполняется `select role from profiles` — лишний round-trip ~50-100мс на каждый переход. **Фикс:** класть роль в JWT (custom claims через Auth Hook) или кешировать в cookie с коротким TTL.

### 13. Транзакции сайта грузятся целиком без пагинации и без кеша
**Файл:** [app/(crm)/transactions/page.tsx:239-250](app/(crm)/transactions/page.tsx#L239)

`balance_transactions` и `purchases` выбираются полностью (`select('*')` без `.limit()` / `.range()`), при каждом заходе на страницу и после каждого hide/delete (`loadAll()`). Пагинация — только клиентская. С ростом данных страница будет грузиться секундами. **Фикс:** серверная пагинация или хотя бы `.limit(500)` + кеш через `lib/crm/cache`.

### 14. Refund/Transfer — неатомарные мультишаговые мутации
**Файл:** [components/crm/modals/refund-transfer-modal.tsx:86-93, 114-123](components/crm/modals/refund-transfer-modal.tsx#L86)

Возврат = 2 запроса (update paid + insert expense), перенос = 3 запроса. Ошибка между шагами оставляет данные в неконсистентном состоянии (paid уменьшен, расход не создан). **Фикс:** RPC-функция Postgres, выполняющая операцию в одной транзакции.

### 15. Возможный двойной учёт дохода в KPI транзакций
**Файл:** [app/(crm)/transactions/page.tsx:94-124, 297-301](app/(crm)/transactions/page.tsx#L94)

Пополнение баланса на сайте (`balance_transaction`, flow=income) **и** покупка с этого баланса (`purchase`, flow=income) оба считаются доходом → KPI «Доход» удваивает каждую покупку через баланс. Если так задумано — ок, но похоже на логическую ошибку.

### 16. `getDashboardStats`: мёртвый код и фантомный кеш-ключ
**Файл:** [lib/crm/api.ts:458-468](lib/crm/api.ts#L458)

- `Promise.all` получает 4 промиса, деструктурируется 3 — результат `getHiddenTransactions()` выбрасывается (но запрос выполняется).
- `const visiblePayments = payments.filter(() => true)` — бессмысленный проход по массиву.
- Все мутации инвалидируют ключ `'dashboard'`, но `setCached('dashboard', ...)` нигде не вызывается — инвалидация no-op (работает только через инвалидацию orders/payments/expenses).

### 17. Приватный режим (blur) протекает на странице аналитики
**Файл:** [app/(crm)/analytics/page.tsx:808, 509, 521, 666](app/(crm)/analytics/page.tsx#L808)

В таблице «Платежи за период» сумма `+{formatMoney(p.amount)}` не обёрнута в `SensitiveValue`/`.crm-sensitive`. Аналогично: тултипы pie-чартов (строки 509, 666) и легенда «Распределение расходов» (строка 521). При включённом режиме «Скрыть» эти суммы остаются видимыми.

### 18. Нет error-состояния на половине страниц
`catch (e) { console.error(e) }` без отображения ошибки пользователю — при сбое страница вечно показывает пустую таблицу/нули:
- [app/(crm)/dashboard/page.tsx:89-94](app/(crm)/dashboard/page.tsx#L89)
- [app/(crm)/finance/page.tsx:104-111](app/(crm)/finance/page.tsx#L104)
- [app/(crm)/expenses/page.tsx:108-113](app/(crm)/expenses/page.tsx#L108)
- [app/(crm)/services/page.tsx:154-159](app/(crm)/services/page.tsx#L154)
- [app/(crm)/analytics/page.tsx:262-268](app/(crm)/analytics/page.tsx#L262)
- [app/(crm)/transactions/page.tsx:257-258](app/(crm)/transactions/page.tsx#L257)

А карточки заказа/клиента при **любой** ошибке (включая сетевую) показывают «404 не найден» ([orders/[id]/page.tsx:133](app/(crm)/orders/[id]/page.tsx#L133), [clients/[id]/page.tsx:294-295](app/(crm)/clients/[id]/page.tsx#L294)) — вводит в заблуждение.

### 19. Страница настроек полностью декоративная
**Файл:** [app/(crm)/settings/page.tsx](app/(crm)/settings/page.tsx)

Все три вкладки — макеты: «Сохранить» ничего не делает (`SaveBtn` без onClick), данные профиля захардкожены («Админ», admin@thefurry.store), смена пароля не работает, «Активные сессии» — фейковые («Киев», «Москва»), «Завершить все сессии» — пустая кнопка. Пользователь думает, что сохранил — и теряет данные. Либо реализовать, либо скрыть страницу.

### 20. Крэш на клиенте с пустым именем
`name[0].toUpperCase()` упадёт с `Cannot read properties of undefined`, если `name === ''` (валидации на пустые строки после `.trim()` нет только на UI; в БД `name TEXT NOT NULL` пустую строку пропустит):
- [app/(crm)/clients/page.tsx:70](app/(crm)/clients/page.tsx#L70) (Avatar)
- [app/(crm)/orders/[id]/page.tsx:274](app/(crm)/orders/[id]/page.tsx#L274)
- [app/(crm)/clients/[id]/page.tsx:412](app/(crm)/clients/[id]/page.tsx#L412)
- [components/crm/combobox-client.tsx:23](components/crm/combobox-client.tsx#L23)

(в topbar.tsx:201 сделано правильно: `name[0]?.toUpperCase() ?? '?'`)

### 21. `formatDate` сдвигает дату для DATE-полей в западных таймзонах
**Файл:** [lib/crm/helpers.ts:72-75](lib/crm/helpers.ts#L72)

`new Date('2026-06-10')` парсится как UTC-полночь; `getDate()` в таймзоне UTC-x вернёт **9 июня**. Для пользователей в UTC+2/+3 работает, но это мина. Также `getPaymentStatus` ([helpers.ts:83](lib/crm/helpers.ts#L83)): при `amount === 0 && paid > 0` показывает «Не оплачен», хотя деньги получены.

---

## 🟢 Оптимизации (желательно)

### 22. Дублирование констант в 6+ местах
- `STATUS_COLORS`/`ORDER_STATUS_COLORS` определены в [helpers.ts:54](lib/crm/helpers.ts#L54), [clients/[id]/page.tsx:26](app/(crm)/clients/[id]/page.tsx#L26), [topbar.tsx:12](components/crm/topbar.tsx#L12)
- `METHOD_COLORS` — в [finance/page.tsx:20](app/(crm)/finance/page.tsx#L20) и [orders/[id]/page.tsx:44](app/(crm)/orders/[id]/page.tsx#L44)
- `EXPENSE_LABELS` в [analytics/page.tsx:51](app/(crm)/analytics/page.tsx#L51) дублирует `EXPENSE_CATEGORY_LABELS` из helpers
- `ORDER_STATUS_LABELS` существует и в `types/crm.ts`, и в `lib/crm/helpers.ts` (импортируется то оттуда, то отсюда)
- `METHOD_LABELS` создаётся **внутри map-цикла** ([analytics/page.tsx:799](app/(crm)/analytics/page.tsx#L799)) — новый объект на каждую строку
- локальный `formatDate` копипастится в [clients/page.tsx:133](app/(crm)/clients/page.tsx#L133) и [clients/[id]/page.tsx:103](app/(crm)/clients/[id]/page.tsx#L103)
- Компоненты `OrderStatusBadge`, `ActionButton`, `Skel`, `F`/`fs`/`ta`/`lb` + фокус-хендлеры скопированы в 8+ файлов — вынести в общие компоненты

**Эффект:** −30% объёма кода страниц, единая точка изменения дизайна.

### 23. Мёртвый код
- [components/crm/orders-table.tsx](components/crm/orders-table.tsx) — **не импортируется нигде** (240 строк); вдобавок в нём кнопка «Удалить» без обработчика и `EditOrderModal` с `order={null}`
- [app/(crm)/dashboard/page.tsx:44-45](app/(crm)/dashboard/page.tsx#L44) — `thStyle` внутри `OrderRow` создаётся и сразу `void thStyle`
- [app/(crm)/finance/page.tsx:100-102](app/(crm)/finance/page.tsx#L100) — `hiddenPurchaseIds`/`hiddenBtxIds` вычисляются и `void`-ятся (а `getHiddenTransactions()` при этом грузится)
- `ServiceOrder` в [types/crm.ts:141](types/crm.ts#L141) — помечен legacy

### 24. Фильтрация/сортировка без useMemo на каждом рендере
- [app/(crm)/orders/page.tsx:133-166](app/(crm)/orders/page.tsx#L133) — `filtered` + spread-sort на каждый рендер (включая ховеры состояний модалок); `STATUS_PRIORITY` пересоздаётся
- [app/(crm)/clients/page.tsx:167-181](app/(crm)/clients/page.tsx#L167)
- [app/(crm)/expenses/page.tsx:124-147](app/(crm)/expenses/page.tsx#L124)
- [app/(crm)/transactions/page.tsx:107,122](app/(crm)/transactions/page.tsx#L107) — `hidden.some()` внутри forEach → O(n·m); собрать `Set` ключей

**Эффект:** заметно на 500+ записях. (Аналитика, наоборот, образцово мемоизирована.)

### 25. `onSuccess={loadAll}` после модалок перезапускает полный скелетон
[app/(crm)/orders/page.tsx:100-107](app/(crm)/orders/page.tsx#L100) — `loadAll` ставит `setLoading(true)` → после каждого создания/редактирования таблица мигает скелетоном, хотя данные уже в кеше. **Фикс:** не включать loading при рефреше, обновлять данные тихо.

### 26. Карточка клиента: водопад запросов
[app/(crm)/clients/[id]/page.tsx:268-301](app/(crm)/clients/[id]/page.tsx#L268) — сначала ждём clients+orders+payments, потом **последовательно** site-данные (транзакции, покупки, профиль). Site-запросы зависят только от `profile_id` клиента — можно стартовать сразу после нахождения клиента, не блокируя первый рендер (или показывать CRM-часть раньше).

### 27. Кеш отдаёт мутабельные ссылки
[lib/crm/cache.ts:12-20](lib/crm/cache.ts#L12) — `getCached` возвращает тот же массив, что лежит в кеше. Любая случайная мутация (`.sort()` без spread и т.п.) портит кеш для всех страниц. Сейчас все вызовы аккуратны, но защиты нет. Дёшево: возвращать `structuredClone` для маленьких ключей или зафиксировать договорённость «никогда не мутировать».

### 28. Поиск в топбаре: гонка ответов
[components/crm/topbar.tsx:58-70](components/crm/topbar.tsx#L58) — debounce есть, но in-flight запрос от предыдущего query может завершиться **после** нового и перезаписать результаты устаревшими. Фикс: флаг отмены в cleanup эффекта.

### 29. Индексы — проверить фактическое состояние в проде
`supabase/add-indexes.sql` и `add-profile-id-to-orders.sql` требуют ручного запуска — проверить, применены ли:
```sql
SELECT schemaname, tablename, indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'crm_%' ORDER BY tablename;

SELECT tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'crm_%' ORDER BY tablename;

SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'crm_%'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```
(`pg_stat_statements` в Supabase доступен через Dashboard → Database → Query Performance.)

---

## 💡 Идеи для улучшения UX

1. **Заменить `window.confirm`/`alert` (10 мест) на стилизованный диалог** — нативные диалоги выбиваются из дизайна и блокируют поток; `ConfirmCloseModal` уже есть, сделать аналогичный `ConfirmDeleteModal`. Файлы: orders, clients, expenses, services, transactions, orders/[id].
2. **Заголовок «Транзакции» в топбаре** — в `pageTitles` ([topbar.tsx:35-44](components/crm/topbar.tsx#L35)) нет ключа `/transactions`, на странице транзакций топбар показывает «CRM».
3. **Пустое состояние транзакций не учитывает фильтры** ([transactions/page.tsx:475](app/(crm)/transactions/page.tsx#L475)) — при активных фильтрах пишет «Транзакций пока нет» вместо «Ничего не найдено» (на других страницах сделано правильно).
4. **После создания клиента из ComboboxClient он не выбирается автоматически** ([combobox-client.tsx:197-204](components/crm/combobox-client.tsx#L197)) — пользователь создал клиента и должен искать его в списке заново.
5. **Сортировка таблиц по клику на заголовок** — нигде нет; особенно нужна заказам (сумма, дедлайн) и клиентам (сумма заказов).
6. **Пагинация заказов/клиентов** — таблицы рендерят все записи; у транзакций пагинация есть, у остальных нет.
7. **Тосты успеха** — после создания/редактирования нет подтверждения «Сохранено», только закрытие модалки.
8. **Footer «Показано X из X платежей»** на финансах ([finance/page.tsx:268-274](app/(crm)/finance/page.tsx#L268)) бесполезен — фильтров на странице нет, числа всегда равны.
9. **«Интересная статистика»** на аналитике рендерит 5 карточек в сетке на 6 — последняя ячейка пустует.
10. **Возврат не виден в истории заказа** — refund создаёт только expense; в карточке заказа платежи остаются без отметки о возврате.
11. **Email-валидация** в формах клиента — поле `type="email"`, но сабмит идёт без проверки формата (модалки сабмитятся кнопкой, не submit формы — браузерная валидация не срабатывает).
12. **Модалки не блокируют скролл body** и закрываются кликом... на самом деле клик по overlay «съеден» (`onClick={e => e.stopPropagation()}` на overlay) — поведение соответствует требованию «закрывать только по X», но скролл фона под модалкой остаётся активным.

---

## 📊 Статистика кода

| Метрика | Значение |
|---|---|
| Файлов .ts/.tsx (app/components/lib/hooks/types) | 52 |
| Ошибок компиляции TypeScript | **1** (блокирует build) |
| Использований `any` | 9 (clients/[id] — 4, transactions — 5) |
| `console.error`/`console.log` вместо UI-ошибок | 8 |
| `window.confirm` / `alert` | 10 |
| async-хендлеров действий (часть без try/catch) | 28 |
| `eslint-disable react-hooks/exhaustive-deps` | 1 ([create-payment-modal.tsx:162](components/crm/modals/create-payment-modal.tsx#L162)) |
| `dangerouslySetInnerHTML` | 0 ✅ |
| Захардкоженных секретов | 0 ✅ (ключи только в .env) |
| Мёртвых файлов | 1 (orders-table.tsx, 240 строк) |
| ESLint | не настроен (нет eslint.config) |

---

## ✅ Что работает хорошо

1. **Кеш-слой** ([lib/crm/cache.ts](lib/crm/cache.ts)) — простой и корректный: TTL 30с, префиксная инвалидация, инвалидация присутствует во **всех** мутациях API без исключений (проверено по всем 17 write-функциям).
2. **Prefetch + NavigationLoader** ([components/crm/crm-client-providers.tsx](components/crm/crm-client-providers.tsx)) — данные греются при входе в CRM, переходы между страницами мгновенные из кеша.
3. **Модалки**: единый паттерн — сброс состояния при `open`, loading на кнопке сабмита, отображение ошибок в форме, `useUnsavedChanges` подключён везде, закрытие только по X/Отмене (overlay не закрывает).
4. **Аналитика** — образцовая мемоизация (`useMemo` на каждом производном значении), грамотные пустые состояния чартов.
5. **Оптимистичный toggle услуг с откатом** ([services/page.tsx:165-174](app/(crm)/services/page.tsx#L165)) — правильный паттерн.
6. **Middleware** — проверка и аутентификации, и роли owner с принудительным signOut; matcher корректно исключает статику.
7. **Скелетоны** — на всех страницах, повторяют структуру контента.
8. **Privacy mode** — продуманная система blur через CSS-атрибут + `SensitiveValue`, с постепенным «подглядыванием» по hover/active.
9. **Страница транзакций** — настоящая пагинация с ellipsis, сброс страницы при смене фильтров, унификация 4 источников данных.
10. **Suspense-обёртки** для `useSearchParams` (login, topbar) — сделано правильно для Next.js App Router.
11. **TypeScript** — реальных `any` всего 9 на 52 файла, типы entity-слоя полные.
12. **Empty states** с CTA-кнопками и различием «нет данных» / «ничего не найдено» (кроме транзакций, п. UX-3).

---

## Приоритет работ

1. **Сегодня:** п.1 (сломан build), п.3 (платежи картой могут не сохраняться — проверить), п.2 (RLS — утечка данных).
2. **На этой неделе:** п.5 (проверить триггеры paid), п.4 (актуализировать схему в репо), п.7, п.8, п.10, п.9 (login/handleComplete).
3. **Следующая итерация:** остальное из 🟡, затем 🟢 и UX.

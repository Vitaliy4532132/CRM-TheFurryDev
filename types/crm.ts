// ─── Order statuses ──────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'discussion'
  | 'waiting_payment'
  | 'in_progress'
  | 'review'
  | 'revision'
  | 'done'
  | 'completed'
  | 'cancelled'

export type PaymentMethod =
  | 'card_ua'
  | 'card_ru'
  | 'card_eu'
  | 'card_other'
  | 'transfer'
  | 'crypto'
  | 'paypal'
  | 'other'

export type ExpenseCategory =
  | 'ads'
  | 'hosting'
  | 'domain'
  | 'plugins'
  | 'salary'
  | 'commission'
  | 'refund'
  | 'other'

// ─── Display maps ────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new:             'Новый',
  discussion:      'Обсуждение',
  waiting_payment: 'Ожидает оплату',
  in_progress:     'В работе',
  review:          'На проверке',
  revision:        'Правки',
  done:            'Готово',
  completed:       'Завершён',
  cancelled:       'Отменён',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card_ua:    '🇺🇦 Карта UA',
  card_ru:    '🇷🇺 Карта RU',
  card_eu:    '🇪🇺 Карта EU',
  card_other: '🌍 Карта (другая)',
  transfer:   'Перевод',
  crypto:     'Крипта',
  paypal:     'PayPal',
  other:      'Другое',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ads:        'Реклама',
  hosting:    'Хостинг',
  domain:     'Домен',
  plugins:    'Плагины',
  salary:     'Зарплата',
  commission: 'Комиссия',
  refund:     'Возврат',
  other:      'Другое',
}

// ─── Entities ────────────────────────────────────────────────────────────────

export interface CRMClient {
  id:          string
  name:        string
  telegram:    string | null
  discord:     string | null
  email:       string | null
  country:     string | null
  note:        string | null
  profile_id:  string | null   // linked to profiles.id (auto-sync from site)
  total_spent: number          // sum of purchases from site (via trigger)
  created_at:  string
  // joined
  orders?: CRMOrder[]
}

export interface CRMService {
  id:          string
  name:        string
  description: string | null
  min_price:   number
  is_active:   boolean
  created_at:  string
}

export interface CRMOrder {
  id:           string
  order_number: number
  client_id:    string | null
  service_id:   string | null
  project_name: string
  description:  string | null
  amount:       number
  paid:         number
  deadline:     string | null
  status:       OrderStatus
  comment:      string | null
  created_at:   string
  updated_at:   string
  // joined
  client?:  CRMClient
  service?: CRMService
}

export interface CRMPayment {
  id:             string
  order_id:       string | null
  client_id:      string | null
  amount:         number
  payment_method: PaymentMethod | null
  payment_date:   string
  comment:        string | null
  created_at:     string
  // joined
  order?:  CRMOrder
  client?: CRMClient
}

export interface CRMExpense {
  id:         string
  name:       string
  category:   ExpenseCategory
  amount:     number
  date:       string
  comment:    string | null
  created_at: string
}

// ─── ServiceOrder kept for legacy reference only — no longer used ─────────────

export interface ServiceOrder {
  id:            string
  order_number:  number | null
  service_title: string | null
  telegram:      string | null
  discord:       string | null
  source:        string | null
  budget:        string | null
  budget_int:    number | null
  description:   string | null
  status:        string
  created_at:    string
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders:      number
  activeOrders:     number
  completedOrders:  number
  newOrders:        number
  monthIncome:      number
  monthExpense:     number
  monthProfit:      number
  totalDebt:          number
  recentOrders:       CRMOrder[]
  upcomingDeadlines:  CRMOrder[]
}

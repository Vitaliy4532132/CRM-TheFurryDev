'use client'

import { createClient } from '@/lib/supabase/client'
import { getCached, setCached, invalidateCache } from './cache'
import type {
  CRMClient, CRMOrder, CRMPayment,
  CRMExpense, CRMService,
  DashboardStats,
} from '@/types/crm'

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function getClients(): Promise<CRMClient[]> {
  const cached = getCached<CRMClient[]>('clients')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  const result = data ?? []
  setCached('clients', result)
  return result
}

export async function getClientById(id: string): Promise<CRMClient> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCRMClient(
  input: Omit<CRMClient, 'id' | 'created_at' | 'orders' | 'profile_id' | 'total_spent'>,
): Promise<CRMClient> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_clients')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  invalidateCache('clients', 'dashboard')
  return data
}

export async function updateCRMClient(
  id: string,
  input: Partial<Omit<CRMClient, 'id' | 'created_at' | 'orders' | 'profile_id' | 'total_spent'>>,
): Promise<CRMClient> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidateCache('clients')
  return data
}

export async function deleteCRMClient(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_clients')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('clients', 'dashboard')
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export async function getServices(): Promise<CRMService[]> {
  const cached = getCached<CRMService[]>('services')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_services')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  const result = data ?? []
  setCached('services', result)
  return result
}

export async function createCRMService(
  input: Omit<CRMService, 'id' | 'created_at'>,
): Promise<CRMService> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_services')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  invalidateCache('services')
  return data
}

export async function updateCRMService(
  id: string,
  input: Partial<Omit<CRMService, 'id' | 'created_at'>>,
): Promise<CRMService> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_services')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidateCache('services')
  return data
}

export async function deleteCRMService(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_services')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('services')
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export async function getOrders(): Promise<CRMOrder[]> {
  const cached = getCached<CRMOrder[]>('orders')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_orders')
    .select(`
      *,
      client:crm_clients(*),
      service:crm_services(*)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  const result = data ?? []
  setCached('orders', result)
  return result
}

export async function getOrderById(id: string): Promise<CRMOrder> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_orders')
    .select(`
      *,
      client:crm_clients(*),
      service:crm_services(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getOrdersByClient(clientId: string): Promise<CRMOrder[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_orders')
    .select('*, service:crm_services(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCRMOrder(
  input: Omit<CRMOrder, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'client' | 'service' | 'profile_id'>
    & { order_number?: number },
): Promise<CRMOrder> {
  const supabase = createClient()

  // Auto-resolve profile_id from the linked client
  let profile_id: string | null = null
  if (input.client_id) {
    const { data: client } = await supabase
      .from('crm_clients')
      .select('profile_id')
      .eq('id', input.client_id)
      .single()
    profile_id = client?.profile_id ?? null
  }

  const { data, error } = await supabase
    .from('crm_orders')
    .insert({ ...input, profile_id })
    .select()
    .single()
  if (error) throw error
  invalidateCache('orders', 'dashboard')
  return data
}

export async function updateCRMOrder(
  id: string,
  input: Partial<Omit<CRMOrder, 'id' | 'order_number' | 'created_at' | 'client' | 'service' | 'profile_id'>>,
): Promise<CRMOrder> {
  const supabase = createClient()

  // If client_id is being changed, re-resolve profile_id
  let extraFields: { profile_id?: string | null } = {}
  if ('client_id' in input) {
    let profile_id: string | null = null
    if (input.client_id) {
      const { data: client } = await supabase
        .from('crm_clients')
        .select('profile_id')
        .eq('id', input.client_id)
        .single()
      profile_id = client?.profile_id ?? null
    }
    extraFields = { profile_id }
  }

  const { data, error } = await supabase
    .from('crm_orders')
    .update({ ...input, ...extraFields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidateCache('orders', 'dashboard')
  return data
}

export async function deleteCRMOrder(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_orders')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('orders', 'dashboard')
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<CRMPayment[]> {
  const cached = getCached<CRMPayment[]>('payments')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_payments')
    .select(`
      *,
      order:crm_orders(id, order_number, project_name),
      client:crm_clients(id, name)
    `)
    .order('payment_date', { ascending: false })
  if (error) throw error
  const result = data ?? []
  setCached('payments', result)
  return result
}

// ─── SITE DATA (balance_transactions, purchases, profiles) ───────────────────

export type BalanceTx = {
  id:          string
  user_id:     string
  type:        string
  amount:      number
  description: string | null
  created_at:  string
}

export type SitePurchase = {
  id:         string
  user_id:    string
  amount:     number
  created_at: string
  product:    { id: string; name: string; price: number; slug: string } | null
}

export type SiteProfile = {
  balance:  number
  nickname: string
}

export async function getClientTransactions(profileId: string): Promise<BalanceTx[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getClientPurchases(profileId: string): Promise<SitePurchase[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('*, product:products(id, name, price, slug)')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SitePurchase[]
}

export async function getSiteProfile(profileId: string): Promise<SiteProfile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('balance, nickname')
    .eq('id', profileId)
    .single()
  return data
}

// Все сайтовые транзакции/покупки для страницы /transactions.
// Кешируются (TTL 30с) и ограничены последними 1000 записей.
export type SiteBalanceTx = BalanceTx & {
  profile: { nickname: string | null; telegram: string | null } | null
}

export type SitePurchaseRow = {
  id:         string
  user_id:    string
  amount:     number
  created_at: string
  product:    { name: string; slug: string } | null
  profile:    { nickname: string | null } | null
}

async function fetchProfileMap(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<Map<string, { nickname: string | null; telegram: string | null }>> {
  if (!userIds.length) return new Map()
  const { data } = await supabase
    .from('profiles')
    .select('id, nickname, telegram')
    .in('id', userIds)
  const map = new Map<string, { nickname: string | null; telegram: string | null }>()
  for (const p of data ?? []) map.set(p.id, { nickname: p.nickname ?? null, telegram: p.telegram ?? null })
  return map
}

export async function getAllSiteTransactions(): Promise<SiteBalanceTx[]> {
  const cached = getCached<SiteBalanceTx[]>('site_btx')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const rows = data ?? []
  const profileMap = await fetchProfileMap(supabase, [...new Set(rows.map((r: BalanceTx) => r.user_id))])
  const result: SiteBalanceTx[] = rows.map((r: BalanceTx) => ({ ...r, profile: profileMap.get(r.user_id) ?? null }))
  setCached('site_btx', result)
  return result
}

export async function getAllSitePurchases(): Promise<SitePurchaseRow[]> {
  const cached = getCached<SitePurchaseRow[]>('site_purchases')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('id, user_id, amount, created_at, product:products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const rows = (data ?? []) as unknown as (Omit<SitePurchaseRow, 'profile'>)[]
  const profileMap = await fetchProfileMap(supabase, [...new Set(rows.map(r => r.user_id))])
  const result: SitePurchaseRow[] = rows.map(r => ({ ...r, profile: profileMap.get(r.user_id) ?? null }))
  setCached('site_purchases', result)
  return result
}

export async function getPaymentsByClient(clientId: string): Promise<CRMPayment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_payments')
    .select('*, order:crm_orders(id, order_number, project_name)')
    .eq('client_id', clientId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPaymentsByOrder(orderId: string): Promise<CRMPayment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_payments')
    .select('*')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Сдвигает crm_orders.paid на delta. Логика paid живёт в коде —
// триггеров в БД быть не должно (см. supabase/2026-06-10-security-and-fixes.sql).
// Инкремент (а не пересчёт суммой платежей), чтобы не затирать ручные
// корректировки paid из редактирования заказа и возвратов.
async function adjustOrderPaid(orderId: string, delta: number): Promise<void> {
  const supabase = createClient()
  const { data: order, error } = await supabase
    .from('crm_orders')
    .select('paid')
    .eq('id', orderId)
    .single()
  if (error) throw error
  const paid = Math.max(0, (order?.paid ?? 0) + delta)
  const { error: updError } = await supabase
    .from('crm_orders')
    .update({ paid, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (updError) throw updError
}

export async function createCRMPayment(
  input: Omit<CRMPayment, 'id' | 'created_at' | 'order' | 'client'>,
): Promise<CRMPayment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_payments')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  if (input.order_id) await adjustOrderPaid(input.order_id, input.amount)
  invalidateCache('payments', 'orders', 'dashboard')
  return data
}

export async function deleteCRMPayment(id: string): Promise<void> {
  const supabase = createClient()
  // Запоминаем платёж до удаления, чтобы скорректировать paid заказа
  const { data: payment } = await supabase
    .from('crm_payments')
    .select('order_id, amount')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('crm_payments')
    .delete()
    .eq('id', id)
  if (error) throw error
  if (payment?.order_id) await adjustOrderPaid(payment.order_id, -payment.amount)
  invalidateCache('payments', 'orders', 'dashboard')
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<CRMExpense[]> {
  const cached = getCached<CRMExpense[]>('expenses')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_expenses')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  const result = data ?? []
  setCached('expenses', result)
  return result
}

export async function createCRMExpense(
  input: Omit<CRMExpense, 'id' | 'created_at'>,
): Promise<CRMExpense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_expenses')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  invalidateCache('expenses', 'dashboard')
  return data
}

export async function updateCRMExpense(
  id: string,
  input: Partial<Omit<CRMExpense, 'id' | 'created_at'>>,
): Promise<CRMExpense> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_expenses')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidateCache('expenses', 'dashboard')
  return data
}

export async function deleteCRMExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('expenses', 'dashboard')
}

// ─── PRODUCTS STATS ──────────────────────────────────────────────────────────

export async function getProductsStats() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      amount,
      created_at,
      product_id,
      product:products(
        id,
        name,
        price,
        slug,
        is_plugin,
        status
      )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [orders, payments, expenses] = await Promise.all([
    getOrders(),
    getPayments(),
    getExpenses(),
  ])

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalOrders     = orders.length
  const activeOrders    = orders.filter(o =>
    ['in_progress', 'review', 'revision', 'discussion'].includes(o.status)
  ).length
  const completedOrders = orders.filter(o => o.status === 'completed').length
  const newOrders       = orders.filter(o => o.status === 'new').length

  const monthPayments = payments.filter(
    p => new Date(p.payment_date) >= startOfMonth,
  )
  const monthExpenses = expenses.filter(
    e => new Date(e.date) >= startOfMonth,
  )

  const monthIncome  = monthPayments.reduce((s, p) => s + p.amount, 0)
  const monthExpense = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const monthProfit  = monthIncome - monthExpense

  const totalDebt = orders.reduce((s, o) => s + Math.max(0, o.amount - o.paid), 0)

  const recentOrders = orders.slice(0, 7)

  // Ближайшие дедлайны — активные заказы с дедлайном в следующие 7 дней
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const in7days  = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingDeadlines = orders
    .filter(o => {
      if (!o.deadline || o.status === 'completed' || o.status === 'cancelled') return false
      const dl = new Date(o.deadline)
      return dl >= today && dl <= in7days
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())

  return {
    totalOrders,
    activeOrders,
    completedOrders,
    newOrders,
    monthIncome,
    monthExpense,
    monthProfit,
    totalDebt,
    recentOrders,
    upcomingDeadlines,
  }
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────

export type SearchOrderResult = {
  id:           string
  order_number: number
  project_name: string
  status:       string
  client:       { name: string } | null
}

export type SearchClientResult = {
  id:       string
  name:     string
  telegram: string | null
  discord:  string | null
}

export async function globalSearch(
  query: string
): Promise<{ orders: SearchOrderResult[]; clients: SearchClientResult[] }> {
  if (query.length < 2) return { orders: [], clients: [] }

  const supabase = createClient()
  // Экранируем символы, ломающие синтаксис фильтра PostgREST (.or-строка)
  const safe = query.replace(/[,()%\\]/g, ' ').trim()
  if (safe.length < 2) return { orders: [], clients: [] }
  const num = parseInt(safe, 10)

  const ordersFilter = !isNaN(num)
    ? `project_name.ilike.%${safe}%,order_number.eq.${num}`
    : `project_name.ilike.%${safe}%`

  const [ordersRes, clientsRes] = await Promise.all([
    supabase
      .from('crm_orders')
      .select('id, order_number, project_name, status, client:crm_clients(name)')
      .or(ordersFilter)
      .limit(5),
    supabase
      .from('crm_clients')
      .select('id, name, telegram, discord')
      .or(`name.ilike.%${safe}%,telegram.ilike.%${safe}%,discord.ilike.%${safe}%`)
      .limit(5),
  ])

  // Supabase returns joined relations as arrays — normalize client to object | null
  const orders: SearchOrderResult[] = (ordersRes.data ?? []).map(o => ({
    id:           o.id,
    order_number: o.order_number,
    project_name: o.project_name,
    status:       o.status,
    client:       Array.isArray(o.client) ? (o.client[0] ?? null) : o.client,
  }))

  return {
    orders,
    clients: (clientsRes.data ?? []) as SearchClientResult[],
  }
}

// ─── HIDDEN TRANSACTIONS ──────────────────────────────────────────────────────

export type HiddenTransaction = {
  source_type: 'balance_transaction' | 'purchase'
  source_id:   string
}

export async function getHiddenTransactions(): Promise<HiddenTransaction[]> {
  const cached = getCached<HiddenTransaction[]>('hidden')
  if (cached) return cached

  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_hidden_transactions')
    .select('source_type, source_id')
  if (error) throw error
  const result = (data ?? []) as HiddenTransaction[]
  setCached('hidden', result)
  return result
}

export async function hideTransaction(
  sourceType: 'balance_transaction' | 'purchase',
  sourceId: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_hidden_transactions')
    .insert({ source_type: sourceType, source_id: sourceId })
  if (error) throw error
  invalidateCache('hidden')
}

export async function unhideTransaction(
  sourceType: 'balance_transaction' | 'purchase',
  sourceId: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_hidden_transactions')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
  if (error) throw error
  invalidateCache('hidden')
}

// ─── CLIENT HISTORY ───────────────────────────────────────────────────────────

export async function getClientHistory(
  clientId: string,
  profileId: string | null,
) {
  const supabase = createClient()

  const results = await Promise.all([
    supabase
      .from('crm_payments')
      .select('*, order:crm_orders(order_number, project_name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),

    supabase
      .from('crm_orders')
      .select('*, service:crm_services(name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),

    profileId
      ? supabase
          .from('balance_transactions')
          .select('*')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    profileId
      ? supabase
          .from('purchases')
          .select('*, product:products(name, slug, is_plugin)')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  return {
    payments:     results[0].data ?? [],
    orders:       results[1].data ?? [],
    transactions: results[2].data ?? [],
    purchases:    results[3].data ?? [],
  }
}

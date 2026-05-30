'use client'

import { createClient } from '@/lib/supabase/client'
import type {
  CRMClient, CRMOrder, CRMPayment,
  CRMExpense, CRMService, CRMRequest,
  DashboardStats,
} from '@/types/crm'

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function getClients(): Promise<CRMClient[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
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
  return data
}

export async function deleteCRMClient(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── SERVICES ────────────────────────────────────────────────────────────────

export async function getServices(): Promise<CRMService[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_services')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
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
  return data
}

export async function deleteCRMService(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_services')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export async function getOrders(): Promise<CRMOrder[]> {
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
  return data ?? []
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
  input: Omit<CRMOrder, 'id' | 'order_number' | 'created_at' | 'updated_at' | 'client' | 'service'>
    & { order_number?: number },
): Promise<CRMOrder> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_orders')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCRMOrder(
  id: string,
  input: Partial<Omit<CRMOrder, 'id' | 'order_number' | 'created_at' | 'client' | 'service'>>,
): Promise<CRMOrder> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_orders')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCRMOrder(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_orders')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<CRMPayment[]> {
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
  return data
}

export async function deleteCRMPayment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_payments')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function getExpenses(): Promise<CRMExpense[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_expenses')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
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
  return data
}

export async function deleteCRMExpense(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── REQUESTS (crm_requests) ─────────────────────────────────────────────────

export async function getRequests(): Promise<CRMRequest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createRequest(
  input: Omit<CRMRequest, 'id' | 'created_at'>,
): Promise<CRMRequest> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_requests')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRequest(
  id: string,
  input: Partial<Omit<CRMRequest, 'id' | 'created_at'>>,
): Promise<CRMRequest> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('crm_requests')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRequest(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_requests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateRequestStatus(
  id: string,
  status: string,
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('crm_requests')
    .update({ status })
    .eq('id', id)
  if (error) throw error
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

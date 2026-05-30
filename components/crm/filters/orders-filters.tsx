'use client'

import { Search } from 'lucide-react'

interface OrdersFiltersProps {
  search: string
  onSearch: (v: string) => void
  statusOrder: string
  onStatusOrder: (v: string) => void
  statusPayment: string
  onStatusPayment: (v: string) => void
  dateRange: string
  onDateRange: (v: string) => void
}

const inputBase: React.CSSProperties = {
  height: 38,
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border2)',
  borderRadius: 8,
  color: 'var(--crm-text)',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

export function OrdersFilters({
  search, onSearch,
  statusOrder, onStatusOrder,
  statusPayment, onStatusPayment,
  dateRange, onDateRange,
}: OrdersFiltersProps) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--crm-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Поиск по клиенту, проекту..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            ...inputBase,
            width: '100%',
            paddingLeft: 34,
            paddingRight: 12,
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
        />
      </div>

      {/* Status order */}
      <select
        value={statusOrder}
        onChange={(e) => onStatusOrder(e.target.value)}
        style={{ ...inputBase, padding: '0 12px', cursor: 'pointer', flexShrink: 0 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
      >
        <option value="">Все статусы</option>
        <option value="Новый">Новый</option>
        <option value="В обсуждении">В обсуждении</option>
        <option value="Ожидает оплату">Ожидает оплату</option>
        <option value="В работе">В работе</option>
        <option value="На проверке">На проверке</option>
        <option value="Правки">Правки</option>
        <option value="Готово">Готово</option>
        <option value="Завершён">Завершён</option>
        <option value="Отменён">Отменён</option>
      </select>

      {/* Status payment */}
      <select
        value={statusPayment}
        onChange={(e) => onStatusPayment(e.target.value)}
        style={{ ...inputBase, padding: '0 12px', cursor: 'pointer', flexShrink: 0 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
      >
        <option value="">Все</option>
        <option value="Оплачен">Оплачен</option>
        <option value="Частично">Частично</option>
        <option value="Не оплачен">Не оплачен</option>
      </select>

      {/* Date range */}
      <select
        value={dateRange}
        onChange={(e) => onDateRange(e.target.value)}
        style={{ ...inputBase, padding: '0 12px', cursor: 'pointer', flexShrink: 0 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
      >
        <option value="">Все время</option>
        <option value="today">Сегодня</option>
        <option value="week">Эта неделя</option>
        <option value="month">Этот месяц</option>
        <option value="last_month">Прошлый месяц</option>
      </select>

      <style>{`
        select option { background: var(--crm-s3); color: var(--crm-text); }
      `}</style>
    </div>
  )
}

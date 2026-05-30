'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Search, Send, Eye, Pencil, Trash2, Users, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { getClients, deleteCRMClient } from '@/lib/crm/api'
import { CreateClientModal } from '@/components/crm/modals/create-client-modal'
import { EditClientModal } from '@/components/crm/modals/edit-client-modal'
import type { CRMClient } from '@/types/crm'

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCell({ w }: { w: number | string }) {
  return (
    <div style={{
      height: 13, width: w,
      background: 'var(--crm-s3)', borderRadius: 6,
      animation: 'crm-pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--crm-border)' }}>
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--crm-s3)',
            animation: 'crm-pulse 1.5s ease-in-out infinite',
          }} />
          <SkeletonCell w={110} />
        </div>
      </td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={90} /></td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={100} /></td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={120} /></td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={60} /></td>
      <td style={{ padding: '12px 14px', textAlign: 'center' }}><SkeletonCell w={20} /></td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={70} /></td>
      <td style={{ padding: '12px 14px' }}><SkeletonCell w={80} /></td>
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--crm-s3)',
              animation: 'crm-pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      </td>
    </tr>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'var(--crm-blue-dim)', color: 'var(--crm-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {name[0].toUpperCase()}
    </div>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({
  icon: Icon, danger, title, href, onClick,
}: {
  icon: typeof Eye
  danger?: boolean
  title: string
  href?: string
  onClick?: () => void
}) {
  const style: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 6,
    background: 'var(--crm-s3)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--crm-muted)', transition: 'background 0.15s, color 0.15s',
    flexShrink: 0, textDecoration: 'none',
  }
  const enter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = danger ? 'var(--crm-red-dim)' : 'var(--crm-border2)'
    e.currentTarget.style.color      = danger ? 'var(--crm-red)'     : 'var(--crm-text)'
  }
  const leave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'var(--crm-s3)'
    e.currentTarget.style.color      = 'var(--crm-muted)'
  }
  if (href) {
    return (
      <Link href={href} title={title} style={style} onMouseEnter={enter} onMouseLeave={leave}>
        <Icon size={13} strokeWidth={1.75} />
      </Link>
    )
  }
  return (
    <button title={title} onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}>
      <Icon size={13} strokeWidth={1.75} />
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '11px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'var(--crm-muted)', textTransform: 'uppercase',
  borderBottom: '1px solid var(--crm-border2)', whiteSpace: 'nowrap',
}

const inputBase: React.CSSProperties = {
  height: 38,
  background: 'var(--crm-surface)',
  border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)',
  fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients,       setClients]       = useState<CRMClient[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingClient, setEditingClient] = useState<CRMClient | null>(null)
  const [search,        setSearch]        = useState('')
  const [sort,          setSort]          = useState('')

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getClients()
      setClients(data)
    } catch {
      setError('Не удалось загрузить клиентов')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  // ── Фильтрация и сортировка ───────────────────────────────────────────────

  const filtered = clients
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.telegram ?? '').toLowerCase().includes(q) ||
        (c.discord  ?? '').toLowerCase().includes(q) ||
        (c.email    ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru')
      return 0 // default: по дате (уже отсортировано API)
    })

  // ── Удаление ──────────────────────────────────────────────────────────────

  async function handleDelete(client: CRMClient) {
    if (!window.confirm(`Удалить клиента ${client.name}? Это действие нельзя отменить.`)) return
    try {
      await deleteCRMClient(client.id)
      setClients(prev => prev.filter(c => c.id !== client.id))
    } catch {
      alert('Не удалось удалить клиента')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            height: 38, padding: '0 16px', borderRadius: 8,
            background: 'var(--crm-blue)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <UserPlus size={15} strokeWidth={2.2} />
          Добавить клиента
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{
            position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--crm-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Поиск по имени, Telegram, Discord..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, width: '100%', paddingLeft: 34, paddingRight: 12, boxSizing: 'border-box' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ ...inputBase, padding: '0 12px', cursor: 'pointer', flexShrink: 0 }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--crm-blue)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--crm-border2)' }}
        >
          <option value="">По дате добавления</option>
          <option value="name">По имени</option>
        </select>
        <style>{`select option { background: var(--crm-s3); color: var(--crm-text); }`}</style>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '14px 16px', borderRadius: 10,
          background: 'var(--crm-red-dim)',
          color: 'var(--crm-red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border2)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--crm-s3)' }}>
              <tr>
                <th style={thStyle}>Клиент</th>
                <th style={thStyle}>Telegram</th>
                <th style={thStyle}>Discord</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Страна</th>
                <th style={thStyle}>Заказов</th>
                <th style={thStyle}>Сумма заказов</th>
                <th style={thStyle}>Дата добавления</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>

              {/* Skeleton */}
              {loading && [0,1,2,3,4].map(i => <SkeletonRow key={i} />)}

              {/* Empty state */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <Users size={48} color="var(--crm-muted)" strokeWidth={1.25} />
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--crm-text)' }}>
                        {search ? 'Ничего не найдено' : 'Клиентов пока нет'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--crm-muted)' }}>
                        {search ? 'Попробуйте изменить запрос' : 'Добавьте первого клиента'}
                      </div>
                      {!search && (
                        <button
                          onClick={() => setModalOpen(true)}
                          style={{
                            marginTop: 4, height: 36, padding: '0 16px', borderRadius: 8,
                            background: 'var(--crm-blue)', border: 'none',
                            color: '#fff', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <UserPlus size={14} strokeWidth={2.2} />
                          Добавить клиента
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && filtered.map((client, i) => (
                <tr
                  key={client.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--crm-border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--crm-surface-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={client.name} />
                      <Link
                        href={`/clients/${client.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text)', whiteSpace: 'nowrap', textDecoration: 'none' }}
                        className="crm-client-name-link"
                      >
                        {client.name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {client.telegram ? (
                      <a
                        href={`https://t.me/${client.telegram.replace('@', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--crm-blue)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        <Send size={13} strokeWidth={1.75} />
                        {client.telegram}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-purple)', whiteSpace: 'nowrap' }}>
                    {client.discord ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-muted)', whiteSpace: 'nowrap' }}>
                    {client.email ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-text)', whiteSpace: 'nowrap' }}>
                    {client.country ?? '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--crm-text)', textAlign: 'center' }}>
                    {client.orders?.length ?? 0}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {client.total_spent > 0 ? (
                      <span style={{ display:'inline-flex',alignItems:'center',gap:5,color:'var(--crm-purple)' }}>
                        <ShoppingCart size={12} strokeWidth={2}/>
                        {client.total_spent.toLocaleString('ru-RU')} ₽
                      </span>
                    ) : (
                      <span style={{ color:'var(--crm-muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--crm-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(client.created_at)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                      <ActionButton icon={Eye}    title="Карточка клиента" href={`/clients/${client.id}`} />
                      <ActionButton icon={Pencil} title="Редактировать"    onClick={() => setEditingClient(client)} />
                      <ActionButton icon={Trash2} title="Удалить"          danger onClick={() => handleDelete(client)} />
                    </div>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--crm-border2)' }}>
            <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>
              Показано {filtered.length} из {clients.length} клиентов
            </span>
          </div>
        )}
      </div>

      <CreateClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadClients}
      />
      <EditClientModal
        open={editingClient !== null}
        onClose={() => setEditingClient(null)}
        client={editingClient}
        onSuccess={() => { setEditingClient(null); loadClients() }}
      />

      <style>{`
        .crm-client-name-link:hover { color: var(--crm-blue) !important; }
        @keyframes crm-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

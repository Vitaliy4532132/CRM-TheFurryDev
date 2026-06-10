'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import { CreateClientModal } from '@/components/crm/modals/create-client-modal'
import type { CRMClient } from '@/types/crm'

interface Props {
  value: string | null
  onChange: (id: string) => void
  clients: CRMClient[]
  onClientCreated: () => void
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      background: 'var(--crm-blue-dim)', color: 'var(--crm-blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700,
    }}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export function ComboboxClient({ value, onChange, clients, onClientCreated }: Props) {
  const [open,          setOpen]          = useState(false)
  const [query,         setQuery]         = useState('')
  const [createOpen,    setCreateOpen]    = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // Имя выбранного клиента
  const selected = value ? clients.find(c => c.id === value) : null

  // Закрываем при клике снаружи
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleSelect(client: CRMClient) {
    onChange(client.id)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  function handleInputClick() {
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* ── Trigger / Input ── */}
      <div
        onClick={handleInputClick}
        style={{
          width: '100%', height: 38, boxSizing: 'border-box',
          background: 'var(--crm-s3)',
          border: `1px solid ${open ? 'var(--crm-blue)' : 'var(--crm-border2)'}`,
          borderRadius: 8, cursor: 'text',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 10px',
          transition: 'border-color 0.15s',
        }}
      >
        {open ? (
          <>
            <Search size={14} color="var(--crm-muted)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск клиента..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', fontSize: 13, color: 'var(--crm-text)',
              }}
              onClick={e => e.stopPropagation()}
            />
          </>
        ) : selected ? (
          <>
            <Avatar name={selected.name} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--crm-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selected.name}
            </span>
            <button
              onClick={handleClear}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--crm-muted)',
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <Search size={14} color="var(--crm-muted)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--crm-muted)' }}>Выберите клиента...</span>
          </>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--crm-surface)',
          border: '1px solid var(--crm-border2)',
          borderRadius: 8, zIndex: 200,
          maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>

          {/* Клиенты */}
          {filtered.length > 0 ? (
            filtered.map(client => (
              <div
                key={client.id}
                onClick={() => handleSelect(client)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  fontSize: 13, color: 'var(--crm-text)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-surface-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Avatar name={client.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client.name}
                  </div>
                  {client.telegram && (
                    <div style={{ fontSize: 11, color: 'var(--crm-muted)', marginTop: 1 }}>
                      {client.telegram}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--crm-muted)' }}>
              Ничего не найдено
            </div>
          )}

          {/* Разделитель */}
          <div style={{ borderTop: '1px solid var(--crm-border2)', margin: '4px 0' }} />

          {/* Создать нового */}
          <div
            onClick={() => { setOpen(false); setCreateOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', cursor: 'pointer',
              fontSize: 13, color: 'var(--crm-blue)', fontWeight: 500,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--crm-surface-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <UserPlus size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            Создать нового клиента
          </div>
        </div>
      )}

      {/* ── Create modal ── */}
      <CreateClientModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(created) => {
          setCreateOpen(false)
          onClientCreated()
          // Сразу выбираем созданного клиента
          onChange(created.id)
        }}
      />
    </div>
  )
}

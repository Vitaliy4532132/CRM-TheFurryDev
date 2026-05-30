'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { createRequest } from '@/lib/crm/api'
import type { CRMRequest, RequestSource, RequestStatus } from '@/types/crm'

interface CreateRequestModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (request: CRMRequest) => void
}

const fs: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const ta: React.CSSProperties = { ...fs, height: 80, padding: '10px 12px', resize: 'vertical' }
const lb: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.04em' }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}><label style={lb}>{label}</label>{children}</div>
}
function fb(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function ub(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

const EMPTY = { name: '', telegram: '', discord: '', source: 'telegram' as RequestSource, service: '', budget: '', description: '', status: 'new' as RequestStatus }

export function CreateRequestModal({ open, onClose, onSuccess }: CreateRequestModalProps) {
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (open) { setForm(EMPTY); setError(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, loading])

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Укажите имя или ник'); return }
    setLoading(true); setError(null)
    try {
      const req = await createRequest({
        name:        form.name.trim(),
        telegram:    form.telegram.trim() || null,
        discord:     form.discord.trim()  || null,
        source:      form.source,
        service:     form.service.trim()  || null,
        budget:      parseInt(form.budget || '0', 10),
        description: form.description.trim() || null,
        status:      form.status,
      })
      onSuccess(req)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при создании заявки')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div style={{ width:520,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Добавить заявку</span>
          <button onClick={onClose} disabled={loading} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="ИМЯ / НИК *">
            <input type="text" placeholder="Имя или ник клиента" value={form.name}
              onChange={e=>set('name',e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="TELEGRAM">
              <input type="text" placeholder="@username" value={form.telegram}
                onChange={e=>set('telegram',e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="DISCORD">
              <input type="text" placeholder="username" value={form.discord}
                onChange={e=>set('discord',e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="ИСТОЧНИК">
              <select value={form.source} onChange={e=>set('source',e.target.value as RequestSource)} style={fs} onFocus={fb} onBlur={ub}>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="site">Сайт</option>
                <option value="other">Другое</option>
              </select>
            </F>
            <F label="СТАТУС">
              <select value={form.status} onChange={e=>set('status',e.target.value as RequestStatus)} style={fs} onFocus={fb} onBlur={ub}>
                <option value="new">Новая</option>
                <option value="in_progress">В обработке</option>
                <option value="waiting">Ожидает ответа</option>
              </select>
            </F>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="УСЛУГА">
              <input type="text" placeholder="Разработка плагина..." value={form.service}
                onChange={e=>set('service',e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="БЮДЖЕТ (₽)">
              <input type="number" placeholder="0" min={0} value={form.budget}
                onChange={e=>set('budget',e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <F label="ОПИСАНИЕ">
            <textarea placeholder="Что хочет клиент..." value={form.description}
              onChange={e=>set('description',e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
          </F>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={onClose} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}}
            onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading ? <><Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>Сохраняем...</> : 'Добавить'}
          </button>
        </div>

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

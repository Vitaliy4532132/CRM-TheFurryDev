'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { updateRequest } from '@/lib/crm/api'
import type { CRMRequest, RequestSource, RequestStatus } from '@/types/crm'

interface EditRequestModalProps {
  request: CRMRequest | null
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

export function EditRequestModal({ request, onClose, onSuccess }: EditRequestModalProps) {
  const [name,        setName]        = useState('')
  const [telegram,    setTelegram]    = useState('')
  const [discord,     setDiscord]     = useState('')
  const [source,      setSource]      = useState<RequestSource>('telegram')
  const [service,     setService]     = useState('')
  const [budget,      setBudget]      = useState('')
  const [description, setDescription] = useState('')
  const [status,      setStatus]      = useState<RequestStatus>('new')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!request) return
    setName(request.name)
    setTelegram(request.telegram ?? '')
    setDiscord(request.discord ?? '')
    setSource(request.source)
    setService(request.service ?? '')
    setBudget(request.budget > 0 ? String(request.budget) : '')
    setDescription(request.description ?? '')
    setStatus(request.status)
    setError(null)
  }, [request])

  useEffect(() => {
    if (!request) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [request, onClose, loading])

  async function handleSubmit() {
    if (!request) return
    if (!name.trim()) { setError('Укажите имя или ник'); return }
    setLoading(true); setError(null)
    try {
      const updated = await updateRequest(request.id, {
        name:        name.trim(),
        telegram:    telegram.trim() || null,
        discord:     discord.trim()  || null,
        source,
        service:     service.trim()  || null,
        budget:      parseInt(budget || '0', 10),
        description: description.trim() || null,
        status,
      })
      onSuccess(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}
    >
      <div style={{ width:520,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Редактировать заявку</span>
          <button onClick={onClose} disabled={loading} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="ИМЯ / НИК *">
            <input type="text" value={name} onChange={e=>setName(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="TELEGRAM">
              <input type="text" placeholder="@username" value={telegram} onChange={e=>setTelegram(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="DISCORD">
              <input type="text" placeholder="username" value={discord} onChange={e=>setDiscord(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="ИСТОЧНИК">
              <select value={source} onChange={e=>setSource(e.target.value as RequestSource)} style={fs} onFocus={fb} onBlur={ub}>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="site">Сайт</option>
                <option value="other">Другое</option>
              </select>
            </F>
            <F label="СТАТУС">
              <select value={status} onChange={e=>setStatus(e.target.value as RequestStatus)} style={fs} onFocus={fb} onBlur={ub}>
                <option value="new">Новая</option>
                <option value="in_progress">В обработке</option>
                <option value="waiting">Ожидает ответа</option>
                <option value="converted">Конвертирована</option>
                <option value="rejected">Отклонена</option>
              </select>
            </F>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="УСЛУГА">
              <input type="text" value={service} onChange={e=>setService(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="БЮДЖЕТ (₽)">
              <input type="number" min={0} value={budget} onChange={e=>setBudget(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
          </div>

          <F label="ОПИСАНИЕ">
            <textarea value={description} onChange={e=>setDescription(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
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
            {loading ? <><Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>Сохраняем...</> : 'Сохранить'}
          </button>
        </div>

        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

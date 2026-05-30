'use client'

import { X, Send, MessageSquare, UserPlus } from 'lucide-react'
import { useEffect } from 'react'
import type { CRMRequest } from '@/types/crm'
import { formatDate } from '@/lib/crm/helpers'

interface ViewRequestModalProps {
  request:      CRMRequest | null
  displayNum:   number
  onClose:      () => void
  onConvert:    () => void
  onStatusChange: (id: string, status: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  new:         'Новая',
  in_progress: 'В обработке',
  waiting:     'Ожидает ответа',
  converted:   'Конвертирована',
  rejected:    'Отклонена',
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:         { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  in_progress: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  waiting:     { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  converted:   { color: 'var(--crm-green)',  bg: 'var(--crm-green-dim)' },
  rejected:    { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
}

const SOURCE_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  discord:  'Discord',
  site:     'Сайт',
  other:    'Другое',
}

const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
  telegram: { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  discord:  { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  site:     { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  other:    { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,color,background:bg,whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
      <span style={{ fontSize:11,fontWeight:600,color:'var(--crm-muted)',letterSpacing:'0.05em',textTransform:'uppercase' }}>{label}</span>
      <div style={{ fontSize:13,color:'var(--crm-text)' }}>{children}</div>
    </div>
  )
}

export function ViewRequestModal({ request, displayNum, onClose, onConvert, onStatusChange }: ViewRequestModalProps) {
  useEffect(() => {
    if (!request) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [request, onClose])

  if (!request) return null

  const statusCfg = STATUS_COLORS[request.status] ?? { color:'var(--crm-muted)',bg:'rgba(100,116,139,0.12)' }
  const sourceCfg = SOURCE_COLORS[request.source] ?? SOURCE_COLORS.other
  const sourceLabel = SOURCE_LABELS[request.source] ?? request.source
  const telegram = request.telegram ? (request.telegram.startsWith('@') ? request.telegram : `@${request.telegram}`) : null
  const discord  = request.discord  || null

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width:480,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>
              Заявка #{displayNum} — {request.name}
            </span>
            <Badge label={STATUS_LABELS[request.status] ?? request.status} color={statusCfg.color} bg={statusCfg.bg}/>
          </div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:16 }}>

          {/* Contacts */}
          <div style={{ padding:'14px 16px',background:'var(--crm-s3)',border:'1px solid var(--crm-border)',borderRadius:10,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center' }}>
            {telegram && (
              <a href={`https://t.me/${telegram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'var(--crm-blue)',textDecoration:'none' }}>
                <Send size={13} strokeWidth={1.75}/>{telegram}
              </a>
            )}
            {discord && (
              <span style={{ display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'var(--crm-purple)' }}>
                <MessageSquare size={13} strokeWidth={1.75}/>{discord}
              </span>
            )}
            {!telegram && !discord && (
              <span style={{ fontSize:13,color:'var(--crm-muted)' }}>Контакт не указан</span>
            )}
            <Badge label={sourceLabel} color={sourceCfg.color} bg={sourceCfg.bg}/>
          </div>

          {/* Details */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <Row label="Услуга">{request.service ?? '—'}</Row>
            <Row label="Бюджет">
              <span style={{ fontWeight:700,color:'var(--crm-blue)' }}>
                {request.budget > 0 ? `${request.budget.toLocaleString('ru-RU')} ₽` : '—'}
              </span>
            </Row>
            <Row label="Дата заявки">{formatDate(request.created_at)}</Row>
            <Row label="Источник"><Badge label={sourceLabel} color={sourceCfg.color} bg={sourceCfg.bg}/></Row>
          </div>

          {/* Description */}
          {request.description && (
            <div style={{ padding:'12px 14px',background:'var(--crm-s3)',border:'1px solid var(--crm-border)',borderRadius:10 }}>
              <div style={{ fontSize:11,fontWeight:600,color:'var(--crm-muted)',letterSpacing:'0.05em',textTransform:'uppercase',marginBottom:8 }}>Описание</div>
              <div style={{ fontSize:13,color:'var(--crm-muted)',lineHeight:1.6 }}>{request.description}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button
            onClick={() => onStatusChange(request.id, 'in_progress')}
            disabled={request.status === 'converted' || request.status === 'rejected'}
            style={{ height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s',opacity:request.status==='converted'||request.status==='rejected'?0.5:1 }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            В обработку
          </button>
          <button
            onClick={onConvert}
            disabled={request.status === 'converted'}
            style={{ display:'flex',alignItems:'center',gap:7,height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-green)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s',opacity:request.status==='converted'?0.5:1 }}
            onMouseEnter={e=>{if(request.status!=='converted')e.currentTarget.style.opacity='0.85'}}
            onMouseLeave={e=>{e.currentTarget.style.opacity=request.status==='converted'?'0.5':'1'}}>
            <UserPlus size={14} strokeWidth={2}/>
            {request.status === 'converted' ? 'Уже конвертирована' : 'Конвертировать в заказ'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface EditRequestModalProps {
  open: boolean
  onClose: () => void
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const taStyle: React.CSSProperties = { ...fieldStyle, height: 80, padding: '10px 12px', resize: 'vertical' }
const lbStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.04em' }

const SERVICES = ['Разработка плагина','Сборка сервера','Настройка плагинов','Разработка мода','Билдинг','Дизайн','Сайт','Discord-бот','Telegram-бот','Техподдержка']

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display:'flex',flexDirection:'column' }}><label style={lbStyle}>{label}</label>{children}</div>
}
function fb(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function ub(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

export function EditRequestModal({ open, onClose }: EditRequestModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={(e) => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ width:520,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Редактировать заявку #001</span>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="ИМЯ / НИК">
            <input type="text" defaultValue="AlphaWolf" style={fieldStyle} onFocus={fb} onBlur={ub}/>
          </F>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="TELEGRAM">
              <input type="text" defaultValue="@alphawolf" style={fieldStyle} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="DISCORD">
              <input type="text" placeholder="username#0000" style={fieldStyle} onFocus={fb} onBlur={ub}/>
            </F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="ИСТОЧНИК">
              <select style={fieldStyle} onFocus={fb} onBlur={ub} defaultValue="Telegram">
                {['Telegram','Discord','Сайт','Другое'].map(s=><option key={s}>{s}</option>)}
              </select>
            </F>
            <F label="СТАТУС">
              <select style={fieldStyle} onFocus={fb} onBlur={ub} defaultValue="Новая">
                {['Новая','В обработке','Ожидает ответа','Конвертирована','Отклонена'].map(s=><option key={s}>{s}</option>)}
              </select>
            </F>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="УСЛУГА">
              <select style={fieldStyle} onFocus={fb} onBlur={ub} defaultValue="Разработка плагина">
                {SERVICES.map(s=><option key={s}>{s}</option>)}
              </select>
            </F>
            <F label="БЮДЖЕТ (₽)">
              <input type="number" defaultValue={5000} min={0} style={fieldStyle} onFocus={fb} onBlur={ub}/>
            </F>
          </div>
          <F label="ОПИСАНИЕ">
            <textarea defaultValue="Нужен плагин для PvP сервера" style={taStyle} onFocus={fb} onBlur={ub}/>
          </F>
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={onClose} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
            Сохранить
          </button>
        </div>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}`}</style>
      </div>
    </div>
  )
}

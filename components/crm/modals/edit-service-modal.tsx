'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { updateCRMService } from '@/lib/crm/api'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { ConfirmCloseModal } from '@/components/crm/confirm-close-modal'
import type { CRMService } from '@/types/crm'

interface EditServiceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  service: CRMService | null
}

const fs: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)', fontSize: 13,
  padding: '0 12px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const ta: React.CSSProperties = { ...fs, height: 90, padding: '10px 12px', resize: 'vertical' }
const lb: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.04em' }

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display:'flex', flexDirection:'column' }}><label style={lb}>{label}</label>{children}</div>
}
function fb(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function ub(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

export function EditServiceModal({ open, onClose, onSuccess, service }: EditServiceModalProps) {
  const { showConfirm, handleClose, confirmClose, cancelClose } = useUnsavedChanges()
  const [name,       setName]       = useState('')
  const [description, setDescription] = useState('')
  const [minPrice,   setMinPrice]   = useState('')
  const [isActive,   setIsActive]   = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    if (!service) return
    setName(service.name)
    setDescription(service.description ?? '')
    setMinPrice(String(service.min_price))
    setIsActive(service.is_active)
    setError(null)
  }, [service])

  // Исходные значения — подтверждение закрытия только при реальных изменениях
  const initial = useMemo(() => service ? {
    name:        service.name,
    description: service.description ?? '',
    minPrice:    String(service.min_price),
  } : undefined, [service])

  // ESC закрывает через handleClose — с подтверждением, если есть изменения
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose({ name, description, minPrice }, onClose, initial) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, handleClose, initial, name, description, minPrice])

  async function handleSubmit() {
    if (!service) return
    if (!name.trim()) { setError('Укажите название'); return }
    setLoading(true); setError(null)
    try {
      await updateCRMService(service.id, {
        name:        name.trim(),
        description: description.trim() || null,
        min_price:   parseInt(minPrice || '0', 10),
        is_active:   isActive,
      })
      onSuccess(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить изменения')
    } finally { setLoading(false) }
  }

  if (!open) return null

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(2px)' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ width:480,maxHeight:'90vh',overflowY:'auto',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:16,display:'flex',flexDirection:'column' }}>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px',borderBottom:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)' }}>Редактировать услугу</span>
          <button onClick={() => handleClose({ name, description, minPrice }, onClose, initial)} style={{ width:30,height:30,borderRadius:8,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-red-dim)';e.currentTarget.style.color='var(--crm-red)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            <X size={15} strokeWidth={2}/>
          </button>
        </div>

        <div style={{ padding:'20px 24px',display:'flex',flexDirection:'column',gap:14 }}>
          <F label="НАЗВАНИЕ">
            <input type="text" value={name} onChange={e=>setName(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
          </F>
          <F label="ОПИСАНИЕ">
            <textarea value={description} onChange={e=>setDescription(e.target.value)} style={ta} onFocus={fb} onBlur={ub}/>
          </F>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <F label="МИН. ЦЕНА (₽)">
              <input type="number" min={0} value={minPrice} onChange={e=>setMinPrice(e.target.value)} style={fs} onFocus={fb} onBlur={ub}/>
            </F>
            <F label="СТАТУС">
              <select value={isActive ? 'active' : 'inactive'} onChange={e=>setIsActive(e.target.value==='active')} style={fs} onFocus={fb} onBlur={ub}>
                <option value="active">Активна</option>
                <option value="inactive">Неактивна</option>
              </select>
            </F>
          </div>

          {error && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
              <AlertCircle size={14} strokeWidth={2}/>{error}
            </div>
          )}
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,padding:'16px 24px',borderTop:'1px solid var(--crm-border2)',flexShrink:0 }}>
          <button onClick={() => handleClose({ name, description, minPrice }, onClose, initial)} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s' }}
            onMouseEnter={e=>{if(!loading)e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{if(!loading)e.currentTarget.style.opacity='1'}}>
            {loading && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
            {loading ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <ConfirmCloseModal isOpen={showConfirm} onConfirm={() => confirmClose(onClose)} onCancel={cancelClose}/>
    </div>
  )
}

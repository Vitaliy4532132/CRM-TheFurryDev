'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Pencil, Trash2, Layers } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getServices, updateCRMService, deleteCRMService } from '@/lib/crm/api'
import { CreateServiceModal } from '@/components/crm/modals/create-service-modal'
import { EditServiceModal } from '@/components/crm/modals/edit-service-modal'
import { formatMoney } from '@/lib/crm/helpers'
import type { CRMService } from '@/types/crm'

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={onChange} style={{
      width:36, height:20, borderRadius:10, border:'none',
      background: checked ? 'var(--crm-green)' : 'var(--crm-border2)',
      cursor:'pointer', position:'relative', transition:'background 0.2s',
      flexShrink:0, padding:0,
    }}>
      <span style={{
        position:'absolute', top:3, left: checked ? 18 : 3,
        width:14, height:14, borderRadius:'50%', background:'#fff',
        transition:'left 0.2s', display:'block',
      }}/>
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:20,display:'flex',flexDirection:'column',gap:14 }}>
      <div style={{ display:'flex',justifyContent:'space-between' }}>
        <div style={{ width:44,height:44,borderRadius:10,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ display:'flex',gap:6 }}>
          <div style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
          <div style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        <div style={{ height:16,width:'60%',background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height:13,width:'90%',background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ height:13,width:'70%',background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
      </div>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div style={{ height:13,width:70,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <div style={{ height:22,width:60,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
          <div style={{ width:36,height:20,borderRadius:10,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        </div>
      </div>
    </div>
  )
}

// ── Service card ──────────────────────────────────────────────────────────────

function CardBtn({ icon: Icon, danger, title, onClick }: {
  icon: LucideIcon; danger?: boolean; title: string; onClick?: () => void
}) {
  return (
    <button title={title} onClick={onClick} style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s',flexShrink:0 }}
      onMouseEnter={e=>{e.currentTarget.style.background=danger?'var(--crm-red-dim)':'var(--crm-border2)';e.currentTarget.style.color=danger?'var(--crm-red)':'var(--crm-text)'}}
      onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
      <Icon size={13} strokeWidth={1.75}/>
    </button>
  )
}

function ServiceCard({ service, onToggle, onEdit, onDelete }: {
  service: CRMService
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      background:'var(--crm-surface)', border:'1px solid var(--crm-border2)',
      borderRadius:12, padding:20,
      display:'flex', flexDirection:'column', gap:14,
      opacity: service.is_active ? 1 : 0.6,
      transition:'border-color 0.15s, opacity 0.2s', cursor:'default',
    }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--crm-blue-dim)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>

      {/* Top: icon + actions */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between' }}>
        <div style={{ width:44,height:44,borderRadius:10,background:'var(--crm-blue-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Layers size={22} color="var(--crm-blue)" strokeWidth={1.75}/>
        </div>
        <div style={{ display:'flex',gap:6 }}>
          <CardBtn icon={Pencil} title="Редактировать" onClick={onEdit}/>
          <CardBtn icon={Trash2} title="Удалить" danger onClick={onDelete}/>
        </div>
      </div>

      {/* Name + description */}
      <div>
        <div style={{ fontSize:14,fontWeight:700,color:'var(--crm-text)',marginBottom:6 }}>{service.name}</div>
        <div style={{
          fontSize:13, color:'var(--crm-muted)', lineHeight:1.5,
          display:'-webkit-box', WebkitLineClamp:2,
          WebkitBoxOrient:'vertical', overflow:'hidden',
        }}>
          {service.description || 'Без описания'}
        </div>
      </div>

      {/* Footer: price + status + toggle */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto' }}>
        <span style={{ fontSize:13,fontWeight:600,color:'var(--crm-blue)' }}>
          {service.min_price > 0 ? `от ${formatMoney(service.min_price)}` : 'Цена по запросу'}
        </span>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <span style={{
            display:'inline-flex', alignItems:'center',
            padding:'3px 9px', borderRadius:6,
            fontSize:11, fontWeight:600, whiteSpace:'nowrap',
            color: service.is_active ? 'var(--crm-green)' : 'var(--crm-muted)',
            background: service.is_active ? 'var(--crm-green-dim)' : 'rgba(100,116,139,0.12)',
          }}>
            {service.is_active ? 'Активна' : 'Неактивна'}
          </span>
          <Toggle checked={service.is_active} onChange={onToggle}/>
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputBase: React.CSSProperties = {
  height:38, background:'var(--crm-surface)',
  border:'1px solid var(--crm-border2)', borderRadius:8,
  color:'var(--crm-text)', fontSize:13, outline:'none',
  transition:'border-color 0.15s',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [services,       setServices]       = useState<CRMService[]>([])
  const [loading,        setLoading]        = useState(true)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [editingService, setEditingService] = useState<CRMService | null>(null)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')

  const loadServices = useCallback(async () => {
    setLoading(true)
    try { setServices(await getServices()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadServices() }, [loadServices])

  // ── Toggle активности ──────────────────────────────────────────────────────

  async function handleToggle(service: CRMService) {
    const next = !service.is_active
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: next } : s))
    try {
      await updateCRMService(service.id, { is_active: next })
    } catch {
      // Откат при ошибке
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: service.is_active } : s))
    }
  }

  // ── Удаление ──────────────────────────────────────────────────────────────

  async function handleDelete(service: CRMService) {
    if (!window.confirm(`Удалить услугу "${service.name}"? Это действие нельзя отменить.`)) return
    try {
      await deleteCRMService(service.id)
      setServices(prev => prev.filter(s => s.id !== service.id))
    } catch { alert('Не удалось удалить услугу') }
  }

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const filtered = services.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter === 'active'   && !s.is_active)  return false
    if (statusFilter === 'inactive' && s.is_active)   return false
    return true
  })

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex',justifyContent:'flex-end' }}>
        <button onClick={()=>setModalOpen(true)} style={{ display:'flex',alignItems:'center',gap:7,height:38,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'opacity 0.15s' }}
          onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}} onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
          <Plus size={15} strokeWidth={2.5}/>Добавить услугу
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display:'flex',gap:10,alignItems:'center' }}>
        <div style={{ position:'relative',flex:'1 1 240px' }}>
          <Search size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--crm-muted)',pointerEvents:'none' }}/>
          <input type="text" placeholder="Поиск по названию..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ ...inputBase,width:'100%',paddingLeft:34,paddingRight:12,boxSizing:'border-box' }}
            onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
            onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ ...inputBase,padding:'0 12px',cursor:'pointer',flexShrink:0 }}
          onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
          onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}`}</style>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
          {[0,1,2,3,4,5].map(i=><SkeletonCard key={i}/>)}
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
          {filtered.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onToggle={() => handleToggle(service)}
              onEdit={() => setEditingService(service)}
              onDelete={() => handleDelete(service)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'60px 24px',background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12 }}>
          <Layers size={48} color="var(--crm-muted)" strokeWidth={1.25}/>
          <div style={{ fontSize:15,fontWeight:600,color:'var(--crm-text)' }}>
            {search || statusFilter ? 'Ничего не найдено' : 'Услуг пока нет'}
          </div>
          <div style={{ fontSize:13,color:'var(--crm-muted)' }}>
            {search || statusFilter ? 'Попробуйте изменить фильтры' : 'Добавьте первую услугу'}
          </div>
          {!search && !statusFilter && (
            <button onClick={()=>setModalOpen(true)} style={{ marginTop:4,height:36,padding:'0 16px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6 }}>
              <Plus size={14} strokeWidth={2.5}/>Добавить услугу
            </button>
          )}
        </div>
      )}

      <CreateServiceModal open={modalOpen} onClose={()=>setModalOpen(false)} onSuccess={loadServices}/>
      <EditServiceModal
        open={editingService !== null}
        onClose={()=>setEditingService(null)}
        service={editingService}
        onSuccess={()=>{ setEditingService(null); loadServices() }}
      />
    </div>
  )
}

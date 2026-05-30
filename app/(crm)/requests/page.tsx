'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Eye, UserPlus, Inbox, BellRing, Clock, UserCheck } from 'lucide-react'
import { StatCard } from '@/components/crm/stat-card'
import { ViewRequestModal } from '@/components/crm/modals/view-request-modal'
import { ConvertRequestModal } from '@/components/crm/modals/convert-request-modal'
import { getRequests, getClients, getServices, updateRequestStatus } from '@/lib/crm/api'
import { formatDate } from '@/lib/crm/helpers'
import type { ServiceOrder, CRMClient, CRMService } from '@/types/crm'

// ── Status / source display ───────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  new:         'Новая',
  in_progress: 'В обработке',
  waiting:     'Ожидает ответа',
  converted:   'Конвертирована',
  rejected:    'Отклонена',
  done:        'Выполнена',
  discussion:  'В обсуждении',
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:         { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  in_progress: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  waiting:     { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  converted:   { color: 'var(--crm-green)',  bg: 'var(--crm-green-dim)' },
  rejected:    { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
  done:        { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  discussion:  { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
}

const SOURCE_LABELS: Record<string, string> = {
  website:  'Сайт',
  telegram: 'Telegram',
  discord:  'Discord',
}

const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
  'Сайт':     { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  'Telegram': { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  'Discord':  { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  'Другое':   { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
}

function Badge({ text, colorMap }: { text: string; colorMap: Record<string, { color: string; bg: string }> }) {
  const cfg = colorMap[text] ?? { color:'var(--crm-muted)', bg:'rgba(100,116,139,0.12)' }
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>{text}</span>
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatSkel() {
  return (
    <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'18px 20px' }}>
      <div style={{ height:12,width:100,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite',marginBottom:12 }}/>
      <div style={{ height:28,width:60,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom:'1px solid var(--crm-border)' }}>
      {[40,100,110,70,100,70,70,80].map((w,i)=>(
        <td key={i} style={{ padding:'12px 14px' }}>
          <div style={{ height:13,width:w,background:'var(--crm-s3)',borderRadius:6,animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
        </td>
      ))}
      <td style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:6 }}>
          {[0,1].map(i=><div key={i} style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',animation:'crm-pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      </td>
    </tr>
  )
}

// ── ActionButton ──────────────────────────────────────────────────────────────

function ActionButton({ icon:Icon, title, hoverColor, onClick, disabled }: {
  icon: typeof Eye; title: string; hoverColor?: 'green'; onClick?: () => void; disabled?: boolean
}) {
  const bgHover   = hoverColor === 'green' ? 'var(--crm-green-dim)' : 'var(--crm-border2)'
  const textHover = hoverColor === 'green' ? 'var(--crm-green)'     : 'var(--crm-text)'
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{ width:28,height:28,borderRadius:6,background:'var(--crm-s3)',border:'none',cursor:disabled?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--crm-muted)',transition:'background 0.15s,color 0.15s',flexShrink:0,opacity:disabled?0.4:1 }}
      onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background=bgHover;e.currentTarget.style.color=textHover}}}
      onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
      <Icon size={13} strokeWidth={1.75}/>
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding:'11px 14px', textAlign:'left',
  fontSize:11, fontWeight:600, letterSpacing:'0.06em',
  color:'var(--crm-muted)', textTransform:'uppercase',
  borderBottom:'1px solid var(--crm-border2)', whiteSpace:'nowrap',
}

const inputBase: React.CSSProperties = {
  height:38, background:'var(--crm-surface)',
  border:'1px solid var(--crm-border2)', borderRadius:8,
  color:'var(--crm-text)', fontSize:13, outline:'none',
  transition:'border-color 0.15s',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const [requests,       setRequests]       = useState<ServiceOrder[]>([])
  const [clients,        setClients]        = useState<CRMClient[]>([])
  const [services,       setServices]       = useState<CRMService[]>([])
  const [loading,        setLoading]        = useState(true)
  const [viewRequest,    setViewRequest]    = useState<ServiceOrder | null>(null)
  const [convertRequest, setConvertRequest] = useState<ServiceOrder | null>(null)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [sourceFilter,   setSourceFilter]   = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c, s] = await Promise.all([getRequests(), getClients(), getServices()])
      setRequests(r as ServiceOrder[])
      setClients(c); setServices(s)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const refreshClients = useCallback(async () => {
    const c = await getClients(); setClients(c)
  }, [])

  // ── Статус заявки ──────────────────────────────────────────────────────────

  async function handleStatusChange(id: string, status: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setViewRequest(prev => prev?.id === id ? { ...prev, status } : prev)
    try { await updateRequestStatus(id, status) }
    catch { loadAll() }
  }

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const filtered = requests.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      const contact = (r.telegram ?? '') + ' ' + (r.discord ?? '')
      if (!contact.toLowerCase().includes(q) && !(r.service_title ?? '').toLowerCase().includes(q)) return false
    }
    if (statusFilter && r.status !== statusFilter) return false
    if (sourceFilter) {
      const srcLabel = SOURCE_LABELS[(r.source ?? 'website').toLowerCase()] ?? 'Сайт'
      if (srcLabel !== sourceFilter) return false
    }
    return true
  })

  // ── Статистика ─────────────────────────────────────────────────────────────

  const total       = requests.length
  const newCount    = requests.filter(r => r.status === 'new').length
  const inProgress  = requests.filter(r => r.status === 'in_progress' || r.status === 'discussion').length
  const converted   = requests.filter(r => r.status === 'converted').length

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <style>{`@keyframes crm-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Stats ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
        {loading ? [0,1,2,3].map(i=><StatSkel key={i}/>) : (
          <>
            <StatCard label="Всего заявок"   value={total}      icon={Inbox}     iconColor="var(--crm-blue)"   iconBg="var(--crm-blue-dim)"   sub="за всё время"/>
            <StatCard label="Новые"          value={newCount}   icon={BellRing}  iconColor="var(--crm-purple)" iconBg="var(--crm-purple-dim)" sub="ожидают обработки"/>
            <StatCard label="В обработке"    value={inProgress} icon={Clock}     iconColor="var(--crm-yellow)" iconBg="var(--crm-yellow-dim)" sub="активных"/>
            <StatCard label="Конвертированы" value={converted}  icon={UserCheck} iconColor="var(--crm-green)"  iconBg="var(--crm-green-dim)"  sub="стали клиентами"/>
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
        <div style={{ position:'relative',flex:'1 1 220px',minWidth:180 }}>
          <Search size={14} style={{ position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--crm-muted)',pointerEvents:'none' }}/>
          <input type="text" placeholder="Поиск по контакту, услуге..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ ...inputBase,width:'100%',paddingLeft:34,paddingRight:12,boxSizing:'border-box' }}
            onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
            onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{ ...inputBase,padding:'0 12px',cursor:'pointer',flexShrink:0 }}
          onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
          onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>
          <option value="">Все статусы</option>
          <option value="new">Новая</option>
          <option value="in_progress">В обработке</option>
          <option value="waiting">Ожидает ответа</option>
          <option value="converted">Конвертирована</option>
          <option value="rejected">Отклонена</option>
        </select>
        <select value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}
          style={{ ...inputBase,padding:'0 12px',cursor:'pointer',flexShrink:0 }}
          onFocus={e=>{e.currentTarget.style.borderColor='var(--crm-blue)'}}
          onBlur={e=>{e.currentTarget.style.borderColor='var(--crm-border2)'}}>
          <option value="">Все источники</option>
          <option>Сайт</option>
          <option>Telegram</option>
          <option>Discord</option>
        </select>
        <style>{`select option{background:var(--crm-s3);color:var(--crm-text)}`}</style>
      </div>

      {/* ── Table ── */}
      <div>
        <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:'0 0 12px 0' }}>Заявки</h2>

        <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead style={{ background:'var(--crm-s3)' }}>
                <tr>
                  <th style={thStyle}>№</th>
                  <th style={thStyle}>Контакт</th>
                  <th style={thStyle}>Telegram</th>
                  <th style={thStyle}>Источник</th>
                  <th style={thStyle}>Услуга</th>
                  <th style={thStyle}>Бюджет</th>
                  <th style={thStyle}>Статус</th>
                  <th style={thStyle}>Дата</th>
                  <th style={{ ...thStyle,textAlign:'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading && [0,1,2,3,4].map(i=><SkeletonRow key={i}/>)}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding:'48px 24px',textAlign:'center' }}>
                      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12 }}>
                        <Inbox size={48} color="var(--crm-muted)" strokeWidth={1.25}/>
                        <div style={{ fontSize:15,fontWeight:600,color:'var(--crm-text)' }}>
                          {search||statusFilter||sourceFilter ? 'Ничего не найдено' : 'Заявок пока нет'}
                        </div>
                        <div style={{ fontSize:13,color:'var(--crm-muted)' }}>
                          Заявки появляются автоматически с сайта
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((req, i) => {
                  const srcKey   = (req.source ?? 'website').toLowerCase()
                  const srcLabel = SOURCE_LABELS[srcKey] ?? 'Сайт'
                  const statusLabel = STATUS_LABELS[req.status] ?? req.status
                  const budget   = req.budget || (req.budget_int ? `${req.budget_int} ₽` : '—')

                  return (
                    <tr key={req.id} style={{ borderBottom:i<filtered.length-1?'1px solid var(--crm-border)':'none',transition:'background 0.12s',cursor:'pointer' }}
                      onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-surface-hover)'}}
                      onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                      <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                        #{req.order_number ?? '—'}
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                        {req.telegram ? `@${req.telegram}` : req.discord || '—'}
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                        {req.discord || '—'}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <Badge text={srcLabel} colorMap={SOURCE_COLORS}/>
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-blue)',whiteSpace:'nowrap' }}>
                        {req.service_title ?? '—'}
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,fontWeight:700,color:'var(--crm-text)',whiteSpace:'nowrap' }}>
                        {budget}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <Badge text={statusLabel} colorMap={STATUS_COLORS}/>
                      </td>
                      <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>
                        {formatDate(req.created_at)}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6 }}>
                          <ActionButton icon={Eye}     title="Просмотр" onClick={()=>setViewRequest(req)}/>
                          <ActionButton icon={UserPlus} title="Конвертировать в заказ" hoverColor="green" onClick={()=>setConvertRequest(req)} disabled={req.status==='converted'}/>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div style={{ padding:'14px 16px',borderTop:'1px solid var(--crm-border2)' }}>
              <span style={{ fontSize:13,color:'var(--crm-muted)' }}>
                Показано {filtered.length} из {requests.length} заявок
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ViewRequestModal
        request={viewRequest}
        onClose={() => setViewRequest(null)}
        onConvert={() => { setConvertRequest(viewRequest); setViewRequest(null) }}
        onStatusChange={handleStatusChange}
      />
      <ConvertRequestModal
        open={convertRequest !== null}
        onClose={() => setConvertRequest(null)}
        onSuccess={() => { setConvertRequest(null); loadAll() }}
        request={convertRequest}
        clients={clients}
        services={services}
        onClientCreated={refreshClients}
      />
    </div>
  )
}

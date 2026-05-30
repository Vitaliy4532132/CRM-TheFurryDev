'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Send, Mail, MapPin, Calendar,
  MessageSquare, ClipboardList, ShoppingCart, Globe, Pencil, Loader2, AlertCircle,
} from 'lucide-react'
import { getClientById, getOrdersByClient, getPaymentsByClient, updateCRMClient } from '@/lib/crm/api'
import { ORDER_STATUS_LABELS } from '@/types/crm'
import { getPreferredPayment, PAYMENT_METHOD_LABELS } from '@/lib/crm/helpers'
import { PaymentMethodBadge } from '@/components/crm/status-badge'
import type { CRMClient, CRMOrder, CRMPayment } from '@/types/crm'

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:             { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  discussion:      { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  waiting_payment: { color: 'var(--crm-yellow)', bg: 'var(--crm-yellow-dim)' },
  in_progress:     { color: 'var(--crm-blue)',   bg: 'var(--crm-blue-dim)' },
  review:          { color: 'var(--crm-purple)', bg: 'var(--crm-purple-dim)' },
  revision:        { color: 'var(--crm-orange)', bg: 'var(--crm-orange-dim)' },
  done:            { color: 'var(--crm-muted)',  bg: 'rgba(100,116,139,0.12)' },
  completed:       { color: 'var(--crm-teal)',   bg: 'var(--crm-teal-dim)' },
  cancelled:       { color: 'var(--crm-red)',    bg: 'var(--crm-red-dim)' },
}

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { color:'var(--crm-muted)', bg:'rgba(100,116,139,0.12)' }
  return <span style={{ display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',color:cfg.color,background:cfg.bg }}>{ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}</span>
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width:w, height:h, background:'var(--crm-s3)', borderRadius:6, animation:'crm-pulse 1.5s ease-in-out infinite' }}/>
}

function PageSkeleton() {
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <Skel w={140} h={18}/>
      <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:18 }}>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <Skel w={64} h={64}/>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}><Skel w={160} h={20}/><Skel w={100} h={13}/></div>
        </div>
        <div style={{ display:'flex',gap:8 }}>{[110,130,130,90,100].map((w,i)=><Skel key={i} w={w} h={34}/>)}</div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'18px 20px' }}>
            <Skel w={100} h={12}/><div style={{ marginTop:8 }}><Skel w={80} h={28}/></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contact chip ─────────────────────────────────────────────────────────────

function ContactChip({ icon:Icon, text, color, href }: { icon:typeof Send; text:string; color:string; href?:string }) {
  const inner = (
    <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',fontSize:13,color,textDecoration:'none' }}>
      <Icon size={14} strokeWidth={1.75}/>{text}
    </div>
  )
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none' }}>{inner}</a>
  return <>{inner}</>
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

function money(n: number) { return n.toLocaleString('ru-RU') + ' ₽' }

// ── Field styles ─────────────────────────────────────────────────────────────

const fs: React.CSSProperties = {
  width:'100%', height:38, background:'var(--crm-s3)',
  border:'1px solid var(--crm-border2)', borderRadius:8,
  color:'var(--crm-text)', fontSize:13, padding:'0 12px',
  outline:'none', boxSizing:'border-box', transition:'border-color 0.15s',
}
const ta: React.CSSProperties = { ...fs, height:80, padding:'10px 12px', resize:'vertical' }
const lb: React.CSSProperties = { fontSize:12, fontWeight:600, color:'var(--crm-muted)', marginBottom:6, display:'block', letterSpacing:'0.04em' }

function F({ label, children }: { label:string; children:React.ReactNode }) {
  return <div style={{ display:'flex',flexDirection:'column' }}><label style={lb}>{label}</label>{children}</div>
}
function focusBlue(e: React.FocusEvent<HTMLElement>) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)' }
function unFocus(e: React.FocusEvent<HTMLElement>)   { (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)' }

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600,
  letterSpacing:'0.06em', color:'var(--crm-muted)', textTransform:'uppercase',
  borderBottom:'1px solid var(--crm-border2)', whiteSpace:'nowrap',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientCardPage() {
  const { id } = useParams<{ id: string }>()
  const [client,   setClient]   = useState<CRMClient | null>(null)
  const [orders,   setOrders]   = useState<CRMOrder[]>([])
  const [payments, setPayments] = useState<CRMPayment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Edit mode
  const [isEditing,  setIsEditing]  = useState(false)
  const [editName,   setEditName]   = useState('')
  const [editTg,     setEditTg]     = useState('')
  const [editDc,     setEditDc]     = useState('')
  const [editEmail,  setEditEmail]  = useState('')
  const [editCountry,setEditCountry]= useState('')
  const [editNote,   setEditNote]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [c, o, p] = await Promise.all([
          getClientById(id),
          getOrdersByClient(id),
          getPaymentsByClient(id),
        ])
        setClient(c); setOrders(o); setPayments(p)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalOrders = orders.length
  const totalAmount = orders.reduce((s, o) => s + o.amount, 0)
  const totalUnpaid = orders.reduce((s, o) => s + Math.max(0, o.amount - o.paid), 0)
  const preferred   = useMemo(() => getPreferredPayment(payments), [payments])

  // ── Edit helpers ───────────────────────────────────────────────────────────

  function startEditing() {
    if (!client) return
    setEditName(client.name)
    setEditTg(client.telegram ?? '')
    setEditDc(client.discord  ?? '')
    setEditEmail(client.email   ?? '')
    setEditCountry(client.country ?? '')
    setEditNote(client.note    ?? '')
    setSaveError(null)
    setIsEditing(true)
  }

  async function handleSave() {
    if (!client) return
    if (!editName.trim()) { setSaveError('Укажите имя клиента'); return }
    setSaving(true); setSaveError(null)
    try {
      const updated = await updateCRMClient(client.id, {
        name:     editName.trim(),
        telegram: editTg.trim()      || null,
        discord:  editDc.trim()      || null,
        email:    editEmail.trim()   || null,
        country:  editCountry.trim() || null,
        note:     editNote.trim()    || null,
      })
      setClient(updated)
      setIsEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!loading && notFound) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'60px 0' }}>
        <div style={{ fontSize:48,fontWeight:700,color:'var(--crm-muted)' }}>404</div>
        <div style={{ fontSize:16,color:'var(--crm-text)' }}>Клиент не найден</div>
        <Link href="/clients" style={{ fontSize:13,color:'var(--crm-blue)',textDecoration:'none',fontWeight:500 }}>← Назад к клиентам</Link>
      </div>
    )
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>

      {/* ── Back ── */}
      <div>
        <Link href="/clients" style={{ display:'inline-flex',alignItems:'center',gap:7,fontSize:13,color:'var(--crm-muted)',textDecoration:'none',fontWeight:500,transition:'color 0.15s' }} className="crm-back-link">
          <ArrowLeft size={15} strokeWidth={2}/>Назад к клиентам
        </Link>
      </div>

      {loading && <PageSkeleton/>}

      {!loading && client && (
        <>
          {/* ── Client info block ── */}
          <div style={{
            background: 'var(--crm-surface)',
            border: `1px solid ${isEditing ? 'var(--crm-blue)' : 'var(--crm-border2)'}`,
            borderRadius: 14, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
            transition: 'border-color 0.2s',
          }}>

            {/* ── VIEW MODE ── */}
            {!isEditing && (
              <>
                {/* Avatar + name + edit button */}
                <div style={{ display:'flex',alignItems:'center',gap:16 }}>
                  <div style={{ width:64,height:64,borderRadius:'50%',background:'var(--crm-blue-dim)',color:'var(--crm-blue)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:700,flexShrink:0 }}>
                    {client.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                      <div style={{ fontSize:20,fontWeight:700,color:'var(--crm-text)',lineHeight:1.2 }}>
                        {client.name}
                      </div>
                      {client.profile_id && (
                        <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,color:'var(--crm-teal)',background:'var(--crm-teal-dim)' }}>
                          <Globe size={11} strokeWidth={2}/>Синхронизирован с сайта
                        </span>
                      )}
                      <button
                        onClick={startEditing}
                        style={{ display:'flex',alignItems:'center',gap:5,height:28,padding:'0 10px',borderRadius:7,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:12,fontWeight:500,cursor:'pointer',transition:'all 0.15s',fontFamily:'inherit' }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--crm-blue)';e.currentTarget.style.color='var(--crm-blue)'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--crm-border2)';e.currentTarget.style.color='var(--crm-muted)'}}
                      >
                        <Pencil size={11} strokeWidth={2}/>Редактировать
                      </button>
                    </div>
                    <div style={{ fontSize:12,color:'var(--crm-muted)',marginTop:4 }}>Клиент с {formatDate(client.created_at)}</div>
                  </div>
                </div>

                {/* Contacts */}
                <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                  {client.telegram && <ContactChip icon={Send} text={client.telegram} color="var(--crm-blue)" href={`https://t.me/${client.telegram.replace('@','')}`}/>}
                  {client.discord  && <ContactChip icon={MessageSquare} text={client.discord} color="var(--crm-purple)"/>}
                  {client.email    && <ContactChip icon={Mail} text={client.email} color="var(--crm-muted)" href={`mailto:${client.email}`}/>}
                  {client.country  && <ContactChip icon={MapPin} text={client.country} color="var(--crm-muted)"/>}
                  <ContactChip icon={Calendar} text={formatDate(client.created_at)} color="var(--crm-muted)"/>
                </div>

                {/* Preferred payment */}
                {preferred.method && (
                  <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
                    <span style={{ fontSize:12,fontWeight:600,color:'var(--crm-muted)',letterSpacing:'0.04em',textTransform:'uppercase' }}>Предпочитаемый способ оплаты</span>
                    <PaymentMethodBadge method={preferred.method}/>
                    {preferred.bank && (
                      <span style={{ fontSize:12,color:'var(--crm-muted)' }}>{preferred.bank}</span>
                    )}
                  </div>
                )}

                {/* Note */}
                {client.note && (
                  <div style={{ padding:'14px 16px',background:'var(--crm-s3)',border:'1px solid var(--crm-border)',borderRadius:10,fontSize:13,color:'var(--crm-muted)',lineHeight:1.6 }}>
                    <div style={{ fontSize:11,fontWeight:600,letterSpacing:'0.05em',color:'var(--crm-muted)',marginBottom:6,textTransform:'uppercase' }}>Заметка</div>
                    {client.note}
                  </div>
                )}
              </>
            )}

            {/* ── EDIT MODE ── */}
            {isEditing && (
              <>
                <div style={{ fontSize:14,fontWeight:700,color:'var(--crm-blue)' }}>Редактирование клиента</div>

                <F label="ИМЯ *">
                  <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} style={fs} onFocus={focusBlue} onBlur={unFocus}/>
                </F>

                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                  <F label="TELEGRAM">
                    <input type="text" placeholder="@username" value={editTg} onChange={e=>setEditTg(e.target.value)} style={fs} onFocus={focusBlue} onBlur={unFocus}/>
                  </F>
                  <F label="DISCORD">
                    <input type="text" placeholder="username" value={editDc} onChange={e=>setEditDc(e.target.value)} style={fs} onFocus={focusBlue} onBlur={unFocus}/>
                  </F>
                </div>

                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
                  <F label="EMAIL">
                    <input type="email" placeholder="email@example.com" value={editEmail} onChange={e=>setEditEmail(e.target.value)} style={fs} onFocus={focusBlue} onBlur={unFocus}/>
                  </F>
                  <F label="СТРАНА">
                    <input type="text" placeholder="Украина, Россия..." value={editCountry} onChange={e=>setEditCountry(e.target.value)} style={fs} onFocus={focusBlue} onBlur={unFocus}/>
                  </F>
                </div>

                <F label="ЗАМЕТКА">
                  <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} style={ta} onFocus={focusBlue} onBlur={unFocus}/>
                </F>

                {saveError && (
                  <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,background:'var(--crm-red-dim)',fontSize:13,color:'var(--crm-red)' }}>
                    <AlertCircle size={14} strokeWidth={2}/>{saveError}
                  </div>
                )}

                <div style={{ display:'flex',gap:10 }}>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-s3)',border:'1px solid var(--crm-border2)',color:'var(--crm-muted)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'background 0.15s,color 0.15s',fontFamily:'inherit' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-border2)';e.currentTarget.style.color='var(--crm-text)'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='var(--crm-s3)';e.currentTarget.style.color='var(--crm-muted)'}}>
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ height:36,padding:'0 18px',borderRadius:8,background:'var(--crm-blue)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,display:'flex',alignItems:'center',gap:7,transition:'opacity 0.15s',fontFamily:'inherit' }}
                    onMouseEnter={e=>{if(!saving)e.currentTarget.style.opacity='0.85'}}
                    onMouseLeave={e=>{if(!saving)e.currentTarget.style.opacity='1'}}>
                    {saving && <Loader2 size={14} strokeWidth={2} style={{animation:'spin 0.8s linear infinite'}}/>}
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </>
            )}
          </div>

          {/* ── Stats ── */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
            {[
              { label:'Всего заказов',     value:String(totalOrders),              color:'var(--crm-blue)',   icon:null },
              { label:'Общая сумма',        value:money(totalAmount),               color:'var(--crm-green)',  icon:null },
              { label:'Неоплачено',         value:money(totalUnpaid),               color:'var(--crm-red)',    icon:null },
              { label:'Потрачено на сайте', value:money(client.total_spent ?? 0),   color:'var(--crm-purple)', icon:ShoppingCart },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'18px 20px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--crm-muted)',marginBottom:8 }}>
                  {s.icon && <s.icon size={12} strokeWidth={2} style={{ color:s.color, flexShrink:0 }}/>}
                  {s.label}
                </div>
                <div style={{ fontSize:24,fontWeight:700,color:s.color,letterSpacing:'-0.02em' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* ── Orders table ── */}
          <div>
            <h2 style={{ fontSize:15,fontWeight:700,color:'var(--crm-text)',margin:'0 0 12px 0' }}>Заказы клиента</h2>

            {orders.length === 0 ? (
              <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,padding:'48px 24px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:10 }}>
                <ClipboardList size={40} color="var(--crm-muted)" strokeWidth={1.25}/>
                <div style={{ fontSize:14,fontWeight:600,color:'var(--crm-text)' }}>Заказов пока нет</div>
                <div style={{ fontSize:13,color:'var(--crm-muted)' }}>Создайте первый заказ для этого клиента</div>
              </div>
            ) : (
              <div style={{ background:'var(--crm-surface)',border:'1px solid var(--crm-border2)',borderRadius:12,overflow:'hidden' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead style={{ background:'var(--crm-s3)' }}>
                    <tr>
                      <th style={thStyle}>№</th>
                      <th style={thStyle}>Услуга</th>
                      <th style={thStyle}>Проект</th>
                      <th style={thStyle}>Сумма</th>
                      <th style={thStyle}>Статус</th>
                      <th style={thStyle}>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => (
                      <tr key={order.id} style={{ borderBottom: i < orders.length-1 ? '1px solid var(--crm-border)' : 'none' }}>
                        <td style={{ padding:'12px 14px',fontSize:13,fontWeight:600,whiteSpace:'nowrap' }}>
                          <Link href={`/orders/${order.id}`} style={{ color:'var(--crm-muted)',textDecoration:'none' }} className="crm-order-link">
                            #{order.order_number}
                          </Link>
                        </td>
                        <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-blue)',whiteSpace:'nowrap' }}>{order.service?.name ?? '—'}</td>
                        <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-text)',whiteSpace:'nowrap' }}>{order.project_name}</td>
                        <td style={{ padding:'12px 14px',fontSize:13,fontWeight:700,color:'var(--crm-text)',whiteSpace:'nowrap' }}>{money(order.amount)}</td>
                        <td style={{ padding:'12px 14px' }}><StatusChip status={order.status}/></td>
                        <td style={{ padding:'12px 14px',fontSize:13,color:'var(--crm-muted)',whiteSpace:'nowrap' }}>{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .crm-back-link:hover  { color: var(--crm-text) !important; }
        .crm-order-link:hover { color: var(--crm-blue) !important; }
        @keyframes crm-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, useEffect, useCallback, Suspense } from 'react'
import { Search, Plus, Loader2, ClipboardList, Users, SearchX, Eye, EyeOff } from 'lucide-react'
import { globalSearch, type SearchOrderResult, type SearchClientResult } from '@/lib/crm/api'
import { ORDER_STATUS_LABELS } from '@/lib/crm/helpers'
import { usePrivacyMode } from '@/hooks/usePrivacyMode'

// ── Status badge (mini) ───────────────────────────────────────────────────────

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

function MiniStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? { color:'var(--crm-muted)', bg:'rgba(100,116,139,0.12)' }
  return (
    <span style={{ display:'inline-flex',alignItems:'center',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:600,color:cfg.color,background:cfg.bg,whiteSpace:'nowrap' }}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Page titles ───────────────────────────────────────────────────────────────

const pageTitles: Record<string, string> = {
  '/dashboard': 'Главная',
  '/orders':    'Заказы',
  '/clients':   'Клиенты',
  '/requests':  'Заявки',
  '/finance':    'Финансы',
  '/analytics':  'Аналитика',
  '/expenses':   'Расходы',
  '/services':  'Услуги',
  '/settings':  'Настройки',
}

// ── Search component ──────────────────────────────────────────────────────────

function SearchBox() {
  const router        = useRouter()
  const containerRef  = useRef<HTMLDivElement>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<{ orders: SearchOrderResult[]; clients: SearchClientResult[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const r = await globalSearch(query)
        setResults(r)
        setOpen(true)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Click-outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Escape to close + clear
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
  }

  const hasResults = results && (results.orders.length > 0 || results.clients.length > 0)
  const noResults  = results && !hasResults

  return (
    <div ref={containerRef} style={{ position:'relative', width:220 }}>
      {/* Input field */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'var(--crm-surface)', border:'1px solid var(--crm-border2)',
        borderRadius:8, padding:'7px 14px', width:'100%', boxSizing:'border-box',
      }}>
        {loading
          ? <Loader2 size={14} color="var(--crm-muted)" strokeWidth={1.75} style={{ flexShrink:0, animation:'crm-spin 0.8s linear infinite' }}/>
          : <Search size={14} color="var(--crm-muted)" strokeWidth={1.75} style={{ flexShrink:0 }}/>
        }
        <input
          type="text"
          placeholder="Поиск..."
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) setOpen(true) }}
          onFocus={() => { if (results && query.length >= 2) setOpen(true) }}
          style={{
            background:'transparent', border:'none', outline:'none',
            fontSize:13, color:'var(--crm-text)', width:'100%',
            fontFamily:'inherit',
          }}
        />
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', left:0,
          width:320, background:'var(--crm-surface)',
          border:'1px solid var(--crm-border2)', borderRadius:12,
          boxShadow:'0 8px 32px rgba(0,0,0,0.3)', zIndex:100, overflow:'hidden',
        }}>

          {/* Loading state */}
          {loading && !results && (
            <div style={{ padding:'16px',display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'var(--crm-muted)',fontSize:13 }}>
              <Loader2 size={14} strokeWidth={2} style={{ animation:'crm-spin 0.8s linear infinite' }}/>
              Поиск...
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div style={{ padding:'20px',display:'flex',flexDirection:'column',alignItems:'center',gap:8 }}>
              <SearchX size={28} color="var(--crm-muted)" strokeWidth={1.25}/>
              <span style={{ fontSize:13,color:'var(--crm-muted)',textAlign:'center' }}>
                Ничего не найдено по запросу «{query}»
              </span>
            </div>
          )}

          {/* Orders section */}
          {hasResults && results.orders.length > 0 && (
            <div>
              <div style={{ padding:'10px 14px 6px',fontSize:10,fontWeight:700,color:'var(--crm-muted)',letterSpacing:'0.08em',textTransform:'uppercase',borderBottom:'1px solid var(--crm-border)' }}>
                Заказы
              </div>
              {results.orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleSelect('/orders/' + order.id)}
                  style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.12s',fontFamily:'inherit' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-s3)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
                >
                  <div style={{ width:28,height:28,borderRadius:7,background:'var(--crm-blue-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <ClipboardList size={13} color="var(--crm-blue)" strokeWidth={1.75}/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:'var(--crm-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      #{order.order_number} — {order.project_name}
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:2 }}>
                      {order.client && <span style={{ fontSize:11,color:'var(--crm-muted)' }}>{order.client.name}</span>}
                      <MiniStatusBadge status={order.status}/>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Clients section */}
          {hasResults && results.clients.length > 0 && (
            <div style={{ borderTop: results.orders.length > 0 ? '1px solid var(--crm-border)' : undefined }}>
              <div style={{ padding:'10px 14px 6px',fontSize:10,fontWeight:700,color:'var(--crm-muted)',letterSpacing:'0.08em',textTransform:'uppercase',borderBottom:'1px solid var(--crm-border)' }}>
                Клиенты
              </div>
              {results.clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelect('/clients/' + client.id)}
                  style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',background:'transparent',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.12s',fontFamily:'inherit' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--crm-s3)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
                >
                  <div style={{ width:28,height:28,borderRadius:'50%',background:'var(--crm-blue-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--crm-blue)',flexShrink:0 }}>
                    {client.name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:'var(--crm-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {client.name}
                    </div>
                    {(client.telegram || client.discord) && (
                      <div style={{ fontSize:11,color:'var(--crm-muted)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        {client.telegram ?? client.discord}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes crm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Topbar (wraps SearchBox in Suspense) ──────────────────────────────────────

interface TopbarProps {
  userEmail?: string | null
}

function TopbarInner({ userEmail }: TopbarProps) {
  const pathname    = usePathname()
  const router      = useRouter()
  const searchParams = useSearchParams()

  const title = pageTitles[pathname] ??
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key + '/'))?.[1] ??
    'CRM'

  const displayName = userEmail ? userEmail.split('@')[0] : 'Админ'

  const { isPrivate, toggle } = usePrivacyMode()

  const handleCreateOrder = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('modal', 'create-order')
    router.push(pathname + '?' + params.toString())
  }, [pathname, router, searchParams])

  return (
    <header style={{
      height:58, background:'var(--crm-sidebar)',
      borderBottom:'1px solid var(--crm-border)',
      display:'flex', alignItems:'center', gap:12,
      padding:'0 24px', flexShrink:0,
    }}>
      <h1 style={{ fontSize:17,fontWeight:700,color:'var(--crm-text)',flex:1,margin:0 }}>
        {title}
      </h1>

      {/* Privacy toggle */}
      <button
        onClick={toggle}
        title={isPrivate ? 'Показать цифры' : 'Скрыть цифры'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isPrivate ? 'var(--crm-blue-dim)' : 'var(--crm-surface)',
          border: `1px solid ${isPrivate ? 'var(--crm-blue)' : 'var(--crm-border2)'}`,
          borderRadius: '8px',
          padding: '7px 12px',
          color: isPrivate ? 'var(--crm-blue)' : 'var(--crm-muted)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => {
          if (!isPrivate) {
            e.currentTarget.style.borderColor = 'var(--crm-blue)'
            e.currentTarget.style.color = 'var(--crm-blue)'
          }
        }}
        onMouseLeave={e => {
          if (!isPrivate) {
            e.currentTarget.style.borderColor = 'var(--crm-border2)'
            e.currentTarget.style.color = 'var(--crm-muted)'
          }
        }}
      >
        {isPrivate ? <EyeOff size={15}/> : <Eye size={15}/>}
        {isPrivate ? 'Показать' : 'Скрыть'}
      </button>

      {/* Search */}
      <SearchBox />

      {/* Create order button */}
      <button
        onClick={handleCreateOrder}
        style={{
          display:'flex', alignItems:'center', gap:6,
          background:'var(--crm-blue)', color:'#fff',
          border:'none', borderRadius:8, padding:'8px 16px',
          fontSize:13, fontWeight:600, cursor:'pointer',
          fontFamily:'inherit', whiteSpace:'nowrap',
          transition:'filter 0.15s',
        }}
        onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.1)'}}
        onMouseLeave={e=>{e.currentTarget.style.filter='none'}}
      >
        <Plus size={15} strokeWidth={2.5}/>
        Создать заказ
      </button>

      {/* User */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:'var(--crm-surface)', border:'1px solid var(--crm-border2)',
        borderRadius:8, padding:'6px 12px',
      }}>
        <div style={{
          width:24, height:24, borderRadius:6,
          background:'var(--crm-blue-dim)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700, color:'var(--crm-blue)',
        }}>
          {displayName[0]?.toUpperCase() ?? 'A'}
        </div>
        <span style={{ fontSize:13,color:'var(--crm-text)',fontWeight:500 }}>
          {displayName}
        </span>
      </div>
    </header>
  )
}

export function Topbar({ userEmail }: TopbarProps) {
  return (
    <Suspense fallback={
      <header style={{ height:58,background:'var(--crm-sidebar)',borderBottom:'1px solid var(--crm-border)',flexShrink:0 }}/>
    }>
      <TopbarInner userEmail={userEmail}/>
    </Suspense>
  )
}

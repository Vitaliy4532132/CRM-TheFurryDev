'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Monitor, Smartphone } from 'lucide-react'

// ── Shared field styles ───────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  background: 'var(--crm-s3)',
  border: '1px solid var(--crm-border2)',
  borderRadius: 8,
  color: 'var(--crm-text)',
  fontSize: 13,
  padding: '0 12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const textareaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 80,
  padding: '10px 12px',
  resize: 'vertical',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--crm-muted)',
  marginBottom: 6,
  display: 'block',
  letterSpacing: '0.04em',
}

function focusBlue(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)'
}
function unfocus(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)'
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--crm-surface)',
      border: '1px solid var(--crm-border2)',
      borderRadius: 12,
      padding: 24,
    }}>
      <div style={{
        fontSize: 15, fontWeight: 700, color: 'var(--crm-text)',
        borderBottom: '1px solid var(--crm-border)',
        paddingBottom: 12, marginBottom: 20,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────

function SaveBtn({ label = 'Сохранить изменения' }: { label?: string }) {
  return (
    <button
      style={{
        height: 36, padding: '0 18px', borderRadius: 8,
        background: 'var(--crm-blue)', border: 'none',
        color: '#fff', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'opacity 0.15s',
        alignSelf: 'flex-start',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
    >
      {label}
    </button>
  )
}

function GhostBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 32, padding: '0 14px', borderRadius: 8,
        background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
        color: 'var(--crm-muted)', fontSize: 12, fontWeight: 500,
        cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--crm-border2)'
        e.currentTarget.style.color = 'var(--crm-text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--crm-s3)'
        e.currentTarget.style.color = 'var(--crm-muted)'
      }}
    >
      {label}
    </button>
  )
}

function DangerBtn({ label }: { label: string }) {
  return (
    <button
      style={{
        height: 36, padding: '0 18px', borderRadius: 8,
        background: 'transparent',
        border: '1px solid var(--crm-red)',
        color: 'var(--crm-red)', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
        alignSelf: 'flex-start',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--crm-red-dim)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function ProfileTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Account info */}
      <Card title="Информация об аккаунте">
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--crm-blue-dim)',
            color: 'var(--crm-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, flexShrink: 0,
          }}>
            А
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--crm-text)', marginBottom: 3 }}>
              Админ
            </div>
            <div style={{ fontSize: 13, color: 'var(--crm-muted)', marginBottom: 2 }}>
              admin@thefurry.store
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 9px', borderRadius: 6, marginTop: 6,
              fontSize: 11, fontWeight: 600,
              color: 'var(--crm-purple)', background: 'var(--crm-purple-dim)',
            }}>
              Владелец
            </div>
          </div>

          <GhostBtn label="Изменить аватар" />
        </div>
      </Card>

      {/* Form */}
      <Card title="Основные данные">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="ИМЯ">
            <input type="text" defaultValue="Админ" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <Field label="EMAIL">
            <input type="email" defaultValue="admin@thefurry.store" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <Field label="TELEGRAM">
            <input type="text" defaultValue="@admin" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <SaveBtn />
        </div>
      </Card>
    </div>
  )
}

function StudioTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Studio info */}
      <Card title="Информация о студии">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Image src="/logo.svg" alt="TheFurryDev" width={48} height={48} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--crm-text)', lineHeight: 1.2 }}>
              TheFurryDev
            </div>
            <div style={{ fontSize: 12, color: 'var(--crm-muted)', marginTop: 3 }}>
              CRM Studio
            </div>
          </div>
        </div>
      </Card>

      {/* Studio form */}
      <Card title="Настройки студии">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="НАЗВАНИЕ СТУДИИ">
              <input type="text" defaultValue="TheFurryDev" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
            </Field>
            <Field label="САЙТ">
              <input type="text" defaultValue="thefurry.store" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
            </Field>
          </div>

          <Field label="TELEGRAM">
            <input type="text" defaultValue="@TheFurryDev" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>

          <Field label="ОПИСАНИЕ">
            <textarea defaultValue="Minecraft-студия полного цикла" style={textareaStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="ВАЛЮТА">
              <select style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} defaultValue="rub">
                <option value="rub">₽ Рубль</option>
                <option value="usd">$ Доллар</option>
                <option value="eur">€ Евро</option>
                <option value="uah">₴ Гривна</option>
              </select>
            </Field>
            <Field label="ЧАСОВОЙ ПОЯС">
              <select style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} defaultValue="utc3">
                <option value="utc3">UTC+3 Москва</option>
                <option value="utc0">UTC+0 Лондон</option>
                <option value="utc1">UTC+1 Берлин</option>
              </select>
            </Field>
          </div>

          <SaveBtn label="Сохранить" />
        </div>
        <style>{`select option { background: var(--crm-s3); color: var(--crm-text); }`}</style>
      </Card>
    </div>
  )
}

function SecurityTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Password */}
      <Card title="Смена пароля">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="ТЕКУЩИЙ ПАРОЛЬ">
            <input type="password" placeholder="••••••••" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <Field label="НОВЫЙ ПАРОЛЬ">
            <input type="password" placeholder="••••••••" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <Field label="ПОВТОРИТЕ ПАРОЛЬ">
            <input type="password" placeholder="••••••••" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
          <SaveBtn label="Изменить пароль" />
        </div>
      </Card>

      {/* Sessions */}
      <Card title="Активные сессии">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>

          {/* Session 1 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: 'var(--crm-s3)',
            border: '1px solid var(--crm-border)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9,
              background: 'var(--crm-green-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Monitor size={18} color="var(--crm-green)" strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 2 }}>
                Windows · Chrome
              </div>
              <div style={{ fontSize: 12, color: 'var(--crm-muted)' }}>
                Киев, Украина
              </div>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              color: 'var(--crm-green)', background: 'var(--crm-green-dim)',
              whiteSpace: 'nowrap',
            }}>
              Сейчас активна
            </span>
          </div>

          {/* Session 2 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: 'var(--crm-s3)',
            border: '1px solid var(--crm-border)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 9,
              background: 'rgba(100,116,139,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Smartphone size={18} color="var(--crm-muted)" strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--crm-text)', marginBottom: 2 }}>
                Android · Chrome
              </div>
              <div style={{ fontSize: 12, color: 'var(--crm-muted)' }}>
                Москва, Россия
              </div>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              color: 'var(--crm-muted)', background: 'rgba(100,116,139,0.12)',
              whiteSpace: 'nowrap',
            }}>
              2 часа назад
            </span>
          </div>
        </div>

        <DangerBtn label="Завершить все сессии" />
      </Card>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'studio' | 'security'

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile',  label: 'Профиль' },
  { id: 'studio',   label: 'Студия' },
  { id: 'security', label: 'Безопасность' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <div style={{ maxWidth: 680 }}>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--crm-border2)',
        marginBottom: 24,
      }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                background: 'none', border: 'none',
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--crm-blue)' : 'var(--crm-muted)',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--crm-blue)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--crm-text)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = 'var(--crm-muted)'
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Panel ── */}
      {activeTab === 'profile'  && <ProfileTab />}
      {activeTab === 'studio'   && <StudioTab />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  )
}

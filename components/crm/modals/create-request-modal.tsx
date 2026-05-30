'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface CreateRequestModalProps {
  open: boolean
  onClose: () => void
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 38,
  background: 'var(--crm-s3)',
  border: '1px solid var(--crm-border2)',
  borderRadius: 8, color: 'var(--crm-text)',
  fontSize: 13, padding: '0 12px',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const textareaStyle: React.CSSProperties = {
  ...fieldStyle, height: 80, padding: '10px 12px', resize: 'vertical',
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--crm-muted)',
  marginBottom: 6, display: 'block', letterSpacing: '0.04em',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}
function focusBlue(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-blue)'
}
function unfocus(e: React.FocusEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.borderColor = 'var(--crm-border2)'
}

export function CreateRequestModal({ open, onClose }: CreateRequestModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 520, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--crm-surface)', border: '1px solid var(--crm-border2)',
        borderRadius: 16, display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--crm-border2)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--crm-text)' }}>
            Добавить заявку
          </span>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--crm-s3)',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--crm-muted)', transition: 'background 0.15s, color 0.15s',
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--crm-red-dim)'
              e.currentTarget.style.color = 'var(--crm-red)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--crm-s3)'
              e.currentTarget.style.color = 'var(--crm-muted)'
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="ИМЯ / НИК">
            <input type="text" placeholder="Имя или ник" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="TELEGRAM">
              <input type="text" placeholder="@username" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
            </Field>
            <Field label="DISCORD">
              <input type="text" placeholder="username#0000" style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="ИСТОЧНИК">
              <select style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} defaultValue="Telegram">
                <option>Telegram</option>
                <option>Discord</option>
                <option>Сайт</option>
                <option>Другое</option>
              </select>
            </Field>
            <Field label="СТАТУС">
              <select style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} defaultValue="Новая">
                <option>Новая</option>
                <option>В обработке</option>
                <option>Ожидает ответа</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="ИНТЕРЕСУЮЩАЯ УСЛУГА">
              <select style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} defaultValue="">
                <option value="" disabled>Выберите услугу</option>
                <option>Разработка плагина</option>
                <option>Сборка сервера</option>
                <option>Настройка плагинов</option>
                <option>Разработка мода</option>
                <option>Билдинг</option>
                <option>Дизайн</option>
                <option>Сайт</option>
                <option>Discord-бот</option>
                <option>Telegram-бот</option>
                <option>Техподдержка</option>
              </select>
            </Field>
            <Field label="ПРИМЕРНЫЙ БЮДЖЕТ (₽)">
              <input type="number" placeholder="0" min={0} style={fieldStyle} onFocus={focusBlue} onBlur={unfocus} />
            </Field>
          </div>

          <Field label="ОПИСАНИЕ ЗАПРОСА">
            <textarea placeholder="Что хочет клиент..." style={textareaStyle} onFocus={focusBlue} onBlur={unfocus} />
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px', borderTop: '1px solid var(--crm-border2)', flexShrink: 0,
        }}>
          <button onClick={onClose} style={{
            height: 36, padding: '0 18px', borderRadius: 8,
            background: 'var(--crm-s3)', border: '1px solid var(--crm-border2)',
            color: 'var(--crm-muted)', fontSize: 13, fontWeight: 500,
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
            Отмена
          </button>
          <button style={{
            height: 36, padding: '0 18px', borderRadius: 8,
            background: 'var(--crm-blue)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Добавить
          </button>
        </div>
        <style>{`select option { background: var(--crm-s3); color: var(--crm-text); }`}</style>
      </div>
    </div>
  )
}

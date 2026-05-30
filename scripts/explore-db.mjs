/**
 * Скрипт исследования базы данных Supabase
 * Запуск: node scripts/explore-db.mjs
 *
 * Предварительно заполни .env.local реальными значениями из
 * Supabase Dashboard → Settings → API
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Загрузка .env.local ──────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    process.env[key] = val
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
  console.error('❌ Заполни NEXT_PUBLIC_SUPABASE_URL в .env.local')
  process.exit(1)
}
if (!SUPABASE_KEY || SUPABASE_KEY === 'your-anon-key') {
  console.error('❌ Заполни NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Нужные таблицы CRM ───────────────────────────────────────────────────────

const REQUIRED_TABLES = {
  clients:  ['id', 'name', 'telegram', 'discord', 'email', 'country', 'note', 'created_at'],
  orders:   ['id', 'order_number', 'client_id', 'service_id', 'project_name', 'description', 'amount', 'paid', 'deadline', 'status', 'comment', 'created_at'],
  payments: ['id', 'order_id', 'client_id', 'amount', 'payment_method', 'payment_date', 'comment'],
  expenses: ['id', 'name', 'category', 'amount', 'date', 'comment'],
  services: ['id', 'name', 'description', 'min_price', 'is_active'],
  requests: ['id', 'name', 'telegram', 'discord', 'source', 'service', 'budget', 'description', 'status', 'created_at'],
}

// ── Вспомогательные функции ──────────────────────────────────────────────────

async function runSQL(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query })
  if (error) throw error
  return data
}

async function getTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
  if (error) {
    // Fallback через rpc если прямой запрос к information_schema заблокирован
    const { data: d2, error: e2 } = await supabase.rpc('get_tables')
    if (e2) throw new Error(`Не могу получить список таблиц: ${error.message}`)
    return d2
  }
  return data?.map(r => r.table_name) ?? []
}

async function getColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position')
  if (error) throw error
  return data ?? []
}

async function getSampleData(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(3)
  if (error) return null
  return data
}

async function getRowCount(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
  if (error) return null
  return count
}

// ── Главная функция ──────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Подключение к Supabase...')
  console.log('   URL:', SUPABASE_URL)

  let tables = []
  try {
    const result = await getTables()
    tables = Array.isArray(result) ? result : result?.map(r => r.table_name) ?? []
    console.log(`\n✅ Найдено таблиц: ${tables.length}`)
  } catch (e) {
    console.error('❌ Ошибка получения таблиц:', e.message)
    process.exit(1)
  }

  // ── Исследование каждой таблицы ──────────────────────────────────────────

  const tableData = {}

  for (const tableName of tables) {
    console.log(`\n📋 Таблица: ${tableName}`)

    const columns = await getColumns(tableName).catch(() => [])
    const count   = await getRowCount(tableName)
    const sample  = await getSampleData(tableName)

    tableData[tableName] = { columns, count, sample }

    console.log(`   Колонок: ${columns.length}, Записей: ${count ?? '?'}`)
    columns.forEach(c => {
      console.log(`   - ${c.column_name} (${c.data_type})${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`)
    })
  }

  // ── Сравнение с требованиями CRM ─────────────────────────────────────────

  const gaps = {}
  for (const [reqTable, reqCols] of Object.entries(REQUIRED_TABLES)) {
    if (!tables.includes(reqTable)) {
      gaps[reqTable] = { status: 'НЕТ', missingCols: reqCols }
    } else {
      const existCols = (tableData[reqTable]?.columns ?? []).map(c => c.column_name)
      const missing   = reqCols.filter(c => !existCols.includes(c))
      gaps[reqTable] = {
        status: missing.length === 0 ? 'ЕСТЬ' : 'ЧАСТИЧНО',
        missingCols: missing,
      }
    }
  }

  // ── Генерация отчёта ──────────────────────────────────────────────────────

  let report = generateReport(tables, tableData, gaps)
  const reportPath = path.join(__dirname, '..', 'SUPABASE_REPORT.md')
  fs.writeFileSync(reportPath, report, 'utf8')

  console.log('\n' + '═'.repeat(60))
  console.log('📄 Отчёт сохранён в SUPABASE_REPORT.md')
  console.log('═'.repeat(60))

  // Итоговая сводка
  for (const [t, g] of Object.entries(gaps)) {
    const icon = g.status === 'ЕСТЬ' ? '✅' : g.status === 'ЧАСТИЧНО' ? '⚠️' : '❌'
    console.log(`${icon} ${t}: ${g.status}`)
    if (g.missingCols.length) console.log(`   Недостаёт: ${g.missingCols.join(', ')}`)
  }
}

function generateReport(tables, tableData, gaps) {
  const now = new Date().toLocaleString('ru-RU')
  let r = `# Отчёт по базе данных Supabase\n\nСгенерировано: ${now}\n\n---\n\n`

  r += `## Найденные таблицы (${tables.length})\n\n`

  for (const t of tables) {
    const d = tableData[t]
    r += `### \`${t}\`\n\n`
    r += `**Записей:** ${d.count ?? '?'}\n\n`
    r += `| Колонка | Тип | NOT NULL |\n|---------|-----|----------|\n`
    for (const c of d.columns) {
      r += `| \`${c.column_name}\` | \`${c.data_type}\` | ${c.is_nullable === 'NO' ? '✓' : ''} |\n`
    }
    if (d.sample?.length) {
      r += `\n**Пример данных:**\n\`\`\`json\n${JSON.stringify(d.sample, null, 2)}\n\`\`\`\n`
    }
    r += '\n'
  }

  r += `---\n\n## Анализ для CRM\n\n`
  r += `| Таблица | Статус | Комментарий |\n|---------|--------|-------------|\n`
  for (const [t, g] of Object.entries(gaps)) {
    const icon = g.status === 'ЕСТЬ' ? '✅' : g.status === 'ЧАСТИЧНО' ? '⚠️' : '❌'
    const note = g.missingCols.length ? `Недостаёт: \`${g.missingCols.join('`, `')}\`` : 'Все поля на месте'
    r += `| \`${t}\` | ${icon} ${g.status} | ${note} |\n`
  }

  return r
}

main().catch(e => {
  console.error('Критическая ошибка:', e)
  process.exit(1)
})

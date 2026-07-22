import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import {
  Users, UserPlus, UserMinus, Calendar, TrendingUp,
  Download, ChevronRight, User, X, Search
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import { LoadingSpinner } from '../components/UI'

// ─── Colors — Online Asset Design System palette ──────────────────────────────
const OA_PALETTE = ['#78c045','#1692dc','#00afab','#f59e0b','#ff5252','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316']
const DEPT_COLORS    = OA_PALETTE
const BU_COLORS      = OA_PALETTE
const COMPANY_COLORS = OA_PALETTE

// ─── Age bands ────────────────────────────────────────────────────────────────
const AGE_BANDS = [
  { label: 'ต่ำกว่า 25', min: 0,  max: 25  },
  { label: '25-30',       min: 25, max: 31  },
  { label: '31-35',       min: 31, max: 36  },
  { label: '36-40',       min: 36, max: 41  },
  { label: '41-50',       min: 41, max: 51  },
  { label: 'มากกว่า 50', min: 51, max: 999 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_FULL_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]

function thDate(d) {
  const dt = d ? new Date(d) : new Date()
  return `${dt.getDate()} ${MONTH_FULL_TH[dt.getMonth()]} ${dt.getFullYear() + 543}`
}

function isValidHireDate(dateStr) {
  if (!dateStr) return false
  const y = new Date(dateStr).getFullYear()
  return y >= 1980 && y <= 2100
}

function isMale(e)   { return ['M','m','male','Male','ชาย'].includes(e.gender) }
function isFemale(e) { return ['F','f','female','Female','หญิง'].includes(e.gender) }

function calcMedian(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  const val = s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2
  return Math.round(val * 10) / 10
}

function empName(e) {
  return `${e.prefix_th || ''}${e.first_name_th || e.first_name_en || ''} ${e.last_name_th || e.last_name_en || ''}`.trim() || '-'
}

// ─── SlidePanel ───────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-[#f0f9e8] text-[#5a9030]','bg-blue-100 text-blue-700',
  'bg-[#e0f5f4] text-[#00afab]','bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700','bg-rose-100 text-rose-700',
]

function SlidePanel({ panel, onClose }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    if (panel.open) { setSearch(''); setSortKey(null); setSortDir('asc') }
  }, [panel.open, panel.title])

  // close on Escape
  useEffect(() => {
    if (!panel.open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [panel.open, onClose])

  const filtered = useMemo(() => {
    if (!search.trim()) return panel.rows
    const q = search.toLowerCase()
    return panel.rows.filter(e => {
      const nm = empName(e).toLowerCase()
      return nm.includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.department_name_th || '').toLowerCase().includes(q) ||
        (e.position_th || '').toLowerCase().includes(q) ||
        (e.bu || '').toLowerCase().includes(q)
    })
  }, [panel.rows, search])

  const tenureMonths = (e) => {
    if (!e.hire_date) return -1
    const s = new Date(e.hire_date)
    return (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth())
  }

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let va, vb
      if (sortKey === 'name')       { va = empName(a); vb = empName(b) }
      else if (sortKey === 'position') { va = a.position_th || ''; vb = b.position_th || '' }
      else if (sortKey === 'dept')  { va = a.department_name_th || ''; vb = b.department_name_th || '' }
      else if (sortKey === 'bu')    { va = a.bu || a.company_entity || ''; vb = b.bu || b.company_entity || '' }
      else if (sortKey === 'hire')  { va = a.hire_date || ''; vb = b.hire_date || '' }
      else if (sortKey === 'status'){ va = a.status || ''; vb = b.status || '' }
      else if (sortKey === 'tenure'){ va = tenureMonths(a); vb = tenureMonths(b); return sortDir === 'asc' ? va - vb : vb - va }
      const cmp = va.localeCompare(vb, 'th')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="ml-0.5 text-gray-300">⇅</span>
    return <span className="ml-0.5 text-[#78c045]">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  if (!panel.open) return null

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        style={{ backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      {/* panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">

        {/* header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 truncate">{panel.title}</h2>
            {panel.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{panel.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-3 flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* search */}
        <div className="px-5 py-3 border-b border-gray-50 flex-shrink-0 space-y-1.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ฝ่าย, ตำแหน่ง..."
              value={search}
              onChange={ev => setSearch(ev.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <p className="text-xs text-gray-400">
            แสดง{' '}
            <span className="font-semibold text-gray-600">{filtered.length.toLocaleString()}</span>
            {' '}/ {panel.rows.length.toLocaleString()} คน
          </p>
        </div>

        {/* table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-gray-100 z-10 shadow-sm">
              <tr>
                <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-8">#</th>
                {[
                  { key: 'name',    label: 'ชื่อ-นามสกุล',   align: 'left'  },
                  { key: 'position',label: 'ตำแหน่ง',         align: 'left'  },
                  { key: 'dept',    label: 'ฝ่าย',            align: 'left'  },
                  { key: 'bu',      label: 'BU',              align: 'left'  },
                  { key: 'hire',    label: 'วันที่เริ่มงาน',  align: 'left'  },
                  { key: 'status',  label: 'สถานะ',           align: 'left'  },
                  { key: 'tenure',  label: 'อายุงาน',         align: 'right' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-2.5 text-gray-500 font-medium cursor-pointer select-none
                      hover:text-[#78c045] transition-colors whitespace-nowrap
                      ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.label}<SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((e, i) => {
                const name = empName(e)
                const initial = name !== '-'
                  ? name.replace(/^(นาย|นาง|นางสาว|ดร\.|คุณ)\s*/, '').trim().slice(0, 1)
                  : '?'
                const tenure = (() => {
                  if (!e.hire_date) return '-'
                  const start = new Date(e.hire_date)
                  const end = now
                  let years = end.getFullYear() - start.getFullYear()
                  let months = end.getMonth() - start.getMonth()
                  if (months < 0) { years--; months += 12 }
                  if (years === 0) return `${months} เดือน`
                  if (months === 0) return `${years} ปี`
                  return `${years} ปี ${months} เดือน`
                })()
                return (
                  <tr key={e.id || i} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-300">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-medium text-gray-800 truncate max-w-[150px]"
                            title={e.nickname ? `${name} (${e.nickname})` : name}
                          >
                            {name}
                            {e.nickname && <span className="text-gray-400 font-normal ml-1">({e.nickname})</span>}
                          </div>
                          <div className="text-gray-400">{e.employee_code || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      <span className="truncate block max-w-[120px]" title={e.position_th || e.position_en || '-'}>
                        {e.position_th || e.position_en || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      <span className="truncate block max-w-[110px]" title={e.department_name_th || '-'}>
                        {e.department_name_th || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{e.bu || e.company_entity || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {e.hire_date
                        ? new Date(e.hire_date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const daysSinceHire = e.hire_date
                          ? Math.floor((now - new Date(e.hire_date)) / (1000 * 60 * 60 * 24))
                          : null
                        const isProbation = daysSinceHire !== null && daysSinceHire < 90
                        const s = isProbation ? 'probation' : e.status
                        const map = {
                          active:     { cls: 'bg-green-100 text-green-700',   label: 'ทำงาน' },
                          probation:  { cls: 'bg-yellow-100 text-yellow-700', label: 'ทดลองงาน' },
                          resigned:   { cls: 'bg-red-100 text-red-700',       label: 'ลาออก' },
                          terminated: { cls: 'bg-gray-100 text-gray-600',     label: 'พ้นสภาพ' },
                        }
                        const { cls, label } = map[s] || { cls: 'bg-gray-100 text-gray-500', label: s || '-' }
                        return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cls}`}>{label}</span>
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-right whitespace-nowrap">{tenure}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">ไม่พบข้อมูล</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, bgColor, iconColor, label, value, sub, trend, trendDir, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4
                  ${onClick
                    ? 'cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition-all'
                    : ''}`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend && (
          <p className={`text-xs flex items-center gap-0.5 mt-0.5 ${
            trendDir === 'up'   ? 'text-green-600' :
            trendDir === 'down' ? 'text-red-500'   : 'text-gray-500'
          }`}>
            {trendDir === 'up' ? '↑ ' : trendDir === 'down' ? '↓ ' : ''}
            {trend}
          </p>
        )}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
    </div>
  )
}

// ─── DonutWithTable ───────────────────────────────────────────────────────────
function DonutWithTable({ title, data, colors, total, colLabel = 'ฝ่าย', onRowClick }) {
  const top     = data.slice(0, 9)
  const restSum = data.slice(9).reduce((s, d) => s + d.value, 0)
  const chartData = restSum > 0 ? [...top, { name: 'อื่น ๆ', value: restSum }] : top

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">{title}</h3>
      {onRowClick && (
        <p className="text-[10px] text-gray-400 mb-3">คลิกแถวหรือ slice เพื่อดูรายชื่อ</p>
      )}
      <div className="flex gap-5 items-start">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 148, height: 148 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={68}
                dataKey="value" stroke="none"
                cursor={onRowClick ? 'pointer' : 'default'}
                onClick={onRowClick ? (d) => onRowClick(d.name) : undefined}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(v) => [`${v} คน`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">คน</span>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-1.5 text-gray-500 font-medium">{colLabel}</th>
                <th className="text-right pb-1.5 text-gray-500 font-medium w-20">จำนวน (คน)</th>
                <th className="text-right pb-1.5 text-gray-500 font-medium w-12">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {chartData.map((d, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick && onRowClick(d.name)}
                  className={onRowClick
                    ? 'cursor-pointer hover:bg-blue-50 transition-colors'
                    : ''}
                >
                  <td className="py-1.5 text-gray-700">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: colors[i % colors.length] }}
                      />
                      <span className="truncate" title={d.name}>{d.name}</span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-medium text-gray-800">
                    {d.value.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right text-gray-500">
                    {total > 0 ? ((d.value / total) * 100).toFixed(2) : '0.00'}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="pt-1.5 text-gray-700 font-semibold">
                  <span className="flex items-center gap-1">รวม <span className="text-green-500 text-[10px]">▲</span></span>
                </td>
                <td className="pt-1.5 text-right font-bold text-gray-900">{total.toLocaleString()}</td>
                <td className="pt-1.5 text-right font-semibold text-gray-700">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Custom bar tooltip ────────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="text-gray-600 mb-0.5">{label}</p>
        <p className="font-bold text-blue-600">{payload[0].value.toLocaleString()} คน</p>
      </div>
    )
  }
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard({ lang }) {
  const { filterByCompany } = useCompanyFilter()
  const [loading, setLoading]   = useState(true)
  const [rawActive, setRawActive] = useState([])
  const [rawAll,    setRawAll]    = useState([])
  const [buFilter,   setBuFilter]   = useState('ทั้งหมด')
  const [deptFilter, setDeptFilter] = useState('ทั้งหมด')
  const [panel, setPanel] = useState({ open: false, title: '', subtitle: '', rows: [] })
  const [rhSortKey, setRhSortKey] = useState('hire')
  const [rhSortDir, setRhSortDir] = useState('desc')

  const now = new Date()
  const cy  = now.getFullYear()

  // ── Fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: active }, { data: all }] = await Promise.all([
          supabase.from('hr_employees').select('*').eq('status', 'active'),
          supabase.from('hr_employees').select(
            'id,employee_code,legacy_employee_code,prefix_th,first_name_th,last_name_th,first_name_en,last_name_en,' +
            'gender,date_of_birth,hire_date,resignation_date,resignation_reason,' +
            'department_name_th,position_th,position_en,bu,company_entity,status,nickname'
          )
        ])
        setRawActive(active || [])
        setRawAll(all || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Base filtered lists ───────────────────────────────────────────────────────
  const baseActive = useMemo(() => filterByCompany(rawActive), [rawActive, filterByCompany])
  const baseAll    = useMemo(() => filterByCompany(rawAll),    [rawAll,    filterByCompany])

  // ── Filter options ────────────────────────────────────────────────────────────
  const buOptions = useMemo(() => {
    const s = new Set(baseActive.map(e => e.bu || e.company_entity || 'N/A').filter(Boolean))
    return ['ทั้งหมด', ...Array.from(s).sort()]
  }, [baseActive])

  const deptOptions = useMemo(() => {
    const s = new Set(baseActive.map(e => e.department_name_th || 'N/A').filter(Boolean))
    return ['ทั้งหมด', ...Array.from(s).sort()]
  }, [baseActive])

  // ── Apply dashboard filters ───────────────────────────────────────────────────
  const employees = useMemo(() => {
    let list = baseActive
    if (buFilter   !== 'ทั้งหมด') list = list.filter(e => (e.bu || e.company_entity || 'N/A') === buFilter)
    if (deptFilter !== 'ทั้งหมด') list = list.filter(e => (e.department_name_th || 'N/A') === deptFilter)
    return list
  }, [baseActive, buFilter, deptFilter])

  const allEmployees = useMemo(() => {
    let list = baseAll
    if (buFilter   !== 'ทั้งหมด') list = list.filter(e => (e.bu || e.company_entity || 'N/A') === buFilter)
    if (deptFilter !== 'ทั้งหมด') list = list.filter(e => (e.department_name_th || 'N/A') === deptFilter)
    return list
  }, [baseAll, buFilter, deptFilter])

  // ── Panel helpers ─────────────────────────────────────────────────────────────
  const openPanel  = useCallback((title, subtitle, rows) => {
    setPanel({ open: true, title, subtitle, rows })
  }, [])
  const closePanel = useCallback(() => setPanel(p => ({ ...p, open: false })), [])

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const headers = [
      'รหัสพนักงาน','รหัสพนักงานเดิม','คำนำหน้า',
      'ชื่อ (ไทย)','นามสกุล (ไทย)',
      'ชื่อ (อังกฤษ)','นามสกุล (อังกฤษ)',
      'ตำแหน่ง (ไทย)','ตำแหน่ง (อังกฤษ)',
      'ฝ่าย','BU','บริษัท','วันเริ่มงาน','เพศ','วันเกิด','อายุ','สถานะ','วันที่ลาออก'
    ]
    const now2 = new Date()
    const rows = allEmployees.map(e => {
      const fmtDate = (val) => {
        if (!val) return ''
        const d = new Date(val)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      }
      const statusLabel = e.resignation_date ? 'Resigned' : (e.status === 'active' || !e.status ? 'Active' : e.status)
      return [
        e.employee_code || '',
        e.legacy_employee_code || '',
        e.prefix_th || '',
        e.first_name_th || '',
        e.last_name_th || '',
        e.first_name_en || '',
        e.last_name_en || '',
        e.position_th || '',
        e.position_en || '',
        e.department_name_th || '',
        e.bu || '',
        e.company_entity || '',
        e.hire_date || '',
        e.gender || '',
        fmtDate(e.date_of_birth),
        e.date_of_birth ? Math.floor((now2 - new Date(e.date_of_birth)) / (365.25 * 864e5)).toString() : '',
        statusLabel,
        fmtDate(e.resignation_date)
      ]
    })
    const BOM = '﻿'
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = buFilter !== 'ทั้งหมด' ? buFilter : deptFilter !== 'ทั้งหมด' ? deptFilter : 'all'
    a.download = `hr_employees_${label}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [allEmployees, buFilter, deptFilter])

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total  = employees.length
    const male   = employees.filter(isMale).length
    const female = employees.filter(isFemale).length

    const withDob   = employees.filter(e => e.date_of_birth)
    const ageValues = withDob.map(e => (now - new Date(e.date_of_birth)) / (365.25 * 864e5))
    const avgAge    = ageValues.length > 0
      ? Math.round(ageValues.reduce((s, v) => s + v, 0) / ageValues.length * 10) / 10
      : 0
    const medianAge = calcMedian(ageValues)

    const withHire      = employees.filter(e => isValidHireDate(e.hire_date))
    const tenureValues  = withHire.map(e => (now - new Date(e.hire_date)) / (365.25 * 864e5))
    const avgTenure     = tenureValues.length > 0
      ? Math.round(tenureValues.reduce((s, v) => s + v, 0) / tenureValues.length * 10) / 10
      : 0
    const medianTenure  = calcMedian(tenureValues)

    const newHires = allEmployees.filter(e => isValidHireDate(e.hire_date) && new Date(e.hire_date).getFullYear() === cy).length

    // ลาออกเอง = status 'resigned' + ไม่ใช่ระหว่างทดลองงาน (>= 90 วัน) + ไม่ใช่ Layoff ('terminated')
    const resigned = allEmployees.filter(e => {
      if (e.status !== 'resigned') return false                          // ตัด terminated (Layoff)
      const rd = e.resignation_date ? new Date(e.resignation_date) : null
      if (!rd || rd.getFullYear() !== cy) return false
      const hd = e.hire_date ? new Date(e.hire_date) : null
      if (hd && (rd - hd) < 90 * 864e5) return false                   // ตัดลาออกระหว่างทดลองงาน
      return true
    }).length

    // ไม่ผ่านทดลองงาน = status 'resigned' + ลาออกระหว่างทดลองงาน (< 90 วันนับจากวันเริ่มงาน)
    const notPassProbation = allEmployees.filter(e => {
      if (e.status !== 'resigned') return false
      const rd = e.resignation_date ? new Date(e.resignation_date) : null
      if (!rd || rd.getFullYear() !== cy) return false
      const hd = e.hire_date ? new Date(e.hire_date) : null
      return hd && (rd - hd) < 90 * 864e5
    }).length

    const terminated = allEmployees.filter(e => {
      if (e.status !== 'terminated') return false
      const rd = e.resignation_date ? new Date(e.resignation_date) : null
      return rd && rd.getFullYear() === cy
    }).length

    // จำนวนพนักงานคงเหลือ ณ วันที่ 31 ธันวาคมของปีก่อนหน้า (snapshot จริง ไม่ใช่คำนวณย้อนกลับ)
    // = คนที่เริ่มงานมาแล้วก่อน/เท่ากับวันนั้น และยังไม่ออก (หรือออกหลังวันนั้น)
    const yearEndPrev = new Date(cy - 1, 11, 31, 23, 59, 59)
    const beginCount = allEmployees.filter(e => {
      const hd = e.hire_date ? new Date(e.hire_date) : null
      if (!hd || hd > yearEndPrev) return false
      if (e.status === 'resigned' || e.status === 'terminated') {
        const rd = e.resignation_date ? new Date(e.resignation_date) : null
        if (rd && rd <= yearEndPrev) return false
      }
      return true
    }).length

    // ยอดพนักงานปัจจุบัน (วันนี้) ตามสูตร = ต้นปี + เข้าใหม่ - ลาออก - ไม่ผ่านทดลองงาน - พ้นสภาพ
    const netChangeYTD = newHires - resigned - notPassProbation - terminated
    const currentByFormula = beginCount + netChangeYTD
    const avgHead      = (beginCount + total) / 2
    const turnoverRate = avgHead > 0 ? Math.round((resigned / avgHead) * 1000) / 10 : 0
    const ytdPct       = beginCount > 0 ? Math.round((netChangeYTD / beginCount) * 10000) / 100 : 0

    return { total, male, female, avgAge, medianAge, avgTenure, medianTenure, newHires, resigned, notPassProbation, terminated, turnoverRate, beginCount, netChangeYTD, currentByFormula, ytdPct }
  }, [employees, allEmployees, cy])

  // ── YTD lists (for panels) ────────────────────────────────────────────────────
  const newHiresList = useMemo(() =>
    allEmployees.filter(e => isValidHireDate(e.hire_date) && new Date(e.hire_date).getFullYear() === cy),
  [allEmployees, cy])

  const resignedList = useMemo(() =>
    allEmployees.filter(e => {
      if (e.status !== 'resigned') return false
      const rd = e.resignation_date ? new Date(e.resignation_date) : null
      if (!rd || rd.getFullYear() !== cy) return false
      const hd = e.hire_date ? new Date(e.hire_date) : null
      if (hd && (rd - hd) < 90 * 864e5) return false
      return true
    }),
  [allEmployees, cy])

  const terminatedList = useMemo(() =>
    allEmployees.filter(e => {
      if (e.status !== 'terminated') return false
      const rd = e.resignation_date ? new Date(e.resignation_date) : null
      return rd && rd.getFullYear() === cy
    }),
  [allEmployees, cy])

  // ── Chart data ────────────────────────────────────────────────────────────────
  const deptData = useMemo(() => {
    const map = {}
    employees.forEach(e => { const d = e.department_name_th || 'อื่น ๆ'; map[d] = (map[d] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [employees])

  const buData = useMemo(() => {
    const map = {}
    employees.forEach(e => { const b = e.bu || e.company_entity || 'อื่น ๆ'; map[b] = (map[b] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [employees])

  const companyData = useMemo(() => {
    const map = {}
    employees.forEach(e => { const c = e.company_entity || 'อื่น ๆ'; map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [employees])

  const ageData = useMemo(() =>
    AGE_BANDS.map(b => ({
      label: b.label, min: b.min, max: b.max,
      value: employees.filter(e => {
        if (!e.date_of_birth) return false
        const age = (now - new Date(e.date_of_birth)) / (365.25 * 864e5)
        return age >= b.min && age < b.max
      }).length,
    })),
  [employees])

  const tenureByDept = useMemo(() => {
    const map = {}
    employees.filter(e => isValidHireDate(e.hire_date) && e.department_name_th).forEach(e => {
      const dept = e.department_name_th
      const yrs  = (now - new Date(e.hire_date)) / (365.25 * 864e5)
      if (!map[dept]) map[dept] = []
      map[dept].push(yrs)
    })
    return Object.entries(map)
      .map(([fullName, values]) => {
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const median = sorted.length % 2 !== 0
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2
        return {
          fullName,
          name: fullName.length > 22 ? fullName.slice(0, 22) + '…' : fullName,
          value: Math.round(median * 10) / 10,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [employees])

  const recentHires = useMemo(() =>
    [...allEmployees]
      .filter(e => isValidHireDate(e.hire_date))
      .sort((a, b) => new Date(b.hire_date) - new Date(a.hire_date))
      .slice(0, 5),
  [allEmployees])

  const recentHiresSorted = useMemo(() => {
    return [...recentHires].sort((a, b) => {
      if (rhSortKey === 'tenure') {
        const m = (e) => {
          if (!e.hire_date) return -1
          const s = new Date(e.hire_date)
          return (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth())
        }
        return rhSortDir === 'asc' ? m(a) - m(b) : m(b) - m(a)
      }
      let va, vb
      if      (rhSortKey === 'name')     { va = empName(a);                   vb = empName(b) }
      else if (rhSortKey === 'position') { va = a.position_th || '';           vb = b.position_th || '' }
      else if (rhSortKey === 'dept')     { va = a.department_name_th || '';    vb = b.department_name_th || '' }
      else if (rhSortKey === 'bu')       { va = a.bu || a.company_entity || ''; vb = b.bu || b.company_entity || '' }
      else if (rhSortKey === 'status')   { va = a.status || '';                vb = b.status || '' }
      else                               { va = a.hire_date || '';             vb = b.hire_date || '' }
      const cmp = va.localeCompare(vb, 'th')
      return rhSortDir === 'asc' ? cmp : -cmp
    })
  }, [recentHires, rhSortKey, rhSortDir])

  const handleRhSort = (key) => {
    if (rhSortKey === key) setRhSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setRhSortKey(key); setRhSortDir('asc') }
  }

  // ── Chart click handlers ──────────────────────────────────────────────────────
  const onDeptClick = useCallback((name) => {
    const rows = employees.filter(e => (e.department_name_th || 'อื่น ๆ') === name)
    openPanel(`ฝ่าย ${name}`, `พนักงาน ${rows.length} คน ในฝ่ายนี้`, rows)
  }, [employees, openPanel])

  const onBUClick = useCallback((name) => {
    const rows = employees.filter(e => (e.bu || e.company_entity || 'อื่น ๆ') === name)
    openPanel(`BU: ${name}`, `พนักงาน ${rows.length} คน ใน Business Unit นี้`, rows)
  }, [employees, openPanel])

  const onCompanyClick = useCallback((name) => {
    const rows = employees.filter(e => (e.company_entity || 'อื่น ๆ') === name)
    openPanel(`บริษัท: ${name}`, `พนักงาน ${rows.length} คน`, rows)
  }, [employees, openPanel])

  const onAgeBarClick = useCallback((data) => {
    const { min, max, label } = data
    const rows = employees.filter(e => {
      if (!e.date_of_birth) return false
      const age = (new Date() - new Date(e.date_of_birth)) / (365.25 * 864e5)
      return age >= min && age < max
    })
    openPanel(`ช่วงอายุ ${label} ปี`, `พนักงาน ${rows.length} คน ในช่วงอายุนี้`, rows)
  }, [employees, openPanel])

  const onTenureBarClick = useCallback((data) => {
    const deptName = data.fullName
    const rows = employees.filter(e => e.department_name_th === deptName)
    openPanel(
      deptName,
      `พนักงาน ${rows.length} คน | อายุงานเฉลี่ย ${data.value} ปี`,
      rows
    )
  }, [employees, openPanel])

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-5 space-y-5 bg-gray-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ดพนักงาน</h1>
          <p className="text-sm text-gray-400 mt-0.5">ภาพรวมข้อมูลพนักงานขององค์กร • คลิกที่ข้อมูลเพื่อดูรายละเอียด</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">
            <span>ข้อมูล ณ วันที่</span>
            <span className="font-medium">{thDate(now)}</span>
            <Calendar className="w-4 h-4 text-gray-400 ml-1" />
          </div>
          <select
            value={buFilter}
            onChange={e => setBuFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
          >
            {buOptions.map(o => (
              <option key={o} value={o}>{o === 'ทั้งหมด' ? 'ทั้งหมด (BU)' : o}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer max-w-[200px]"
          >
            {deptOptions.map(o => (
              <option key={o} value={o}>{o === 'ทั้งหมด' ? 'ทั้งหมด (ฝ่าย)' : o}</option>
            ))}
          </select>
          <button onClick={handleExport} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg
                             px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            ส่งออกข้อมูล
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Users} bgColor="bg-blue-100" iconColor="text-blue-600"
          label="พนักงานทั้งหมด"
          value={`${kpis.total.toLocaleString()} คน`}
          trend={`พนักงาน${kpis.netChangeYTD >= 0 ? 'เพิ่ม' : 'ลดลง'} ${Math.abs(kpis.netChangeYTD)} คน (${Math.abs(kpis.ytdPct)}%) จากต้นปี`}
          trendDir={kpis.netChangeYTD >= 0 ? 'up' : 'down'}
          onClick={() => openPanel('พนักงานทั้งหมด', `Active ${employees.length} คน`, employees)}
        />
        <KpiCard
          icon={User} bgColor="bg-teal-100" iconColor="text-teal-600"
          label="พนักงานชาย"
          value={`${kpis.male.toLocaleString()} คน`}
          sub={`${kpis.total > 0 ? ((kpis.male / kpis.total) * 100).toFixed(2) : '0.00'}% ของทั้งหมด`}
          onClick={() => openPanel('พนักงานชาย', `${kpis.male} คน`, employees.filter(isMale))}
        />
        <KpiCard
          icon={User} bgColor="bg-purple-100" iconColor="text-purple-600"
          label="พนักงานหญิง"
          value={`${kpis.female.toLocaleString()} คน`}
          sub={`${kpis.total > 0 ? ((kpis.female / kpis.total) * 100).toFixed(2) : '0.00'}% ของทั้งหมด`}
          onClick={() => openPanel('พนักงานหญิง', `${kpis.female} คน`, employees.filter(isFemale))}
        />
        <KpiCard
          icon={Users} bgColor="bg-orange-100" iconColor="text-orange-600"
          label="อายุเฉลี่ย"
          value={`${kpis.avgAge} ปี`}
          sub={`มัธยฐาน ${kpis.medianAge} ปี · อายุงานเฉลี่ย ${kpis.avgTenure} ปี · มัธยฐาน ${kpis.medianTenure} ปี`}
          onClick={() => {
            const sorted = [...employees]
              .filter(e => e.date_of_birth)
              .sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth))
            openPanel('ข้อมูลอายุพนักงาน', `อายุเฉลี่ย ${kpis.avgAge} ปี | มัธยฐาน ${kpis.medianAge} ปี | อายุงานเฉลี่ย ${kpis.avgTenure} ปี | มัธยฐาน ${kpis.medianTenure} ปี`, sorted)
          }}
        />
        <KpiCard
          icon={TrendingUp} bgColor="bg-blue-100" iconColor="text-blue-600"
          label="อัตราการลาออก (YTD)"
          value={`${kpis.turnoverRate}%`}
          trend={`ลาออก ${kpis.resigned} คน YTD`}
          trendDir={kpis.turnoverRate > 10 ? 'up' : 'down'}
          onClick={() => openPanel(`พนักงานที่ลาออก (YTD ${cy})`, `${resignedList.length} คน`, resignedList)}
        />
      </div>

      {/* ── Company Distribution (แสดงเฉพาะกรณีทุกบริษัท) ── */}
      {companyData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-800">จำนวนพนักงานแยกตามบริษัท</h3>
            <span className="text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md font-medium">ทุกบริษัท</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-4">คลิกแถบหรือรายการเพื่อดูรายชื่อพนักงาน</p>
          <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">

            {/* Horizontal Bar Chart */}
            <div className="w-full lg:w-3/5" style={{ minHeight: Math.max(140, companyData.length * 48) }}>
              <ResponsiveContainer width="100%" height={Math.max(140, companyData.length * 48)}>
                <BarChart
                  data={companyData}
                  layout="vertical"
                  barSize={26}
                  margin={{ left: 0, right: 52, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                    tickLine={false} axisLine={false} width={64}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="value" radius={[0, 6, 6, 0]}
                    cursor="pointer"
                    onClick={(d) => onCompanyClick(d.name)}
                  >
                    {companyData.map((_, i) => (
                      <Cell key={i} fill={COMPANY_COLORS[i % COMPANY_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="value" position="right"
                      style={{ fontSize: 12, fill: '#374151', fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Table */}
            <div className="flex-1 min-w-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-gray-500 font-medium">บริษัท</th>
                    <th className="text-right pb-2 text-gray-500 font-medium w-20">จำนวน (คน)</th>
                    <th className="text-right pb-2 text-gray-500 font-medium w-14">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companyData.map((d, i) => (
                    <tr
                      key={i}
                      onClick={() => onCompanyClick(d.name)}
                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                      <td className="py-2 text-gray-700">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: COMPANY_COLORS[i % COMPANY_COLORS.length] }}
                          />
                          <span className="font-medium">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-800">
                        {d.value.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        {kpis.total > 0 ? ((d.value / kpis.total) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="pt-2 text-gray-700 font-semibold">รวม</td>
                    <td className="pt-2 text-right font-bold text-gray-900">{kpis.total.toLocaleString()}</td>
                    <td className="pt-2 text-right font-semibold text-gray-700">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 2: Donut Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DonutWithTable
          title="จำนวนพนักงานแยกตามฝ่าย"
          data={deptData} colors={DEPT_COLORS} total={kpis.total} colLabel="ฝ่าย"
          onRowClick={onDeptClick}
        />
        <DonutWithTable
          title="จำนวนพนักงานแยกตาม BU"
          data={buData} colors={BU_COLORS} total={kpis.total} colLabel="BU"
          onRowClick={onBUClick}
        />
      </div>

      {/* ── Row 3: Movement + Age + Tenure ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Employee Movement */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-800">การเปลี่ยนแปลงพนักงาน</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">YTD</span>
          </div>
          <div className="space-y-3">
            <div
              onClick={() => openPanel(`พนักงานเข้าใหม่ (YTD ${cy})`, `รับเข้า ${newHiresList.length} คน ในปี ${cy}`, newHiresList)}
              className="flex items-center justify-between p-3.5 bg-green-50 rounded-xl
                         cursor-pointer hover:bg-green-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">เข้าใหม่</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-green-600">{kpis.newHires} คน</span>
                <ChevronRight className="w-4 h-4 text-green-400" />
              </div>
            </div>

            <div
              onClick={() => openPanel(`พนักงานที่ลาออก (YTD ${cy})`, `ลาออก ${resignedList.length} คน ในปี ${cy}`, resignedList)}
              className="flex items-center justify-between p-3.5 bg-red-50 rounded-xl
                         cursor-pointer hover:bg-red-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <UserMinus className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm text-gray-700 font-medium">ลาออก</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-red-500">{kpis.resigned} คน</span>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </div>
            </div>

            <div
              onClick={() => openPanel(`พนักงานพ้นสภาพ (YTD ${cy})`, `พ้นสภาพ ${terminatedList.length} คน ในปี ${cy}`, terminatedList)}
              className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <UserMinus className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm text-gray-700 font-medium">พ้นสภาพ (Layoff)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-bold text-gray-600">{kpis.terminated} คน</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
              <span className="text-sm font-bold text-gray-800">สุทธิ</span>
              <span className={`text-2xl font-bold ${kpis.newHires - kpis.resigned - kpis.terminated >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {kpis.newHires - kpis.resigned - kpis.terminated >= 0 ? '+' : ''}{kpis.newHires - kpis.resigned - kpis.terminated} คน
              </span>
            </div>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">ช่วงอายุพนักงาน</h3>
          <p className="text-[10px] text-gray-400 mb-3">คลิกแถบเพื่อดูรายชื่อ • จำนวน (คน)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData} barSize={30} margin={{ top: 8, right: 8, bottom: 28, left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-25} textAnchor="end" interval={0}
                tickLine={false} axisLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}
                cursor="pointer" onClick={onAgeBarClick}
              >
                <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Tenure by Dept */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">มัธยฐานอายุงานแยกตามฝ่าย (ปี)</h3>
          {tenureByDept.length > 0 ? (
            <>
              <p className="text-[10px] text-gray-400 mb-3">คลิกแถบเพื่อดูรายชื่อ</p>
              <ResponsiveContainer width="100%" height={Math.max(180, tenureByDept.length * 28)}>
                <BarChart data={tenureByDept} layout="vertical" barSize={14} margin={{ left: 0, right: 36, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#374151' }} tickLine={false} axisLine={false} width={138} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v, _, p) => [v + ' ปี', p.payload.fullName || p.payload.name]}
                  />
                  <Bar
                    dataKey="value" fill="#93c5fd" radius={[0, 4, 4, 0]}
                    cursor="pointer" onClick={onTenureBarClick}
                  >
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">ไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* ── Row 4: Recent New Hires ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">พนักงานเข้าใหม่ล่าสุด</h3>
          <button
            onClick={() => openPanel(`พนักงานเข้าใหม่ทั้งหมด (YTD ${cy})`, `รับเข้า ${newHiresList.length} คน ในปี ${cy}`, newHiresList)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors"
          >
            ดูทั้งหมด ({newHiresList.length} คน)
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { key: 'name',     label: 'ชื่อ-สกุล',      align: 'left',  cls: 'w-72' },
                  { key: 'position', label: 'ตำแหน่ง',         align: 'left',  cls: 'w-44' },
                  { key: 'dept',     label: 'ฝ่าย',            align: 'left',  cls: 'w-36' },
                  { key: 'bu',       label: 'BU',              align: 'left',  cls: 'w-20' },
                  { key: 'hire',     label: 'วันที่เริ่มงาน', align: 'left',  cls: 'w-32' },
                  { key: 'status',   label: 'สถานะ',           align: 'left',  cls: 'w-24' },
                  { key: 'tenure',   label: 'อายุงาน',         align: 'right', cls: 'w-24' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleRhSort(col.key)}
                    className={`${col.align === 'right' ? 'text-right' : 'text-left'} py-2 text-xs font-medium text-gray-500 cursor-pointer select-none hover:text-[#78c045] transition-colors whitespace-nowrap ${col.cls}`}
                  >
                    {col.label}
                    {rhSortKey === col.key
                      ? <span className="ml-0.5 text-[10px] text-[#78c045]">{rhSortDir === 'asc' ? '▲' : '▼'}</span>
                      : <span className="ml-0.5 text-[10px] text-gray-300">⇅</span>
                    }
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentHiresSorted.map((e, i) => {
                const name = empName(e)
                const initial = name !== '-' ? name.replace(/^(นาย|นาง|นางสาว|ดร\.|คุณ)\s*/, '').trim().slice(0, 1) : '?'
                const avatarColors = ['bg-blue-200 text-blue-700','bg-green-200 text-green-700','bg-purple-200 text-purple-700','bg-orange-200 text-orange-700','bg-teal-200 text-teal-700']
                const daysSince = e.hire_date ? Math.floor((now - new Date(e.hire_date)) / 864e5) : null
                const isProbation = daysSince !== null && daysSince < 90
                const stLabel = isProbation ? 'ทดลองงาน' : (e.status === 'active' ? 'ทำงาน' : (e.status || '-'))
                const stCls   = isProbation ? 'bg-yellow-100 text-yellow-700' : (e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')
                const tenure  = (() => {
                  if (!e.hire_date) return '-'
                  const s = new Date(e.hire_date)
                  let yrs = now.getFullYear() - s.getFullYear()
                  let mos = now.getMonth() - s.getMonth()
                  if (mos < 0) { yrs--; mos += 12 }
                  if (yrs === 0) return `${mos} เดือน`
                  if (mos === 0) return `${yrs} ปี`
                  return `${yrs} ปี ${mos} เดือน`
                })()
                return (
                  <tr
                    key={e.id || i}
                    onClick={() => openPanel(name, `${e.position_th || e.position_en || '-'} | ${e.department_name_th || '-'}`, [e])}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 text-gray-800 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${avatarColors[i % avatarColors.length]}`}>
                          {initial}
                        </div>
                        <div className="truncate max-w-[220px]" title={e.nickname ? `${name} (${e.nickname})` : name}>
                          <span>{name}</span>
                          {e.nickname && <span className="text-gray-400 text-xs ml-1">({e.nickname})</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 max-w-[176px]">
                      <span className="truncate block max-w-[160px]" title={e.position_th || e.position_en}>
                        {e.position_th || e.position_en || '-'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">
                      <span className="truncate block max-w-[130px]" title={e.department_name_th}>
                        {e.department_name_th || '-'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600 whitespace-nowrap">{e.bu || e.company_entity || '-'}</td>
                    <td className="py-3 text-gray-500 whitespace-nowrap">
                      {e.hire_date ? thDate(e.hire_date) : '-'}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stCls}`}>
                        {stLabel}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-right whitespace-nowrap">{tenure}</td>
                  </tr>
                )
              })}
              {recentHiresSorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SlidePanel ── */}
      <SlidePanel panel={panel} onClose={closePanel} />

    </div>
  )
}

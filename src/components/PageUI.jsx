import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

// OA Design System page header — #78c045 green
export function PageHeader({ title, subtitle, lang }) {
  return (
    <div className="bg-gradient-to-r from-[#78c045] to-[#5a9030] rounded-xl px-6 py-4 mb-5 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="text-white/70 text-xs">efin HRS</div>
    </div>
  )
}

// KPI stat card matching mockup style
export function KPICard({ icon: Icon, iconBg = 'bg-blue-100', iconColor = 'text-blue-600', label, value, sub, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{label}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-1 mt-1">
            {trend && (
              <span className={`flex items-center text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {trend}
              </span>
            )}
            {sub && <span className="text-xs text-gray-400">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// Section card with optional title
export function Section({ title, action, children, className = '', noPad = false }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          {action}
        </div>
      )}
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  )
}

// Right detail panel
export function DetailPanel({ children, className = '' }) {
  return (
    <div className={`w-full lg:w-80 flex-shrink-0 space-y-4 ${className}`}>
      {children}
    </div>
  )
}

// Avatar with initials
export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-[#f0f9e8]0', 'bg-red-400']
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  const initials = (name || '?').charAt(0)
  return (
    <div className={`${sizes[size]} ${colors[idx]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {initials}
    </div>
  )
}

// Status badge
export function StatusBadge({ status, labels }) {
  const map = {
    active: { bg: 'bg-green-100 text-green-700', label: 'Active' },
    probation: { bg: 'bg-yellow-100 text-yellow-700', label: 'ทดลองงาน' },
    resigned: { bg: 'bg-red-100 text-red-700', label: 'ลาออก' },
    probation_leaver: { bg: 'bg-orange-100 text-orange-700', label: 'ออกระหว่างทดลองงาน' },
    fulltime: { bg: 'bg-blue-100 text-blue-700', label: 'ประจำ' },
    contract: { bg: 'bg-orange-100 text-orange-700', label: 'สัญญาจ้าง' },
    outsource: { bg: 'bg-purple-100 text-purple-700', label: 'Outsource' },
    completed: { bg: 'bg-green-100 text-green-700', label: 'เสร็จสิ้น' },
    pending: { bg: 'bg-yellow-100 text-yellow-700', label: 'รออนุมัติ' },
    approved: { bg: 'bg-green-100 text-green-700', label: 'อนุมัติ' },
    rejected: { bg: 'bg-red-100 text-red-700', label: 'ไม่อนุมัติ' },
    ontime: { bg: 'bg-green-100 text-green-700', label: 'ตรงเวลา' },
    late: { bg: 'bg-orange-100 text-orange-700', label: 'สาย' },
    absent: { bg: 'bg-red-100 text-red-700', label: 'ขาดงาน' },
    leave: { bg: 'bg-blue-100 text-blue-700', label: 'ลา' },
  }
  const s = map[status] || { bg: 'bg-gray-100 text-gray-600', label: status }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>{labels?.[status] || s.label}</span>
}

// Mini bar for pipeline/funnel
export function PipelineBar({ stages }) {
  const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-orange-500', 'bg-green-500']
  const max = Math.max(...stages.map(s => s.count), 1)
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-20 text-right truncate">{s.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
            <div className={`h-full rounded-full ${colors[i % colors.length]} flex items-center justify-end pr-2 transition-all`}
              style={{ width: `${Math.max((s.count / max) * 100, 8)}%` }}>
              <span className="text-xs text-white font-bold">{s.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Tab pills
export function TabPills({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            active === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          {t.label} {t.count != null && <span className="ml-1 text-gray-400">({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

// Progress bar
export function ProgressBar({ value, max = 100, color = 'bg-blue-500', className = '' }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2 ${className}`}>
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Score circle
export function ScoreCircle({ score, max = 5, size = 80, label }) {
  const pct = (score / max) * 100
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3b82f6" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round" />
      </svg>
      <span className="text-lg font-bold text-gray-900 -mt-12">{score}</span>
      {label && <span className="text-xs text-gray-400 mt-6">{label}</span>}
    </div>
  )
}

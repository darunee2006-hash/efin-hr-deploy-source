import React, { useState, useEffect } from 'react'
import { Search, X, ChevronDown, RefreshCw } from 'lucide-react'

// ─── OA Design System tokens ──────────────────────────────────────────────────
const OA_GREEN       = '#78c045'
const OA_GREEN_DARK  = '#5a9030'
const OA_GREEN_LIGHT = '#f0f9e8'
const OA_GREEN_MID   = 'rgba(120,192,69,0.15)'
const OA_BORDER      = '#e0e0e0'
const OA_TEXT        = '#333333'
const OA_TEXT_SEC    = '#474747'
const OA_TEXT_DIM    = '#888888'
const OA_SURFACE     = '#f6f6f6'
const OA_RADIUS      = '10px'

export function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-[#f0f9e8] text-[#5a9030]',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    gray:   'bg-gray-100 text-gray-600',
    indigo: 'bg-[#f0f9e8] text-[#78c045]',
    orange: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

export function StatCard({ icon: Icon, label, value, sub, color = 'green' }) {
  const colors = {
    green:  { bg: OA_GREEN_LIGHT, text: OA_GREEN },
    indigo: { bg: OA_GREEN_LIGHT, text: OA_GREEN },
    blue:   { bg: '#eff6ff',      text: '#2563eb' },
    purple: { bg: '#f5f3ff',      text: '#7c3aed' },
    orange: { bg: '#fff7ed',      text: '#ea580c' },
    red:    { bg: '#fef2f2',      text: '#dc2626' },
  }
  const c = colors[color] || colors.green
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3"
      style={{ borderRadius: OA_RADIUS, boxShadow: 'rgba(0,0,0,0.05) 0px 4px 12px 0px' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.bg, color: c.text, borderRadius: '8px' }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs" style={{ color: OA_TEXT_DIM }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: OA_TEXT }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: OA_TEXT_DIM }}>{sub}</p>}
      </div>
    </div>
  )
}

export function Card({ title, children, action, className = '' }) {
  return (
    <div className={`bg-white ${className}`}
      style={{ borderRadius: OA_RADIUS, border: `1px solid ${OA_BORDER}`, boxShadow: 'rgba(0,0,0,0.04) 0px 4px 12px 0px' }}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${OA_BORDER}` }}>
          <h3 className="font-semibold text-sm" style={{ color: OA_TEXT }}>{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: OA_TEXT_DIM }} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm outline-none transition-shadow"
        style={{
          border: `1px solid ${OA_BORDER}`,
          borderRadius: OA_RADIUS,
          fontFamily: "'FC Minimal', sans-serif",
          color: OA_TEXT,
          background: '#fff',
        }}
        onFocus={e => { e.target.style.borderColor = OA_GREEN; e.target.style.boxShadow = `0 0 0 2px ${OA_GREEN_MID}` }}
        onBlur={e =>  { e.target.style.borderColor = OA_BORDER; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, type = 'button' }) {
  const base = 'inline-flex items-center gap-1.5 font-medium transition-all disabled:opacity-50'
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  }

  const styleMap = {
    primary: {
      background: OA_GREEN, color: '#fff',
      border: 'none', borderRadius: OA_RADIUS,
    },
    secondary: {
      background: '#fff', color: OA_TEXT_SEC,
      border: `1px solid ${OA_BORDER}`, borderRadius: OA_RADIUS,
    },
    danger: {
      background: '#dc2626', color: '#fff',
      border: 'none', borderRadius: OA_RADIUS,
    },
    ghost: {
      background: 'transparent', color: OA_TEXT_SEC,
      border: 'none', borderRadius: OA_RADIUS,
    },
  }

  const hoverMap = {
    primary:   { background: OA_GREEN_DARK },
    secondary: { background: OA_SURFACE },
    danger:    { background: '#b91c1c' },
    ghost:     { background: OA_SURFACE },
  }

  const [hovered, setHovered] = useState(false)
  const s = { ...(styleMap[variant] || styleMap.primary), ...(hovered ? hoverMap[variant] : {}) }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={s}
      className={`${base} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Modal({ open, isOpen, onClose, title, children, wide = false, maxWidth }) {
  if (!open && !isOpen) return null
  const maxWidthMap = {
    sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl',
    '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl', '6xl': 'max-w-6xl',
  }
  const widthClass = maxWidth ? (maxWidthMap[maxWidth] || 'max-w-4xl') : (wide ? 'max-w-4xl' : 'max-w-lg')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white ${widthClass} w-full max-h-[90vh] overflow-y-auto`}
        style={{ borderRadius: '12px', boxShadow: 'rgba(0,0,0,0.15) 0px 20px 40px 0px' }}>
        <div className="flex items-center justify-between p-4"
          style={{ borderBottom: `1px solid ${OA_BORDER}` }}>
          <h3 className="font-semibold" style={{ color: OA_TEXT }}>{title}</h3>
          <button onClick={onClose}
            className="p-1 transition-colors"
            style={{ borderRadius: '8px', color: OA_TEXT_DIM }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = OA_SURFACE}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Select({ value, onChange, options, placeholder, className = '', children, label, name, error, required }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: OA_TEXT_SEC }}>
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <select
        value={value}
        name={name}
        onChange={onChange}
        className={`text-sm outline-none bg-white w-full transition-shadow ${className}`}
        style={{
          border: `1px solid ${error ? '#ef4444' : OA_BORDER}`,
          borderRadius: OA_RADIUS,
          padding: '8px 12px',
          fontFamily: "'FC Minimal', sans-serif",
          color: OA_TEXT,
        }}
        onFocus={e => { e.target.style.borderColor = OA_GREEN; e.target.style.boxShadow = `0 0 0 2px ${OA_GREEN_MID}` }}
        onBlur={e =>  { e.target.style.borderColor = error ? '#ef4444' : OA_BORDER; e.target.style.boxShadow = 'none' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children ? children : options?.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Input({ label, error, required, className: _cls, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1" style={{ color: OA_TEXT_SEC }}>
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        {...props}
        className="w-full text-sm outline-none transition-shadow"
        style={{
          border: `1px solid ${error ? '#ef4444' : OA_BORDER}`,
          borderRadius: OA_RADIUS,
          padding: '8px 12px',
          fontFamily: "'FC Minimal', sans-serif",
          color: OA_TEXT,
          background: '#fff',
          ...(props.style || {}),
        }}
        onFocus={e => { e.target.style.borderColor = OA_GREEN; e.target.style.boxShadow = `0 0 0 2px ${OA_GREEN_MID}` }}
        onBlur={e =>  { e.target.style.borderColor = error ? '#ef4444' : OA_BORDER; e.target.style.boxShadow = 'none' }}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Table({ columns, data, onRowClick, emptyText = 'No data' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: `1px solid ${OA_BORDER}` }}>
            {columns.map((col, i) => (
              <th key={i} className="text-left py-2.5 px-3 text-xs uppercase tracking-wider whitespace-nowrap font-semibold"
                style={{ color: OA_TEXT_SEC }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8" style={{ color: OA_TEXT_DIM }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer transition-colors' : ''}
                style={{ borderBottom: `1px solid ${OA_SURFACE}` }}
                onMouseEnter={e => { if (onRowClick) e.currentTarget.style.backgroundColor = OA_GREEN_LIGHT }}
                onMouseLeave={e => { if (onRowClick) e.currentTarget.style.backgroundColor = '' }}
              >
                {columns.map((col, j) => (
                  <td key={j} className="py-2.5 px-3 whitespace-nowrap" style={{ color: OA_TEXT }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  const [internalActive, setInternalActive] = React.useState(0)
  const hasContent = tabs.some(t => t.content)
  const currentIdx = hasContent ? internalActive : null

  return (
    <div>
      <div className="flex gap-1 p-1" style={{ background: OA_SURFACE, borderRadius: OA_RADIUS }}>
        {tabs.map((tab, i) => {
          const key = tab.key || i
          const isActive = hasContent ? i === currentIdx : active === tab.key
          return (
            <button
              key={key}
              onClick={() => {
                if (hasContent) setInternalActive(i)
                else onChange?.(tab.key)
              }}
              className="px-3 py-1.5 text-sm font-medium transition-all"
              style={{
                borderRadius: '8px',
                background:   isActive ? '#fff' : 'transparent',
                color:        isActive ? OA_GREEN : OA_TEXT_SEC,
                fontWeight:   isActive ? 600 : 400,
                boxShadow:    isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {hasContent && tabs[currentIdx]?.content}
    </div>
  )
}

export function LoadingSpinner({ onRetry }) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ border: `3px solid ${OA_GREEN_LIGHT}`, borderTopColor: OA_GREEN }} />
      {slow && (
        <div className="text-center mt-2">
          <p className="text-sm mb-2" style={{ color: OA_TEXT_DIM }}>โหลดนานกว่าปกติ...</p>
          <button
            onClick={() => { if (onRetry) onRetry(); else window.location.reload() }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ borderRadius: OA_RADIUS, background: OA_GREEN_LIGHT, color: OA_GREEN }}
            onMouseEnter={e => e.currentTarget.style.background = OA_GREEN_MID}
            onMouseLeave={e => e.currentTarget.style.background = OA_GREEN_LIGHT}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเฟรช
          </button>
        </div>
      )}
    </div>
  )
}

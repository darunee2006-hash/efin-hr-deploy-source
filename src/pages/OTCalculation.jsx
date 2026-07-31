import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ============================================================
// OA Design System — Online Asset Co., Ltd.
// ============================================================
const OA = {
  bg: '#ffffff', bgSoft: '#f6f6f6', text: '#333333', muted: '#474747',
  accent: '#78c045', blue: '#1692dc', teal: '#00afab', red: '#ff5252', dark: '#4e4e4e',
  border: 'rgba(26,26,26,0.12)',
}
const SHADOW = 'rgba(0,0,0,0.05) 0px 10px 20px 0px'
const SHADOW_MID = 'rgba(0,0,0,0.10) 0px 5px 10px 0px'

// ============================================================
// OT Calculation Logic (Thai Labour Law)
// ============================================================
// Weekday OT: hours beyond 8h = 1.5x hourly rate
// Weekend/Holiday: first 8h = 1x supplement (2x total), beyond 8h = 3x
function calcOT({ startTime, endTime, dayType, hourlyRate, restDeducted }) {
  if (!startTime || !endTime || !hourlyRate) return null
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  let endMin = toMin(endTime)
  const startMin = toMin(startTime)
  if (endMin <= startMin) endMin += 24 * 60 // overnight
  const rawHours = (endMin - startMin) / 60
  const rest = parseFloat(restDeducted) || 0
  const netHours = Math.max(0, rawHours - rest)
  let ot1x = 0, ot15x = 0, ot3x = 0
  if (dayType === 'weekday') {
    ot15x = Math.max(0, netHours - 8)
  } else {
    ot1x = Math.min(netHours, 8)
    ot3x = Math.max(0, netHours - 8)
  }
  const r = hourlyRate
  return {
    rawHours: +rawHours.toFixed(2),
    restDeducted: rest,
    netHours: +netHours.toFixed(2),
    ot1xHours: +ot1x.toFixed(2),
    ot15xHours: +ot15x.toFixed(2),
    ot3xHours: +ot3x.toFixed(2),
    ot1xAmount: +(ot1x * r * 1).toFixed(2),
    ot15xAmount: +(ot15x * r * 1.5).toFixed(2),
    ot3xAmount: +(ot3x * r * 3).toFixed(2),
    totalAmount: +((ot1x * r) + (ot15x * r * 1.5) + (ot3x * r * 3)).toFixed(2),
  }
}

// ============================================================
// Shared UI Components
// ============================================================
function Card({ children, style }) {
  return (
    <div style={{ background: OA.bg, borderRadius: 10, boxShadow: SHADOW, padding: 24, ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: OA.text, marginBottom: 18 }}>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: OA.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function Input({ style, ...props }) {
  return (
    <input style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${OA.border}`, fontSize: 14, color: OA.text, outline: 'none', background: OA.bgSoft, boxSizing: 'border-box', ...style }} {...props} />
  )
}

function Select({ children, style, ...props }) {
  return (
    <select style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${OA.border}`, fontSize: 14, color: OA.text, outline: 'none', background: OA.bgSoft, boxSizing: 'border-box', cursor: 'pointer', ...style }} {...props}>
      {children}
    </select>
  )
}

function KPI({ label, value, color }) {
  return (
    <div style={{ background: OA.bg, borderRadius: 10, boxShadow: SHADOW_MID, padding: '16px 20px', borderLeft: `4px solid ${color || OA.accent}` }}>
      <div style={{ fontSize: 11, color: OA.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: OA.text, fontFamily: 'Montserrat, sans-serif' }}>{value}</div>
    </div>
  )
}

function CalcRow({ label, value, bold, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: 13, color: OA.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: color || OA.text }}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft: { bg: '#f0f0f0', color: OA.muted, label: 'ร่าง' },
    submitted: { bg: '#e8f4ff', color: OA.blue, label: 'ส่งแล้ว' },
    approved: { bg: '#edf7e5', color: OA.accent, label: 'อนุมัติ' },
    rejected: { bg: '#fff0f0', color: OA.red, label: 'ไม่อนุมัติ' },
  }
  const c = map[status] || map.draft
  return <span style={{ background: c.bg, color: c.color, borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{c.label}</span>
}

function DayBadge({ type }) {
  const map = {
    weekday: { bg: '#f6f6f6', color: OA.muted, label: 'วันทำงาน' },
    weekend: { bg: '#fff8e5', color: '#b07d00', label: 'หยุดสัปดาห์' },
    holiday: { bg: '#ffe5e5', color: OA.red, label: 'หยุดนักขัตฤกษ์' },
  }
  const c = map[type] || map.weekday
  return <span style={{ background: c.bg, color: c.color, borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{c.label}</span>
}

// ============================================================
// Main Component
// ============================================================
export default function OTCalculation({ lang = 'th' }) {
  const { profile } = useAuth()
  const [companies, setCompanies] = useState([])
  const [employees, setEmployees] = useState([])
  const [holidays, setHolidays] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('form')

  // Filter state for list tab
  const [filterCompany, setFilterCompany] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  // Form state
  const [form, setForm] = useState({
    company_code: '', employee_id: '',
    ot_date: '', start_time: '18:00', end_time: '21:00',
    rest_deducted: '0', hourly_rate: '', notes: '',
  })
  const [dayType, setDayType] = useState('weekday')
  const [calc, setCalc] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fmt = (n) => (n ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })

  // ── Load companies ──
  useEffect(() => {
    supabase.from('hr_companies').select('code, name_th, name_en').eq('is_active', true)
      .then(({ data }) => setCompanies(data || []))
  }, [])

  // ── Load holidays for this year ──
  useEffect(() => {
    const year = new Date().getFullYear()
    supabase.from('hr_holidays').select('date, name_th, type').eq('year', year).eq('is_active', true)
      .then(({ data }) => setHolidays(data || []))
  }, [])

  // ── Load employees when company changes ──
  useEffect(() => {
    if (!form.company_code) { setEmployees([]); return }
    supabase.from('hr_employees')
      .select('id, first_name_th, last_name_th, position_th, monthly_salary, daily_wage')
      .eq('company_entity', form.company_code)
      .eq('status', 'active')
      .order('first_name_th')
      .then(({ data }) => setEmployees(data || []))
  }, [form.company_code])

  // ── Auto-detect day type when date changes ──
  useEffect(() => {
    if (!form.ot_date) return
    const d = new Date(form.ot_date + 'T00:00:00')
    const dow = d.getDay()
    const isHol = holidays.some(h => h.date === form.ot_date)
    if (isHol) setDayType('holiday')
    else if (dow === 0 || dow === 6) setDayType('weekend')
    else setDayType('weekday')
  }, [form.ot_date, holidays])

  // ── Auto-fill hourly rate from employee ──
  useEffect(() => {
    if (!form.employee_id) return
    const emp = employees.find(e => e.id === form.employee_id)
    if (!emp) return
    if (emp.daily_wage) {
      setForm(f => ({ ...f, hourly_rate: (emp.daily_wage / 8).toFixed(2) }))
    } else if (emp.monthly_salary) {
      setForm(f => ({ ...f, hourly_rate: (emp.monthly_salary / 26 / 8).toFixed(2) }))
    }
  }, [form.employee_id, employees])

  // ── Auto-calculate ──
  useEffect(() => {
    const rate = parseFloat(form.hourly_rate)
    if (!form.start_time || !form.end_time || !rate) { setCalc(null); return }
    setCalc(calcOT({ startTime: form.start_time, endTime: form.end_time, dayType, hourlyRate: rate, restDeducted: form.rest_deducted }))
  }, [form.start_time, form.end_time, form.hourly_rate, form.rest_deducted, dayType])

  // ── Load OT records ──
  const loadRecords = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('hr_ot_requests')
      .select('id, company_code, employee_id, ot_date, start_time, end_time, day_type, net_hours, ot_1_5x_hours, ot_3x_hours, total_amount, status, notes, created_at')
      .order('ot_date', { ascending: false })
      .limit(200)
    if (filterCompany) q = q.eq('company_code', filterCompany)
    if (filterMonth) {
      const [y, m] = filterMonth.split('-')
      const last = new Date(Number(y), Number(m), 0).getDate()
      q = q.gte('ot_date', `${y}-${m}-01`).lte('ot_date', `${y}-${m}-${last}`)
    }
    const { data } = await q
    // Fetch employee names for all unique IDs
    const ids = [...new Set((data || []).map(r => r.employee_id).filter(Boolean))]
    let empNames = {}
    if (ids.length > 0) {
      const { data: emps } = await supabase.from('hr_employees').select('id, first_name_th, last_name_th').in('id', ids)
      ;(emps || []).forEach(e => { empNames[e.id] = `${e.first_name_th || ''} ${e.last_name_th || ''}`.trim() })
    }
    setRecords((data || []).map(r => ({ ...r, emp_name: empNames[r.employee_id] || '-' })))
    setLoading(false)
  }, [filterCompany, filterMonth])

  useEffect(() => { loadRecords() }, [loadRecords])

  // ── Save ──
  const handleSave = async (status) => {
    setError('')
    if (!form.company_code || !form.employee_id || !form.ot_date || !calc) {
      setError('กรุณากรอกข้อมูลให้ครบ (บริษัท / พนักงาน / วันที่ / เวลา / อัตราค่าจ้าง)')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('hr_ot_requests').insert({
      company_code: form.company_code,
      employee_id: form.employee_id,
      ot_date: form.ot_date,
      start_time: form.start_time,
      end_time: form.end_time,
      day_type: dayType,
      rest_deducted: parseFloat(form.rest_deducted) || 0,
      raw_hours: calc.rawHours,
      net_hours: calc.netHours,
      hourly_rate: parseFloat(form.hourly_rate),
      ot_1x_hours: calc.ot1xHours,
      ot_1_5x_hours: calc.ot15xHours,
      ot_3x_hours: calc.ot3xHours,
      ot_1x_amount: calc.ot1xAmount,
      ot_1_5x_amount: calc.ot15xAmount,
      ot_3x_amount: calc.ot3xAmount,
      total_amount: calc.totalAmount,
      notes: form.notes,
      status,
      created_by: profile?.id,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('✅ บันทึกสำเร็จ!')
    setTimeout(() => setSuccess(''), 3000)
    setForm(f => ({ ...f, employee_id: '', ot_date: '', notes: '', start_time: '18:00', end_time: '21:00' }))
    setCalc(null)
    loadRecords()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบรายการนี้?')) return
    await supabase.from('hr_ot_requests').delete().eq('id', id)
    loadRecords()
  }

  // ── Aggregates ──
  const totalAmt = records.reduce((s, r) => s + (r.total_amount || 0), 0)
  const approvedCnt = records.filter(r => r.status === 'approved').length
  const thisMonthAmt = records.filter(r => {
    const now = new Date()
    return r.ot_date?.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  }).reduce((s, r) => s + (r.total_amount || 0), 0)

  // ── Holidays this month (for info panel) ──
  const monthHolidays = (() => {
    if (!form.ot_date) return []
    const d = new Date(form.ot_date + 'T00:00:00')
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return holidays.filter(h => h.date?.startsWith(prefix))
  })()

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", color: OA.text, maxWidth: 1160, margin: '0 auto' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet" />

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 22, color: OA.text, marginBottom: 4 }}>คำนวณ OT</div>
        <div style={{ fontSize: 13, color: OA.muted }}>คำนวณและบันทึกค่าล่วงเวลาตามกฎหมายคุ้มครองแรงงาน</div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPI label="รายการทั้งหมด" value={records.length} color={OA.blue} />
        <KPI label="อนุมัติแล้ว" value={approvedCnt} color={OA.accent} />
        <KPI label={`OT เดือนนี้ (฿)`} value={thisMonthAmt.toLocaleString('th-TH', { minimumFractionDigits: 0 })} color={OA.teal} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ key: 'form', label: '➕ บันทึก OT' }, { key: 'list', label: '📋 รายการ OT' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '9px 22px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            background: tab === t.key ? OA.accent : OA.bgSoft, color: tab === t.key ? '#fff' : OA.muted, transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ FORM TAB ══════════ */}
      {tab === 'form' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Left: Input form */}
          <Card>
            <SectionTitle>กรอกข้อมูล OT</SectionTitle>

            {error && <div style={{ background: '#fff0f0', border: `1px solid ${OA.red}`, color: OA.red, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
            {success && <div style={{ background: '#edf7e5', border: `1px solid ${OA.accent}`, color: OA.accent, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <FieldLabel>บริษัท</FieldLabel>
                <Select value={form.company_code} onChange={e => setForm(f => ({ ...f, company_code: e.target.value, employee_id: '' }))}>
                  <option value="">-- เลือกบริษัท --</option>
                  {companies.map(c => <option key={c.code} value={c.code}>{c.name_th || c.code}</option>)}
                </Select>
              </div>

              <div>
                <FieldLabel>พนักงาน</FieldLabel>
                <Select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} disabled={!form.company_code}>
                  <option value="">-- เลือกพนักงาน --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{`${e.first_name_th || ''} ${e.last_name_th || ''}`.trim()}{e.position_th ? ` (${e.position_th})` : ''}</option>
                  ))}
                </Select>
              </div>

              <div>
                <FieldLabel>วันที่ทำ OT</FieldLabel>
                <Input type="date" value={form.ot_date} onChange={e => setForm(f => ({ ...f, ot_date: e.target.value }))} />
              </div>

              <div>
                <FieldLabel>ประเภทวัน (ตรวจอัตโนมัติ)</FieldLabel>
                <Select value={dayType} onChange={e => setDayType(e.target.value)}>
                  <option value="weekday">วันทำงานปกติ — OT 1.5x</option>
                  <option value="weekend">วันหยุดสัปดาห์ — 2x / 3x</option>
                  <option value="holiday">วันหยุดนักขัตฤกษ์ — 2x / 3x</option>
                </Select>
              </div>

              <div>
                <FieldLabel>เวลาเริ่ม OT</FieldLabel>
                <Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>

              <div>
                <FieldLabel>เวลาสิ้นสุด</FieldLabel>
                <Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>

              <div>
                <FieldLabel>หักเวลาพัก (ชม.)</FieldLabel>
                <Select value={form.rest_deducted} onChange={e => setForm(f => ({ ...f, rest_deducted: e.target.value }))}>
                  <option value="0">ไม่หัก</option>
                  <option value="0.5">หัก 0.5 ชม.</option>
                  <option value="1">หัก 1 ชม.</option>
                </Select>
              </div>

              <div>
                <FieldLabel>อัตราค่าจ้าง / ชม. (บาท)</FieldLabel>
                <Input type="number" min="0" step="0.01" placeholder="เช่น 125.00 (คำนวณอัตโนมัติจากเงินเดือน)" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <FieldLabel>หมายเหตุ</FieldLabel>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${OA.border}`, fontSize: 14, color: OA.text, outline: 'none', background: OA.bgSoft, minHeight: 72, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => handleSave('draft')} disabled={saving || !calc} style={{ padding: '10px 24px', borderRadius: 8, border: `1.5px solid ${OA.border}`, background: OA.bgSoft, color: OA.muted, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: (!calc || saving) ? 0.5 : 1 }}>
                💾 บันทึกร่าง
              </button>
              <button onClick={() => handleSave('submitted')} disabled={saving || !calc} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: (!calc || saving) ? '#ccc' : OA.accent, color: '#fff', cursor: (!calc || saving) ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
                {saving ? 'กำลังบันทึก...' : '✅ ส่งอนุมัติ'}
              </button>
            </div>
          </Card>

          {/* Right: Calculation panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <SectionTitle>ผลการคำนวณ</SectionTitle>
              {calc ? (
                <>
                  <CalcRow label="ชม. รวม (Raw)" value={`${calc.rawHours} ชม.`} />
                  <CalcRow label="หักพัก" value={`${calc.restDeducted} ชม.`} />
                  <CalcRow label="ชม. สุทธิ" value={`${calc.netHours} ชม.`} bold />
                  <div style={{ borderTop: `1px solid ${OA.border}`, margin: '8px 0' }} />
                  {calc.ot15xHours > 0 && <>
                    <CalcRow label="OT 1.5x" value={`${calc.ot15xHours} ชม.`} />
                    <CalcRow label="ค่า OT 1.5x" value={`฿${fmt(calc.ot15xAmount)}`} color={OA.blue} />
                  </>}
                  {calc.ot1xHours > 0 && <>
                    <CalcRow label={`วันหยุด ≤8ชม. (+1x = 2x รวม)`} value={`${calc.ot1xHours} ชม.`} />
                    <CalcRow label="ค่าชั่วโมงวันหยุด" value={`฿${fmt(calc.ot1xAmount)}`} color={OA.teal} />
                  </>}
                  {calc.ot3xHours > 0 && <>
                    <CalcRow label="OT เกิน 8ชม. (3x)" value={`${calc.ot3xHours} ชม.`} />
                    <CalcRow label="ค่า OT 3x" value={`฿${fmt(calc.ot3xAmount)}`} color={OA.red} />
                  </>}
                  <div style={{ borderTop: `1px solid ${OA.border}`, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14 }}>รวมค่า OT</span>
                    <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 22, color: OA.accent }}>฿{fmt(calc.totalAmount)}</span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: OA.muted, fontSize: 13, padding: '24px 0' }}>
                  กรอกเวลาและอัตราค่าจ้างเพื่อดูผลคำนวณ
                </div>
              )}
            </Card>

            {/* Holiday reference for selected month */}
            {monthHolidays.length > 0 && (
              <Card>
                <SectionTitle>วันหยุดเดือนนี้</SectionTitle>
                {monthHolidays.map(h => (
                  <div key={h.date} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${OA.border}`, color: h.date === form.ot_date ? OA.red : OA.muted }}>
                    <span>{h.date === form.ot_date ? '📌 ' : ''}{h.name_th}</span>
                    <span style={{ color: OA.text }}>{h.date}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* Rate reference card */}
            <Card style={{ background: '#f9fef4' }}>
              <SectionTitle>อัตรา OT (พรบ. คุ้มครองแรงงาน)</SectionTitle>
              <div style={{ fontSize: 12, color: OA.muted, lineHeight: 2 }}>
                <div>🗓 <b>วันทำงาน:</b> เกิน 8 ชม. = <b style={{ color: OA.blue }}>1.5x</b></div>
                <div>📅 <b>วันหยุดสัปดาห์:</b> ≤8 ชม. = <b style={{ color: OA.teal }}>2x</b> · เกิน 8 = <b style={{ color: OA.red }}>3x</b></div>
                <div>🔴 <b>วันหยุดนักขัตฤกษ์:</b> ≤8 ชม. = <b style={{ color: OA.teal }}>2x</b> · เกิน 8 = <b style={{ color: OA.red }}>3x</b></div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ══════════ LIST TAB ══════════ */}
      {tab === 'list' && (
        <Card>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <FieldLabel>บริษัท</FieldLabel>
              <Select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={{ width: 180 }}>
                <option value="">ทั้งหมด</option>
                {companies.map(c => <option key={c.code} value={c.code}>{c.name_th || c.code}</option>)}
              </Select>
            </div>
            <div>
              <FieldLabel>เดือน</FieldLabel>
              <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: 160 }} />
            </div>
            <button onClick={loadRecords} style={{ padding: '9px 20px', borderRadius: 8, background: OA.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>
              🔍 ค้นหา
            </button>
            {filterMonth || filterCompany ? (
              <button onClick={() => { setFilterCompany(''); setFilterMonth('') }} style={{ padding: '9px 16px', borderRadius: 8, background: OA.bgSoft, color: OA.muted, border: `1.5px solid ${OA.border}`, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end' }}>
                ✕ ล้างตัวกรอง
              </button>
            ) : null}
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', fontSize: 13, color: OA.muted }}>
              รวมทั้งหมด: <b style={{ color: OA.accent, fontSize: 16 }}>฿{totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 0 })}</b>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: OA.muted }}>⏳ กำลังโหลด...</div>
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: OA.muted }}>ไม่มีรายการ OT</div>
          ) : (
            <div className="table-scroll-bounded">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: '1300px' }}>
                <thead>
                  <tr style={{ background: OA.bgSoft }}>
                    {['วันที่', 'พนักงาน', 'บริษัท', 'เวลา', 'ประเภทวัน', 'ชม.สุทธิ', 'OT 1.5x', 'OT 3x', 'รวม (฿)', 'สถานะ', ''].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 11, color: OA.muted, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', ...(h === 'พนักงาน' ? { position: 'sticky', left: 0, zIndex: 15, background: OA.bgSoft } : {}) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${OA.border}`, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: OA.text }}>{r.ot_date}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, position: 'sticky', left: 0, zIndex: 5, background: i % 2 === 0 ? '#fff' : '#fafafa' }}>{r.emp_name}</td>
                      <td style={{ padding: '10px 12px', color: OA.muted }}>{r.company_code}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: OA.muted }}>{r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}</td>
                      <td style={{ padding: '10px 12px' }}><DayBadge type={r.day_type} /></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.net_hours}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: OA.blue }}>{r.ot_1_5x_hours ?? 0}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: OA.red }}>{r.ot_3x_hours ?? 0}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: OA.accent }}>{fmt(r.total_amount)}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={r.status} /></td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: OA.red, fontSize: 16 }} title="ลบ">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: OA.bgSoft }}>
                    <td colSpan={8} style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: OA.muted }}>รวม OT ทั้งหมด</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: OA.accent }}>฿{totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

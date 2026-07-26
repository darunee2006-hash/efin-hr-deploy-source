import { useState, useEffect, useMemo, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, CheckCircle, Star, Trophy, Award, ClipboardCheck, Calendar, Save, ChevronDown, ChevronUp, AlertTriangle, Clock, FileText, X, Edit3, Eye, Plus, UserPlus, Trash2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import { useAuth } from '../lib/AuthContext'
import {
  PageHeader,
  KPICard,
  Section,
  DetailPanel,
  Avatar,
  StatusBadge,
  ScoreCircle,
  ProgressBar,
  TabPills,
} from '../components/PageUI'
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport'

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}
function generateScore(employeeCode) {
  const seed = employeeCode.charCodeAt(0) * 1000 + employeeCode.charCodeAt(1)
  return 2.5 + seededRandom(seed) * 2.5
}
function getGrade(score) {
  if (score >= 4.5) return 'A'
  if (score >= 4.0) return 'B+'
  if (score >= 3.5) return 'B'
  if (score >= 3.0) return 'C+'
  return 'C'
}

const ROUND_LABELS = { 1: '30 วัน', 2: '60 วัน', 3: '90 วัน' }
const DEFAULT_ROUND_OBJECTIVES = {
  1: 'ประเมินการปรับตัว ความเข้าใจงาน และวินัยการทำงาน',
  2: 'ประเมินคุณภาพงาน ความรอบคอบ การประสานงาน และความรับผิดชอบ',
  3: 'สรุปผลทดลองงาน ตัดสินใจผ่าน / ขยาย / ไม่ผ่านทดลองงาน'
}
const GRADE_CRITERIA = [
  { range: '90–100', grade: 'A', meaning: 'ดีมาก เกินความคาดหวัง พร้อมรับผิดชอบงานหลักได้' },
  { range: '75–89', grade: 'B+', meaning: 'ดี ผ่านเกณฑ์ มีจุดที่ต้องพัฒนาเล็กน้อย' },
  { range: '60–74', grade: 'B', meaning: 'พอใช้ ต้องติดตามบางประเด็น' },
  { range: 'ต่ำกว่า 60', grade: 'C', meaning: 'ยังไม่ผ่านมาตรฐาน ต้องพิจารณาขยายทดลองงานหรือไม่ผ่าน' },
]
const DECISION_CRITERIA = [
  { decision: 'ผ่านทดลองงาน', condition: 'คะแนนรวม 75 ขึ้นไป และไม่มีประเด็นร้ายแรงด้านวินัย / ความลับ / ความถูกต้อง' },
  { decision: 'ขยายทดลองงาน', condition: 'คะแนน 60–74 หรือมีบางหัวข้อสำคัญที่ยังต้องพิสูจน์ต่อ' },
  { decision: 'ไม่ผ่านทดลองงาน', condition: 'คะแนนต่ำกว่า 60 หรือมีความเสี่ยงสูงด้านความรอบคอบ ความรับผิดชอบ' },
]

// Default criteria template — can be customized per position
const DEFAULT_CRITERIA = [
  { id: 1, name: 'ความเข้าใจธุรกิจและบริบทงาน', description: 'เข้าใจผลิตภัณฑ์ ลูกค้า และขอบเขตงานของตำแหน่ง', weight: 10, score: null },
  { id: 2, name: 'คุณภาพของงาน', description: 'ความถูกต้อง ครบถ้วน รอบคอบในงานที่ได้รับมอบหมาย', weight: 20, score: null },
  { id: 3, name: 'ความรับผิดชอบและตรงต่อเวลา', description: 'ส่งงานตามกำหนด รับผิดชอบต่อหน้าที่', weight: 15, score: null },
  { id: 4, name: 'การสื่อสารและประสานงาน', description: 'สื่อสารชัดเจน ประสานงานกับทีมได้ดี', weight: 15, score: null },
  { id: 5, name: 'การปรับตัวและเรียนรู้', description: 'ปรับตัวเข้ากับวัฒนธรรมองค์กร เรียนรู้สิ่งใหม่', weight: 10, score: null },
  { id: 6, name: 'วินัยการทำงาน', description: 'มาตรงเวลา ปฏิบัติตามกฎระเบียบ', weight: 10, score: null },
  { id: 7, name: 'ทัศนคติและการทำงานเป็นทีม', description: 'มีทัศนคติเชิงบวก ร่วมมือกับทีม', weight: 10, score: null },
  { id: 8, name: 'ศักยภาพในการพัฒนา', description: 'แสดงศักยภาพที่จะเติบโตในองค์กร', weight: 10, score: null },
]

const fmtDate = d => {
  if (!d) return '-'
  const dt = new Date(d)
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ===== Add Employee Modal =====
function AddProbationModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    employee_name: '', employee_code: '', position_title: '', department: '', start_date: '', evaluator_name: '',
  })
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA.map(c => ({ ...c })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setForm({ employee_name: '', employee_code: '', position_title: '', department: '', start_date: '', evaluator_name: '' })
    setCriteria(DEFAULT_CRITERIA.map(c => ({ ...c, score: null })))
    setError('')
  }

  useEffect(() => { if (open) resetForm() }, [open])

  const totalWeight = criteria.reduce((s, c) => s + Number(c.weight || 0), 0)

  const addCriteria = () => {
    setCriteria(prev => [...prev, { id: prev.length + 1, name: '', description: '', weight: 0, score: null }])
  }
  const removeCriteria = (idx) => {
    setCriteria(prev => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, id: i + 1 })))
  }
  const updateCriteria = (idx, field, value) => {
    setCriteria(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: field === 'weight' ? Number(value) || 0 : value }; return n })
  }

  const handleSave = async () => {
    if (!form.employee_name || !form.position_title || !form.start_date) {
      setError('กรุณากรอกชื่อพนักงาน ตำแหน่ง และวันเริ่มงาน'); return
    }
    if (totalWeight !== 100) { setError('น้ำหนักรวมต้องเท่ากับ 100%'); return }
    if (criteria.some(c => !c.name)) { setError('กรุณากรอกชื่อหัวข้อประเมินทุกข้อ'); return }

    setSaving(true); setError('')
    const startDate = new Date(form.start_date)
    const rounds = [1, 2, 3].map(r => {
      const periodStart = new Date(startDate)
      periodStart.setDate(periodStart.getDate() + (r - 1) * 30)
      const periodEnd = new Date(periodStart)
      periodEnd.setDate(periodEnd.getDate() + 29)
      const dueDate = new Date(periodEnd)
      dueDate.setDate(dueDate.getDate() + 1)
      return {
        employee_name: form.employee_name, employee_code: form.employee_code || null,
        position_title: form.position_title, department: form.department || null,
        start_date: form.start_date, evaluator_name: form.evaluator_name || null,
        evaluation_round: r,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        round_objectives: DEFAULT_ROUND_OBJECTIVES[r],
        criteria: criteria.map(c => ({ ...c, score: null })),
        status: 'pending', decision: 'pending',
      }
    })

    const { error: err } = await supabase.from('hr_probation_evaluations').insert(rounds)
    setSaving(false)
    if (err) { setError('บันทึกไม่สำเร็จ: ' + err.message); return }
    onSaved()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-amber-600" />เพิ่มพนักงานทดลองงาน</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg">{error}</div>}

          {/* Employee Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input type="text" value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))}
                placeholder="เช่น สมชาย ใจดี" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">รหัสพนักงาน</label>
              <input type="text" value={form.employee_code} onChange={e => setForm(p => ({ ...p, employee_code: e.target.value }))}
                placeholder="เช่น OA20260001 (ถ้ามี)" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ตำแหน่ง <span className="text-red-500">*</span></label>
              <input type="text" value={form.position_title} onChange={e => setForm(p => ({ ...p, position_title: e.target.value }))}
                placeholder="เช่น นักกฎหมาย, UX Designer" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">แผนก / BU</label>
              <input type="text" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                placeholder="เช่น IT, Legal, Marketing" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">วันเริ่มงาน <span className="text-red-500">*</span></label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ผู้ประเมิน</label>
              <input type="text" value={form.evaluator_name} onChange={e => setForm(p => ({ ...p, evaluator_name: e.target.value }))}
                placeholder="ชื่อหัวหน้างาน" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
            </div>
          </div>

          {/* Preview: 3 rounds */}
          {form.start_date && (
            <div className="bg-[#f0f9e8] rounded-lg px-3 py-2">
              <h5 className="text-xs font-bold text-[#5a9030] mb-1">ตาราง 3 รอบประเมิน (คำนวณอัตโนมัติ)</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-[#78c045]">
                {[1, 2, 3].map(r => {
                  const s = new Date(form.start_date); s.setDate(s.getDate() + (r - 1) * 30)
                  const e = new Date(s); e.setDate(e.getDate() + 29)
                  return (
                    <div key={r} className="bg-white rounded px-2 py-1.5">
                      <div className="font-bold text-[#3d6b1c]">รอบ {r}: {ROUND_LABELS[r]}</div>
                      <div>{fmtDate(s)} – {fmtDate(e)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Criteria Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-800">เกณฑ์ประเมิน (น้ำหนักรวม: <span className={totalWeight === 100 ? 'text-green-600' : 'text-red-600'}>{totalWeight}%</span>)</h4>
              <button onClick={addCriteria} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 px-2 py-1 rounded hover:bg-amber-50">
                <Plus className="w-3.5 h-3.5" />เพิ่มหัวข้อ
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {criteria.map((c, ci) => (
                <div key={ci} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-400 font-bold mt-2 w-5 flex-shrink-0">{ci + 1}.</span>
                  <div className="flex-1 space-y-1">
                    <input type="text" value={c.name} onChange={e => updateCriteria(ci, 'name', e.target.value)}
                      placeholder="ชื่อหัวข้อ" className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
                    <input type="text" value={c.description} onChange={e => updateCriteria(ci, 'description', e.target.value)}
                      placeholder="รายละเอียด (ไม่บังคับ)" className="w-full text-[10px] border border-gray-100 rounded px-2 py-1 text-gray-500 focus:ring-1 focus:ring-amber-200 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <input type="number" min="0" max="100" value={c.weight} onChange={e => updateCriteria(ci, 'weight', e.target.value)}
                      className="w-14 text-center text-xs border border-gray-200 rounded px-1 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
                    <span className="text-xs text-gray-400">%</span>
                    {criteria.length > 1 && (
                      <button onClick={() => removeCriteria(ci)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition">
            <Save className="w-4 h-4" />{saving ? 'กำลังบันทึก...' : 'สร้างแบบประเมิน 3 รอบ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProbationTab({ lang }) {
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'superuser'
  const [probEvals, setProbEvals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [editingRound, setEditingRound] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [deleting, setDeleting] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('hr_probation_evaluations').select('*').order('created_at', { ascending: false }).order('evaluation_round')
    setProbEvals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Group by employee (use employee_name + start_date as unique key for employees without code)
  const employeeGroups = useMemo(() => {
    const m = {}
    probEvals.forEach(ev => {
      const key = ev.employee_code || `${ev.employee_name}_${ev.start_date}`
      if (!m[key]) m[key] = {
        key, code: ev.employee_code, name: ev.employee_name || ev.position_title,
        position: ev.position_title, department: ev.department,
        startDate: ev.start_date, rounds: {}, created_at: ev.created_at,
      }
      m[key].rounds[ev.evaluation_round] = ev
    })
    return Object.values(m).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [probEvals])

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return employeeGroups.filter(emp => {
      if (searchText) {
        const q = searchText.toLowerCase()
        if (!(emp.name || '').toLowerCase().includes(q) && !(emp.position || '').toLowerCase().includes(q)
          && !(emp.code || '').toLowerCase().includes(q) && !(emp.department || '').toLowerCase().includes(q)) return false
      }
      if (filterStatus === 'all') return true
      const r3 = emp.rounds[3]
      if (filterStatus === 'pending') return !r3?.decision || r3.decision === 'pending'
      return r3?.decision === filterStatus
    })
  }, [employeeGroups, searchText, filterStatus])

  // KPI counts
  const kpis = useMemo(() => {
    const total = employeeGroups.length
    const pending = employeeGroups.filter(e => !e.rounds[3]?.decision || e.rounds[3].decision === 'pending').length
    const passed = employeeGroups.filter(e => e.rounds[3]?.decision === 'passed').length
    const extended = employeeGroups.filter(e => e.rounds[3]?.decision === 'extended').length
    const failed = employeeGroups.filter(e => e.rounds[3]?.decision === 'failed').length
    return { total, pending, passed, extended, failed }
  }, [employeeGroups])

  const startEditing = (ev) => {
    setEditingRound(ev.id)
    const criteria = (typeof ev.criteria === 'string' ? JSON.parse(ev.criteria) : ev.criteria) || []
    setEditData({
      criteria: criteria.map(c => ({ ...c, score: c.score ?? '' })),
      strengths: ev.strengths || '',
      improvements: ev.improvements || '',
      next_action: ev.next_action || '',
      evaluator_name: ev.evaluator_name || '',
    })
  }

  const calcTotal = (criteria) => {
    let total = 0, allFilled = true
    criteria.forEach(c => {
      if (c.score === '' || c.score === null || c.score === undefined) { allFilled = false; return }
      total += (Number(c.score) * c.weight) / 100
    })
    return { total: allFilled ? total : null, allFilled }
  }

  const getGradeFromScore = (score) => {
    if (score === null) return '-'
    if (score >= 90) return 'A'
    if (score >= 75) return 'B+'
    if (score >= 60) return 'B'
    return 'C'
  }

  const handleSave = async (evalId, round) => {
    setSaving(true)
    const { total, allFilled } = calcTotal(editData.criteria)
    const grade = total !== null ? getGradeFromScore(total) : null
    let decision = 'pending'
    if (round === 3 && allFilled) {
      if (total >= 75) decision = 'passed'
      else if (total >= 60) decision = 'extended'
      else decision = 'failed'
    }
    const { error } = await supabase.from('hr_probation_evaluations').update({
      criteria: editData.criteria, total_score: total, grade,
      strengths: editData.strengths, improvements: editData.improvements,
      next_action: editData.next_action, evaluator_name: editData.evaluator_name,
      decision: round === 3 ? decision : 'pending',
      status: allFilled ? 'completed' : 'in_progress',
      updated_at: new Date().toISOString(),
    }).eq('id', evalId)
    if (!error) { setEditingRound(null); loadData() }
    setSaving(false)
  }

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`ลบข้อมูลประเมินทดลองงานของ "${emp.name}" ทั้ง 3 รอบ?`)) return
    setDeleting(emp.key)
    const ids = [1, 2, 3].map(r => emp.rounds[r]?.id).filter(Boolean)
    if (ids.length) await supabase.from('hr_probation_evaluations').delete().in('id', ids)
    setDeleting(null)
    loadData()
  }

  if (loading) return <div className="py-8 text-center text-gray-400">กำลังโหลด...</div>

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center cursor-pointer hover:border-gray-300 transition" onClick={() => setFilterStatus('all')}>
          <div className={`text-2xl font-bold ${filterStatus === 'all' ? 'text-[#78c045]' : 'text-gray-900'}`}>{kpis.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">ทั้งหมด</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center cursor-pointer hover:border-amber-300 transition" onClick={() => setFilterStatus('pending')}>
          <div className={`text-2xl font-bold ${filterStatus === 'pending' ? 'text-amber-600' : 'text-amber-500'}`}>{kpis.pending}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">รอประเมิน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center cursor-pointer hover:border-green-300 transition" onClick={() => setFilterStatus('passed')}>
          <div className={`text-2xl font-bold ${filterStatus === 'passed' ? 'text-green-700' : 'text-green-500'}`}>{kpis.passed}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">ผ่าน</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center cursor-pointer hover:border-yellow-300 transition" onClick={() => setFilterStatus('extended')}>
          <div className={`text-2xl font-bold ${filterStatus === 'extended' ? 'text-yellow-700' : 'text-yellow-500'}`}>{kpis.extended}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">ขยาย</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center cursor-pointer hover:border-red-300 transition" onClick={() => setFilterStatus('failed')}>
          <div className={`text-2xl font-bold ${filterStatus === 'failed' ? 'text-red-700' : 'text-red-500'}`}>{kpis.failed}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">ไม่ผ่าน</div>
        </div>
      </div>

      {/* Toolbar: Search + Add */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
            placeholder="ค้นหาชื่อ, ตำแหน่ง, รหัส, แผนก..." className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
        </div>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition whitespace-nowrap">
            <UserPlus className="w-4 h-4" />เพิ่มพนักงานทดลองงาน
          </button>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{searchText || filterStatus !== 'all' ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูลประเมินทดลองงาน'}</p>
          {canEdit && !searchText && filterStatus === 'all' && (
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-sm text-amber-600 hover:text-amber-800 font-medium">
              + เพิ่มพนักงานคนแรก
            </button>
          )}
        </div>
      ) : (
        /* Employee Cards */
        filteredGroups.map(emp => {
          const isOpen = selectedEmployee === emp.key
          const r3 = emp.rounds[3]
          const finalDecision = r3?.decision
          const completedRounds = [1, 2, 3].filter(r => emp.rounds[r]?.status === 'completed').length

          return (
            <div key={emp.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Employee Header */}
              <button onClick={() => setSelectedEmployee(isOpen ? null : emp.key)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left">
                <Avatar name={emp.name || emp.position} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{emp.name || '-'}</span>
                    {emp.code && <span className="text-xs text-gray-400 font-mono">{emp.code}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="text-amber-700 font-medium">{emp.position}</span>
                    {emp.department && <span className="text-gray-400">| {emp.department}</span>}
                    <span>เริ่มงาน: {fmtDate(emp.startDate)}</span>
                    <span>ประเมินแล้ว: {completedRounds}/3 รอบ</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {finalDecision === 'passed' && <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">ผ่าน</span>}
                  {finalDecision === 'extended' && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">ขยาย</span>}
                  {finalDecision === 'failed' && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">ไม่ผ่าน</span>}
                  {(!finalDecision || finalDecision === 'pending') && <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">รอประเมิน</span>}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {/* Delete button */}
                  {canEdit && (
                    <div className="flex justify-end px-4 pt-2">
                      <button onClick={() => handleDeleteEmployee(emp)} disabled={deleting === emp.key}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />{deleting === emp.key ? 'กำลังลบ...' : 'ลบข้อมูลทั้งหมด'}
                      </button>
                    </div>
                  )}

                  {/* Schedule Table */}
                  <div className="px-4 pt-2 pb-2">
                    <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#78c045]" />ตารางกำหนดรอบประเมิน
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-[#f0f9e8]">
                          <th className="px-3 py-2 text-left font-semibold text-[#5a9030]">ครั้งที่</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#5a9030]">รอบประเมิน</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#5a9030]">ช่วงเวลา</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#5a9030]">ครบกำหนด</th>
                          <th className="px-3 py-2 text-left font-semibold text-[#5a9030]">วัตถุประสงค์</th>
                          <th className="px-3 py-2 text-center font-semibold text-[#5a9030]">สถานะ</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {[1, 2, 3].map(round => {
                            const ev = emp.rounds[round]
                            if (!ev) return null
                            const isOverdue = new Date(ev.due_date) < new Date() && ev.status !== 'completed'
                            return (
                              <tr key={round} className={isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-3 py-2 font-bold text-gray-700">{round}</td>
                                <td className="px-3 py-2 font-medium text-gray-700">{ROUND_LABELS[round]}</td>
                                <td className="px-3 py-2 text-gray-600">{fmtDate(ev.period_start)} – {fmtDate(ev.period_end)}</td>
                                <td className="px-3 py-2">
                                  <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>{fmtDate(ev.due_date)}</span>
                                  {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
                                </td>
                                <td className="px-3 py-2 text-gray-500 max-w-xs">{ev.round_objectives || DEFAULT_ROUND_OBJECTIVES[round]}</td>
                                <td className="px-3 py-2 text-center">
                                  {ev.status === 'completed' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                                      <CheckCircle className="w-3 h-3" />เสร็จ
                                    </span>
                                  ) : ev.status === 'in_progress' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                                      <Clock className="w-3 h-3" />กำลังประเมิน
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-medium">
                                      <Clock className="w-3 h-3" />รอ
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Evaluation Rounds */}
                  {[1, 2, 3].map(round => {
                    const ev = emp.rounds[round]
                    if (!ev) return null
                    const isEditing = editingRound === ev.id
                    const criteria = isEditing ? editData.criteria : (typeof ev.criteria === 'string' ? JSON.parse(ev.criteria) : ev.criteria) || []
                    const { total } = calcTotal(criteria)

                    return (
                      <div key={round} className="px-4 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-amber-500" />
                            ครั้งที่ {round}: {ROUND_LABELS[round]}
                            {ev.status === 'completed' && <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">คะแนน: {ev.total_score} ({ev.grade})</span>}
                          </h4>
                          {canEdit && !isEditing && (
                            <button onClick={() => startEditing(ev)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                              <Edit3 className="w-3.5 h-3.5" />ประเมิน
                            </button>
                          )}
                          {isEditing && (
                            <div className="flex gap-2">
                              <button onClick={() => setEditingRound(null)} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">ยกเลิก</button>
                              <button onClick={() => handleSave(ev.id, round)} disabled={saving}
                                className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-lg disabled:opacity-50">
                                <Save className="w-3.5 h-3.5" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Criteria Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                            <thead><tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left font-semibold text-gray-700 w-8">#</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">หัวข้อประเมิน</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-16">น้ำหนัก</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">คะแนน (100)</th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">คะแนนถ่วง</th>
                              <th className="px-3 py-2 text-left font-semibold text-gray-700">หมายเหตุ / หลักฐาน</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                              {criteria.map((c, ci) => {
                                const weighted = c.score !== '' && c.score !== null ? ((Number(c.score) * c.weight) / 100).toFixed(1) : '-'
                                return (
                                  <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-500">{c.id}</td>
                                    <td className="px-3 py-2">
                                      <div className="font-medium text-gray-800">{c.name}</div>
                                      <div className="text-[10px] text-gray-400 mt-0.5">{c.description}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center font-medium text-gray-600">{c.weight}%</td>
                                    <td className="px-3 py-2 text-center">
                                      {isEditing ? (
                                        <input type="number" min="0" max="100" value={editData.criteria[ci].score}
                                          onChange={e => {
                                            const v = e.target.value
                                            setEditData(prev => {
                                              const nc = [...prev.criteria]
                                              nc[ci] = { ...nc[ci], score: v === '' ? '' : Math.min(100, Math.max(0, Number(v))) }
                                              return { ...prev, criteria: nc }
                                            })
                                          }}
                                          className="w-16 text-center text-xs border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-amber-300 focus:outline-none" />
                                      ) : (
                                        <span className={`font-medium ${c.score !== null && c.score !== '' ? 'text-gray-900' : 'text-gray-300'}`}>
                                          {c.score !== null && c.score !== '' ? c.score : '-'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center font-medium text-[#78c045]">{weighted}</td>
                                    <td className="px-3 py-2 text-gray-400 text-[10px]">{c.description}</td>
                                  </tr>
                                )
                              })}
                              <tr className="bg-[#f0f9e8] font-bold">
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-[#3d6b1c]">รวมคะแนน</td>
                                <td className="px-3 py-2 text-center text-[#5a9030]">100%</td>
                                <td className="px-3 py-2 text-center"></td>
                                <td className="px-3 py-2 text-center text-lg text-[#5a9030]">{total !== null ? total.toFixed(1) : '-'}</td>
                                <td className="px-3 py-2 text-[#78c045]">
                                  {total !== null && <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    total >= 90 ? 'bg-green-100 text-green-700' : total >= 75 ? 'bg-blue-100 text-blue-700' :
                                    total >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  }`}>เกรด: {getGradeFromScore(total)}</span>}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Fields */}
                        {(isEditing || ev.status === 'completed' || ev.status === 'in_progress') && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-1">จุดแข็ง</label>
                              {isEditing ? (
                                <textarea value={editData.strengths} onChange={e => setEditData(p => ({ ...p, strengths: e.target.value }))}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" rows={2} />
                              ) : <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 min-h-[2rem]">{ev.strengths || '-'}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-1">จุดที่ต้องปรับปรุง</label>
                              {isEditing ? (
                                <textarea value={editData.improvements} onChange={e => setEditData(p => ({ ...p, improvements: e.target.value }))}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" rows={2} />
                              ) : <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 min-h-[2rem]">{ev.improvements || '-'}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-1">{round === 3 ? 'ผลการตัดสินใจ' : 'Action ต่อไป'}</label>
                              {isEditing ? (
                                round === 3 ? (
                                  <select value={editData.next_action} onChange={e => setEditData(p => ({ ...p, next_action: e.target.value }))}
                                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                                    <option value="">เลือก...</option>
                                    <option value="ผ่านทดลองงาน">ผ่านทดลองงาน</option>
                                    <option value="ขยายทดลองงาน">ขยายทดลองงาน</option>
                                    <option value="ไม่ผ่านทดลองงาน">ไม่ผ่านทดลองงาน</option>
                                  </select>
                                ) : (
                                  <textarea value={editData.next_action} onChange={e => setEditData(p => ({ ...p, next_action: e.target.value }))}
                                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" rows={2} />
                                )
                              ) : <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 min-h-[2rem]">{ev.next_action || '-'}</p>}
                            </div>
                          </div>
                        )}
                        {isEditing && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-semibold text-gray-600 mb-1">ผู้ประเมิน</label>
                            <input type="text" value={editData.evaluator_name} onChange={e => setEditData(p => ({ ...p, evaluator_name: e.target.value }))}
                              placeholder="ชื่อผู้ประเมิน" className="w-48 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-200 focus:outline-none" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Grading & Decision Reference */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-bold text-gray-700 mb-2">เกณฑ์คะแนน</h5>
                        <table className="w-full text-[10px]">
                          <thead><tr className="bg-gray-100">
                            <th className="px-2 py-1 text-left">คะแนนรวม</th>
                            <th className="px-2 py-1 text-center">เกรด</th>
                            <th className="px-2 py-1 text-left">ความหมาย</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {GRADE_CRITERIA.map(g => (
                              <tr key={g.grade} className="hover:bg-white">
                                <td className="px-2 py-1 font-medium">{g.range}</td>
                                <td className="px-2 py-1 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  g.grade === 'A' ? 'bg-green-100 text-green-700' : g.grade === 'B+' ? 'bg-blue-100 text-blue-700' :
                                  g.grade === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                }`}>{g.grade}</span></td>
                                <td className="px-2 py-1 text-gray-600">{g.meaning}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-700 mb-2">เกณฑ์การตัดสินใจรอบ 90 วัน</h5>
                        <table className="w-full text-[10px]">
                          <thead><tr className="bg-gray-100">
                            <th className="px-2 py-1 text-left">ผลการพิจารณา</th>
                            <th className="px-2 py-1 text-left">เงื่อนไข</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {DECISION_CRITERIA.map(d => (
                              <tr key={d.decision} className="hover:bg-white">
                                <td className="px-2 py-1 font-medium text-gray-800">{d.decision}</td>
                                <td className="px-2 py-1 text-gray-600">{d.condition}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Add Employee Modal */}
      <AddProbationModal open={showAddModal} onClose={() => setShowAddModal(false)} onSaved={loadData} />
    </div>
  )
}

export default function Performance({ lang }) {
  const { filterByCompany } = useCompanyFilter()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('2024-Q4')
  const [showImport, setShowImport] = useState(false)
  const [mainTab, setMainTab] = useState('performance')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: empData, error: empError } = await supabase
          .from('hr_employees')
          .select('*, hr_departments(name_th, name_en)')
          .eq('status', 'active')
        if (empError) throw empError
        const enriched = (empData || []).map(emp => {
          const score = generateScore(emp.employee_code || emp.id)
          return {
            ...emp,
            full_name: lang === 'th'
              ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}${emp.nickname ? ' (' + emp.nickname + ')' : ''}`.trim()
              : `${emp.first_name_en || ''} ${emp.last_name_en || ''}${emp.nickname ? ' (' + emp.nickname + ')' : ''}`.trim(),
            position: lang === 'th' ? (emp.position_th || '') : (emp.position_en || ''),
            department: emp.hr_departments
              ? lang === 'th' ? emp.hr_departments.name_th : emp.hr_departments.name_en
              : 'N/A',
            boss_score: score,
            self_score: score * 0.95,
            avg_score: (score + score * 0.95) / 2,
            grade: getGrade(score),
            status: 'completed',
          }
        })
        setEmployees(enriched)
      } catch (err) { console.error('Performance data fetch error:', err) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [lang])

  const performanceColumns = [
    { header: lang === 'th' ? 'รหัสพนักงาน' : 'Employee Code', headerEn: 'Employee Code', accessor: 'employee_code', dbField: 'employee_code', width: 12, example: 'EMP001' },
    { header: lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name', headerEn: 'Full Name', accessor: 'full_name', dbField: 'full_name', width: 20, example: 'สมชาย ใจดี' },
    { header: lang === 'th' ? 'แผนก' : 'Department', headerEn: 'Department', accessor: 'department', width: 16, example: 'Sales' },
    { header: lang === 'th' ? 'ตำแหน่ง' : 'Position', headerEn: 'Position', accessor: 'position', dbField: 'position', width: 16, example: 'Senior Manager' },
    { header: lang === 'th' ? 'คะแนนหัวหน้า' : 'Boss Score', headerEn: 'Boss Score', accessor: 'boss_score', dbField: 'boss_score', width: 12, example: '4.50', transform: (val) => parseFloat(val) },
    { header: lang === 'th' ? 'คะแนนตนเอง' : 'Self Score', headerEn: 'Self Score', accessor: 'self_score', dbField: 'self_score', width: 12, example: '4.28', transform: (val) => parseFloat(val) },
    { header: lang === 'th' ? 'คะแนนเฉลี่ย' : 'Avg Score', headerEn: 'Avg Score', accessor: 'avg_score', dbField: 'avg_score', width: 12, example: '4.39', transform: (val) => parseFloat(val) },
    { header: lang === 'th' ? 'เกรด' : 'Grade', headerEn: 'Grade', accessor: 'grade', dbField: 'grade', width: 8, example: 'A' },
    { header: lang === 'th' ? 'ช่วงเวลา' : 'Period', headerEn: 'Period', accessor: 'period', dbField: 'period', width: 12, example: '2024-Q4' }
  ]

  const handleExport = () => {
    const exportData = employeeList.map(emp => ({
      employee_code: emp.employee_code, full_name: emp.full_name, department: emp.department, position: emp.position,
      boss_score: emp.boss_score.toFixed(2), self_score: emp.self_score.toFixed(2), avg_score: emp.avg_score.toFixed(2), grade: emp.grade, period: filterPeriod
    }))
    exportToExcel({ data: exportData, columns: performanceColumns, filename: lang === 'th' ? 'ผลงาน' : 'performance', sheetName: lang === 'th' ? 'ผลการประเมิน' : 'Performance Reviews' })
  }

  const handleImport = async (mappedData) => {
    try {
      const { data, error } = await supabase.from('hr_performance_reviews').insert(mappedData.map(item => ({
        employee_code: item.employee_code, period: item.period || filterPeriod,
        boss_score: parseFloat(item.boss_score), self_score: parseFloat(item.self_score), avg_score: parseFloat(item.avg_score),
        grade: item.grade, status: 'completed', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      })))
      if (error) throw error
      return data ? data.length : mappedData.length
    } catch (err) { console.error('Import error:', err); throw err }
  }

  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany])

  const metrics = useMemo(() => {
    const totalEmployees = companyFilteredEmployees.length
    const passedReview = companyFilteredEmployees.filter(e => e.avg_score >= 3.5).length
    const avgScore = companyFilteredEmployees.length > 0 ? companyFilteredEmployees.reduce((sum, e) => sum + e.avg_score, 0) / companyFilteredEmployees.length : 0
    const topPerformer = companyFilteredEmployees.length > 0 ? companyFilteredEmployees.reduce((best, curr) => (curr.avg_score > best.avg_score) ? curr : best) : null
    return { totalEmployees, passedReview, avgScore: avgScore.toFixed(2), maxScore: '5.00', topPerformer }
  }, [companyFilteredEmployees])

  const okrStatus = useMemo(() => {
    const total = companyFilteredEmployees.length || 1
    return [
      { key: 'completed', label: lang === 'th' ? 'เสร็จสิ้น' : 'Completed', count: Math.ceil(total * 0.45), color: 'bg-green-500' },
      { key: 'ontrack', label: lang === 'th' ? 'ตามแผน' : 'On Track', count: Math.ceil(total * 0.30), color: 'bg-blue-500' },
      { key: 'behind', label: lang === 'th' ? 'ล่าช้า' : 'Behind', count: Math.ceil(total * 0.15), color: 'bg-yellow-500' },
      { key: 'atrisk', label: lang === 'th' ? 'เสี่ยง' : 'At Risk', count: Math.ceil(total * 0.10), color: 'bg-orange-500' },
    ]
  }, [companyFilteredEmployees, lang])

  const performanceDistribution = useMemo(() => {
    const counts = { 'Q1': Math.max(20, Math.ceil(companyFilteredEmployees.length * 0.15)), 'Q2': Math.max(30, Math.ceil(companyFilteredEmployees.length * 0.25)), 'Q3': Math.max(25, Math.ceil(companyFilteredEmployees.length * 0.20)), 'Q4': Math.max(232, Math.ceil(companyFilteredEmployees.length * 0.40)) }
    return Object.entries(counts).map(([q, count]) => ({ name: q, value: count }))
  }, [companyFilteredEmployees])

  const employeeList = useMemo(() => {
    return companyFilteredEmployees.filter(e => filterType === 'all' || e.grade === filterType).filter(e => filterDept === 'all' || e.department === filterDept).sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0)).slice(0, 20)
  }, [companyFilteredEmployees, filterType, filterDept])

  const departments = useMemo(() => {
    const depts = [...new Set(companyFilteredEmployees.map(e => e.department).filter(Boolean))]
    return [{ key: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' }, ...depts.map(d => ({ key: d, label: d }))]
  }, [companyFilteredEmployees, lang])

  if (loading) return <div className="p-4 sm:p-6"><div className="text-gray-400">{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</div></div>

  const donutColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader title={lang === 'th' ? 'ผลงาน' : 'Performance'} lang={lang} />

      {/* Main Tab Selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setMainTab('performance')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${mainTab === 'performance' ? 'bg-white shadow-sm text-[#5a9030] font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
          <Award className="w-4 h-4" />ประเมินผลงาน
        </button>
        <button onClick={() => setMainTab('probation')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-all ${mainTab === 'probation' ? 'bg-white shadow-sm text-amber-700 font-semibold' : 'text-gray-600 hover:text-gray-800'}`}>
          <ClipboardCheck className="w-4 h-4" />ประเมินทดลองงาน
        </button>
      </div>

      {mainTab === 'probation' ? (
        <ProbationTab lang={lang} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label={lang === 'th' ? 'จำนวนพนักงาน' : 'Employees'} value={metrics.totalEmployees} />
            <KPICard icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" label={lang === 'th' ? 'ผ่านประเมิน' : 'Passed'} value="89" />
            <KPICard icon={Star} iconBg="bg-yellow-100" iconColor="text-yellow-600" label={lang === 'th' ? 'คะแนนเฉลี่ย' : 'Avg Score'} value="3.86" />
            <KPICard icon={Trophy} iconBg="bg-orange-100" iconColor="text-orange-600" label={lang === 'th' ? 'คะแนนสูงสุด' : 'Max Score'} value="5.00" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <Section title={lang === 'th' ? 'สถานะ OKR Status' : 'OKR Status'}>
                <div className="space-y-4">
                  {okrStatus.map(status => {
                    const percentage = companyFilteredEmployees.length > 0 ? (status.count / companyFilteredEmployees.length) * 100 : 0
                    return (
                      <div key={status.key}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{status.label}</span>
                          <span className="text-xs text-gray-500">{status.count}</span>
                        </div>
                        <ProgressBar value={percentage} max={100} color={status.color} />
                      </div>
                    )
                  })}
                </div>
              </Section>
              <Section title={lang === 'th' ? 'ผลการดำเนินงาน Q' : 'Performance Distribution'}>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={performanceDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {performanceDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={donutColors[index % donutColors.length]} />))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="ml-4 space-y-2 min-w-max">
                    <div className="text-center font-bold text-gray-900"><div className="text-2xl">307</div><div className="text-xs text-gray-500">{lang === 'th' ? 'รวม' : 'Total'}</div></div>
                    <div className="text-xs space-y-1">
                      {performanceDistribution.map((item, idx) => (<div key={item.name} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: donutColors[idx] }} /><span>{item.name}: {item.value}</span></div>))}
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            <DetailPanel>
              {metrics.topPerformer && (
                <Section>
                  <div className="text-center space-y-3">
                    <Avatar name={metrics.topPerformer.full_name} size="xl" className="mx-auto" />
                    <div><h4 className="font-semibold text-gray-900 text-sm">{metrics.topPerformer.full_name}</h4><p className="text-xs text-gray-500">{metrics.topPerformer.position}</p></div>
                    <div className="flex justify-center"><ScoreCircle score={metrics.topPerformer.avg_score} max={5} size={80} /></div>
                    <StatusBadge status="completed" labels={{ completed: 'Top 10%' }} />
                    <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-gray-100"><div>{lang === 'th' ? 'ผลสำเร็จ OKR' : 'OKR Achievements'}:</div><div className="font-medium">85% {lang === 'th' ? 'บรรลุเป้าหมาย' : 'Achieved'}</div></div>
                  </div>
                </Section>
              )}
              <Section title={lang === 'th' ? 'ระบบ Feedback จากผู้บังคับบัญชา' : 'Manager Feedback'}>
                <div className="space-y-3 text-sm">
                  {[{ label: lang === 'th' ? 'เป้าหมายชัดเจน' : 'Clear Goals', pct: '92%', color: 'bg-blue-500' },
                    { label: lang === 'th' ? 'การสนับสนุน' : 'Support', pct: '88%', color: 'bg-green-500' },
                    { label: lang === 'th' ? 'การพัฒนา' : 'Development', pct: '85%', color: 'bg-yellow-500' }
                  ].map(f => (<div key={f.label} className="flex items-start gap-2"><div className={`w-2 h-2 rounded-full ${f.color} mt-1.5 flex-shrink-0`} /><div><p className="font-medium text-gray-700">{f.label}</p><p className="text-xs text-gray-500">{f.pct} {lang === 'th' ? 'ความพึงพอใจ' : 'satisfaction'}</p></div></div>))}
                </div>
              </Section>
            </DetailPanel>
          </div>

          <div className="space-y-4">
            <Section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{lang === 'th' ? 'ตัวกรอง' : 'Filters'}</h3>
                <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImport(true)} lang={lang} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">{lang === 'th' ? 'ประเภท' : 'Type'}</label>
                  <TabPills tabs={[
                    { key: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All', count: companyFilteredEmployees.length },
                    { key: 'A', label: 'A', count: companyFilteredEmployees.filter(e => e.grade === 'A').length },
                    { key: 'B+', label: 'B+', count: companyFilteredEmployees.filter(e => e.grade === 'B+').length },
                    { key: 'B', label: 'B', count: companyFilteredEmployees.filter(e => e.grade === 'B').length },
                    { key: 'C+', label: 'C+', count: companyFilteredEmployees.filter(e => e.grade === 'C+').length },
                  ]} active={filterType} onChange={setFilterType} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">{lang === 'th' ? 'แผนก' : 'Department'}</label>
                    <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {departments.map(d => (<option key={d.key} value={d.key}>{d.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">{lang === 'th' ? 'ช่วงเวลา' : 'Period'}</label>
                    <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="2024-Q4">Q4 2024</option><option value="2024-Q3">Q3 2024</option><option value="2024-Q2">Q2 2024</option><option value="2024-Q1">Q1 2024</option>
                    </select>
                  </div>
                </div>
              </div>
            </Section>

            <Section title={lang === 'th' ? 'รายชื่อพนักงาน' : 'Employee List'}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 text-xs">{lang === 'th' ? 'ลำดับ' : 'No.'}</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 text-xs">{lang === 'th' ? 'ชื่อ-นามสกุล' : 'Name'}</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 text-xs">{lang === 'th' ? 'แผนก' : 'Department'}</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs">{lang === 'th' ? 'คะแนนหัวหน้า' : 'Boss Score'}</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs">{lang === 'th' ? 'คะแนนตนเอง' : 'Self Score'}</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs">{lang === 'th' ? 'คะแนนเฉลี่ย' : 'Avg Score'}</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs">{lang === 'th' ? 'เกรด' : 'Grade'}</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 text-xs">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {employeeList.map((emp, idx) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{idx + 1}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={emp.full_name} size="sm" /><div><p className="font-medium text-gray-900">{emp.full_name}</p><p className="text-xs text-gray-500">{emp.employee_code}</p></div></div></td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{emp.department}</td>
                        <td className="px-4 py-3 text-center font-medium text-gray-900">{emp.boss_score.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{emp.self_score.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{emp.avg_score.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${emp.grade === 'A' ? 'bg-green-100 text-green-700' : emp.grade === 'B+' ? 'bg-blue-100 text-blue-700' : emp.grade === 'B' ? 'bg-cyan-100 text-cyan-700' : emp.grade === 'C+' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>{emp.grade}</span></td>
                        <td className="px-4 py-3 text-center"><StatusBadge status="completed" labels={{ completed: lang === 'th' ? 'เสร็จสิ้น' : 'Completed' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {employeeList.length === 0 && <div className="text-center py-8 text-gray-400">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}</div>}
            </Section>
          </div>

          <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} columns={performanceColumns} tableName={lang === 'th' ? 'ผลการประเมิน' : 'Performance Reviews'} lang={lang} />
        </>
      )}
    </div>
  )
}

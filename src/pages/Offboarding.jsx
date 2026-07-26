import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Search, Download, Plus, FileText, ArrowLeft, CheckCircle, ClipboardList,
  Users, Clock, Calendar, X, TrendingDown, AlertTriangle,
} from 'lucide-react';
import { exportToExcel } from '../components/ImportExport';

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const PIE_COLORS = ['#78c045','#1692dc','#f59e0b','#00afab','#ff5252','#ec4899','#8b5cf6','#f97316'];

const TYPE_BADGE  = { resign: 'bg-[#f0f9e8] text-[#5a9030]', layoff: 'bg-red-100 text-red-700' };
const TYPE_LABEL  = { resign: 'ลาออกเอง', layoff: 'Layoff' };

const REASON_CATEGORIES = [
  { label: 'ค่าตอบแทน/เงินเดือน',     keys: ['เงินเดือน','ค่าตอบแทน','รายได้','เงิน','ค่าจ้าง'] },
  { label: 'ความก้าวหน้าในสายงาน',     keys: ['เติบโต','ก้าวหน้า','ความก้าวหน้า','ตำแหน่ง','promotion'] },
  { label: 'สภาพแวดล้อมการทำงาน',     keys: ['สภาพแวดล้อม','วัฒนธรรม','บรรยากาศ','หัวหน้า','เพื่อนร่วมงาน','บริหาร','ผู้บังคับบัญชา'] },
  { label: 'ย้ายที่อยู่/ภูมิลำเนา',   keys: ['ย้าย','ภูมิลำเนา','ต่างจังหวัด','ต่างประเทศ','บ้าน'] },
  { label: 'เหตุผลส่วนตัว/ครอบครัว', keys: ['สุขภาพ','ครอบครัว','ส่วนตัว','ป่วย','แต่งงาน','มีบุตร'] },
  { label: 'โอกาสงานใหม่',            keys: ['โอกาส','งานใหม่','บริษัทใหม่','ธุรกิจ','กิจการ','ประกอบอาชีพ'] },
  { label: 'การศึกษา/เรียนต่อ',       keys: ['เรียน','ศึกษา','ต่อ','มหาวิทยาลัย','ทุน'] },
];

function categorizeReason(text) {
  if (!text) return 'ไม่ระบุ';
  const t = text.toLowerCase();
  for (const cat of REASON_CATEGORIES) {
    if (cat.keys.some(k => t.includes(k))) return cat.label;
  }
  return 'อื่นๆ';
}

// ─── Sub-components ────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, colorClass = 'bg-[#f0f9e8]', iconColor = 'text-[#78c045]' }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${colorClass}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  </div>
);

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const resign = payload.find(p => p.dataKey === 'resign')?.value || 0;
  const layoff = payload.find(p => p.dataKey === 'layoff')?.value || 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm min-w-[140px]">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {resign > 0 && <p className="text-[#78c045]">ลาออกเอง: {resign} คน</p>}
      {layoff > 0 && <p className="text-red-500">Layoff: {layoff} คน</p>}
      <p className="text-gray-700 font-bold border-t border-gray-100 mt-1 pt-1">รวม: {resign + layoff} คน</p>
    </div>
  );
};

// ─── Record Detail Modal ───────────────────────────────────────────────────────
const RecordDetail = ({ record, onClose }) => {
  const raw = record._raw;
  const isResign = record.type === 'resign';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full h-[88vh] overflow-y-auto rounded-t-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center gap-4">
          <button onClick={onClose} className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-bold text-gray-900">{record.full_name}</h2>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[record.type]}`}>{TYPE_LABEL[record.type]}</span>
            </div>
            <p className="text-gray-500 text-sm">
              {record.department !== '-' ? record.department : ''}
              {record.position !== '-' ? ` · ${record.position}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-[#e2f4d3] text-[#5a9030] text-xs font-semibold px-2.5 py-0.5 rounded-full">{record.month_label}</span>
              {record.company_entity !== '-' && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{record.company_entity}</span>
              )}
              {raw?.ref_no && <span className="text-xs text-gray-400">{raw.ref_no}</span>}
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isResign && raw?.resign_notify_date && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">วันที่แจ้งลาออก</p>
                <p className="text-gray-900 font-semibold">{new Date(raw.resign_notify_date).toLocaleDateString('th-TH')}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium mb-1">วันทำงานสุดท้าย</p>
              <p className="text-gray-900 font-semibold">{record.last_working_date ? new Date(record.last_working_date).toLocaleDateString('th-TH') : '-'}</p>
            </div>
            {!isResign && raw?.final_salary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-medium mb-1">เงินเดือนสุดท้าย</p>
                <p className="text-gray-900 font-semibold">{Number(raw.final_salary).toLocaleString()} บาท</p>
              </div>
            )}
          </div>
          {!isResign && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" /> ประเภทการพ้นสภาพ
              </p>
              <p className="text-gray-800 text-sm">
                {raw?.separation_type === 'layoff'    ? 'ถูกเลิกจ้าง (Layoff)'    :
                 raw?.separation_type === 'terminate' ? 'ถูกเลิกจ้าง (Terminate)' :
                 raw?.separation_type || '-'}
              </p>
              {raw?.status && (
                <p className="text-xs text-gray-500 mt-1">สถานะ: {
                  raw.status === 'completed'   ? 'เสร็จสิ้น'  :
                  raw.status === 'in_progress' ? 'ดำเนินการ' : raw.status
                }</p>
              )}
            </div>
          )}
          {record.resign_reason && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#78c045]" /> เหตุผลการลาออก
              </p>
              <p className="text-gray-800 text-sm whitespace-pre-line leading-relaxed">{record.resign_reason}</p>
            </div>
          )}
          {record.suggestions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" /> ข้อเสนอแนะ
              </p>
              <p className="text-gray-800 text-sm whitespace-pre-line leading-relaxed">{record.suggestions}</p>
            </div>
          )}
          {record.company_strengths && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> ข้อดีของบริษัท
              </p>
              <p className="text-gray-800 text-sm whitespace-pre-line leading-relaxed">{record.company_strengths}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Add Exit Interview Modal ─────────────────────────────────────────────────
const AddExitInterviewModal = ({ existing, onClose, onSaved }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    full_name:          existing?.full_name          || '',
    department:         existing?.department         || '',
    position:           existing?.position           || '',
    company_entity:     existing?.company_entity     || '',
    resign_notify_date: existing?.resign_notify_date || '',
    last_working_date:  existing?.last_working_date  || '',
    month_label:        existing?.month_label        || '',
    resign_reason:      existing?.resign_reason      || '',
    suggestions:        existing?.suggestions        || '',
    company_strengths:  existing?.company_strengths  || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  const handleDateChange = v => { set('last_working_date', v); if (v) set('month_label', THAI_MONTHS[new Date(v).getMonth()]); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.full_name.trim()) { setError('กรุณากรอกชื่อพนักงาน'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { error: err } = await supabase.from('hr_exit_interviews')
          .update({ resign_reason: form.resign_reason, suggestions: form.suggestions, company_strengths: form.company_strengths })
          .eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('hr_exit_interviews').insert([form]);
        if (err) throw err;
      }
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'เพิ่มข้อมูล Exit Interview' : 'เพิ่ม Exit Interview'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl}>ชื่อ-สกุล *</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inp} placeholder="ชื่อ นามสกุล" /></div>
                <div>
                  <label className={lbl}>บริษัท</label>
                  <select value={form.company_entity} onChange={e => set('company_entity', e.target.value)} className={inp}>
                    <option value="">เลือกบริษัท</option>
                    <option value="ONL">ONL</option><option value="ATESS">ATESS</option><option value="SMT">SMT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl}>ฝ่ายงาน</label><input value={form.department} onChange={e => set('department', e.target.value)} className={inp} placeholder="ชื่อฝ่ายงาน" /></div>
                <div><label className={lbl}>ตำแหน่ง</label><input value={form.position} onChange={e => set('position', e.target.value)} className={inp} placeholder="ตำแหน่งงาน" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl}>วันที่แจ้งลาออก</label><input type="date" value={form.resign_notify_date} onChange={e => set('resign_notify_date', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>วันทำงานสุดท้าย</label><input type="date" value={form.last_working_date} onChange={e => handleDateChange(e.target.value)} className={inp} /></div>
              </div>
            </>
          )}
          <div><label className={lbl}>เหตุผลการลาออก</label><textarea value={form.resign_reason} onChange={e => set('resign_reason', e.target.value)} className={inp + ' resize-none'} rows={4} placeholder="ระบุเหตุผลการลาออก..." /></div>
          <div><label className={lbl}>ข้อเสนอแนะ</label><textarea value={form.suggestions} onChange={e => set('suggestions', e.target.value)} className={inp + ' resize-none'} rows={3} placeholder="ข้อเสนอแนะต่อบริษัท..." /></div>
          <div><label className={lbl}>ข้อดีของบริษัท</label><textarea value={form.company_strengths} onChange={e => set('company_strengths', e.target.value)} className={inp + ' resize-none'} rows={3} placeholder="สิ่งที่พนักงานชื่นชม..." /></div>
          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Offboarding() {
  const [allRecords, setAllRecords]         = useState([]);
  const [loading, setLoading]               = useState(false);
  const [selectedYear, setSelectedYear]     = useState('2026');
  const [selectedCo, setSelectedCo]         = useState('all');
  const [typeFilter, setTypeFilter]         = useState('all');
  const [eiMonth, setEiMonth]               = useState('all');
  const [eiSearch, setEiSearch]             = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [addModalData, setAddModalData]     = useState(null);
  const [totalHeadcount, setTotalHeadcount] = useState(0);
  const [avgTenure, setAvgTenure]           = useState(null);

  useEffect(() => {
    fetchAllData();
    fetchHeadcount();
    fetchAvgTenure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // ── Fetch resign (exit interviews) ──
  const fetchResigns = async () => {
    const { data, error } = await supabase
      .from('hr_exit_interviews')
      .select('*')
      .order('last_working_date', { ascending: false });
    if (error) { console.error('exit_interviews:', error); return []; }
    return (data || []).map(ei => ({
      uid: `ei_${ei.id}`,
      type: 'resign',
      full_name: ei.full_name || '-',
      department: ei.department || '-',
      position: ei.position || '-',
      company_entity: ei.company_entity || '-',
      last_working_date: ei.last_working_date,
      month_label: ei.month_label || (ei.last_working_date ? THAI_MONTHS[new Date(ei.last_working_date).getMonth()] : '-'),
      resign_reason: ei.resign_reason || null,
      suggestions: ei.suggestions || null,
      company_strengths: ei.company_strengths || null,
      _raw: ei,
    }));
  };

  // ── Fetch layoffs (offboarding, non-resign) ──
  const fetchLayoffs = async () => {
    const { data, error } = await supabase
      .from('hr_offboarding')
      .select(`
        id, resignation_date, last_working_date, separation_type, status, final_salary,
        hr_employees!hr_offboarding_employee_id_fkey(
          id, employee_code, first_name_th, last_name_th, position_th, company_entity
        )
      `)
      .not('separation_type', 'eq', 'resign')
      .order('last_working_date', { ascending: false });
    if (error) { console.error('offboarding:', error); return []; }
    return (data || []).map(ob => {
      const emp = ob.hr_employees;
      const lwd = ob.last_working_date || ob.resignation_date;
      return {
        uid: `ob_${ob.id}`,
        type: 'layoff',
        full_name: emp ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim() || '-' : '-',
        department: '-',
        position: emp?.position_th || '-',
        company_entity: emp?.company_entity || '-',
        last_working_date: lwd || null,
        month_label: lwd ? THAI_MONTHS[new Date(lwd).getMonth()] : '-',
        resign_reason: null,
        suggestions: null,
        company_strengths: null,
        _raw: ob,
      };
    });
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [resigns, layoffs] = await Promise.all([fetchResigns(), fetchLayoffs()]);
      const combined = [...resigns, ...layoffs].sort((a, b) => {
        if (!a.last_working_date) return 1;
        if (!b.last_working_date) return -1;
        return new Date(b.last_working_date) - new Date(a.last_working_date);
      });
      setAllRecords(combined);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchHeadcount = async () => {
    try {
      const { count } = await supabase.from('hr_employees')
        .select('*', { count: 'exact', head: true }).neq('status', 'resigned');
      setTotalHeadcount(count || 0);
    } catch (e) { console.error(e); }
  };

  const fetchAvgTenure = async () => {
    try {
      const { data } = await supabase.from('hr_employees')
        .select('hire_date, termination_date').eq('status', 'resigned')
        .gte('termination_date', `${selectedYear}-01-01`)
        .lte('termination_date', `${selectedYear}-12-31`);
      if (!data?.length) { setAvgTenure(null); return; }
      const tenures = data.filter(e => e.hire_date && e.termination_date)
        .map(e => (new Date(e.termination_date) - new Date(e.hire_date)) / (365.25 * 864e5));
      if (!tenures.length) { setAvgTenure(null); return; }
      setAvgTenure((tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1));
    } catch (e) { console.error(e); }
  };

  // ── Derived ──
  const yearRecords = useMemo(() =>
    allRecords.filter(r =>
      selectedYear === 'all' ? true :
      r.last_working_date ? String(new Date(r.last_working_date).getFullYear()) === selectedYear : false
    ), [allRecords, selectedYear]);

  const coRecords = useMemo(() =>
    selectedCo === 'all' ? yearRecords : yearRecords.filter(r => r.company_entity === selectedCo),
    [yearRecords, selectedCo]);

  const typeRecords = useMemo(() =>
    typeFilter === 'all' ? coRecords : coRecords.filter(r => r.type === typeFilter),
    [coRecords, typeFilter]);

  const filteredRecords = useMemo(() => {
    let list = typeRecords;
    if (eiMonth !== 'all') list = list.filter(r => r.month_label === eiMonth);
    if (eiSearch) {
      const s = eiSearch.toLowerCase();
      list = list.filter(r =>
        (r.full_name || '').toLowerCase().includes(s) ||
        (r.department || '').toLowerCase().includes(s) ||
        (r.position || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [typeRecords, eiMonth, eiSearch]);

  const monthlyData = useMemo(() =>
    THAI_MONTHS.map(m => ({
      month: m,
      resign: coRecords.filter(r => r.type === 'resign' && r.month_label === m).length,
      layoff: coRecords.filter(r => r.type === 'layoff' && r.month_label === m).length,
    })), [coRecords]);

  const topReasons = useMemo(() => {
    const counts = {};
    coRecords.filter(r => r.type === 'resign').forEach(r => {
      const cat = categorizeReason(r.resign_reason);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [coRecords]);

  const companyBreakdown = useMemo(() => {
    const counts = {};
    coRecords.forEach(r => {
      const c = (r.company_entity && r.company_entity !== '-') ? r.company_entity : 'ไม่ระบุ';
      counts[c] = (counts[c] || 0) + 1;
    });
    const total = coRecords.length || 1;
    return Object.entries(counts)
      .map(([company, count]) => ({ company, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [coRecords]);

  const deptData = useMemo(() => {
    const counts = {};
    coRecords.forEach(r => {
      if (r.department && r.department !== '-') counts[r.department] = (counts[r.department] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 7);
  }, [coRecords]);

  const kpiData = useMemo(() => {
    const total       = coRecords.length;
    const resignCount = coRecords.filter(r => r.type === 'resign').length;
    const layoffCount = coRecords.filter(r => r.type === 'layoff').length;
    const headcount   = totalHeadcount + total;
    const turnoverRate = headcount > 0 ? ((total / headcount) * 100).toFixed(1) : '0.0';
    const monthlyCounts = {};
    coRecords.forEach(r => { if (r.month_label && r.month_label !== '-') monthlyCounts[r.month_label] = (monthlyCounts[r.month_label] || 0) + 1; });
    const peakEntry = Object.entries(monthlyCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, resignCount, layoffCount, turnoverRate, peakMonth: peakEntry?.[0] || '-', peakCount: peakEntry?.[1] || 0 };
  }, [coRecords, totalHeadcount]);

  const monthCounts = useMemo(() => {
    const c = {};
    THAI_MONTHS.forEach(m => { c[m] = 0; });
    typeRecords.forEach(r => { if (r.month_label && r.month_label !== '-') c[r.month_label] = (c[r.month_label] || 0) + 1; });
    return c;
  }, [typeRecords]);

  const uniqueCompanies = useMemo(() =>
    Array.from(new Set(allRecords.map(r => r.company_entity).filter(c => c && c !== '-'))).sort(),
    [allRecords]);

  const handleExport = () => {
    exportToExcel({
      data: filteredRecords,
      columns: [
        { header: 'ประเภท',          accessor: r => TYPE_LABEL[r.type],    width: 12 },
        { header: 'เดือน',           accessor: r => r.month_label || '-',   width: 10 },
        { header: 'ชื่อ-สกุล',       accessor: r => r.full_name || '-',     width: 24 },
        { header: 'ฝ่ายงาน',         accessor: r => r.department || '-',    width: 22 },
        { header: 'ตำแหน่ง',         accessor: r => r.position || '-',      width: 22 },
        { header: 'บริษัท',          accessor: r => r.company_entity || '-', width: 12 },
        { header: 'วันทำงานสุดท้าย', accessor: r => r.last_working_date ? new Date(r.last_working_date).toLocaleDateString('th-TH') : '-', width: 18 },
        { header: 'เหตุผลลาออก',     accessor: r => r.resign_reason || '-', width: 50 },
      ],
      filename: `offboarding_${selectedYear}`,
      sheetName: 'พ้นสภาพพนักงาน',
    });
  };

  const maxReason = topReasons[0]?.count || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-900">พ้นสภาพพนักงาน</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={selectedCo} onChange={e => setSelectedCo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">ทุกบริษัท</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
            <button onClick={() => setAddModalData(false)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> เพิ่ม Exit Interview
            </button>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => { setTypeFilter('all'); setEiMonth('all'); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            ทั้งหมด ({kpiData.total})
          </button>
          <button onClick={() => { setTypeFilter('resign'); setEiMonth('all'); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === 'resign' ? 'bg-[#78c045] text-white' : 'bg-[#f0f9e8] text-[#5a9030] hover:bg-[#d4efc0]'}`}>
            ลาออกเอง ({kpiData.resignCount})
          </button>
          <button onClick={() => { setTypeFilter('layoff'); setEiMonth('all'); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === 'layoff' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
            Layoff ({kpiData.layoffCount})
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KPICard icon={TrendingDown}  label="พ้นสภาพรวม YTD"  value={kpiData.total}              sub={`ปี ${selectedYear}`}      colorClass="bg-red-50"    iconColor="text-red-500" />
          <KPICard icon={Users}         label="ลาออกเอง"         value={kpiData.resignCount}        sub="Exit Interview"            colorClass="bg-[#f0f9e8]" iconColor="text-[#78c045]" />
          <KPICard icon={AlertTriangle} label="Layoff"           value={kpiData.layoffCount}        sub="ถูกเลิกจ้าง"              colorClass="bg-orange-50" iconColor="text-orange-500" />
          <KPICard icon={Clock}         label="อัตราพ้นสภาพ"     value={`${kpiData.turnoverRate}%`} sub="ของพนักงานทั้งหมด"        colorClass="bg-blue-50"   iconColor="text-blue-500" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Monthly stacked bar */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">แนวโน้มการพ้นสภาพรายเดือน</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-[#f0f9e8]0" /> ลาออกเอง</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-red-400" /> Layoff</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="resign" name="ลาออกเอง" fill="#6366f1" stackId="a" />
                <Bar dataKey="layoff" name="Layoff"   fill="#f87171" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top resign reasons */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-0.5">Top เหตุผลลาออกเอง</h3>
            <p className="text-xs text-gray-400 mb-3">จากผู้ทำ Exit Interview</p>
            {topReasons.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {topReasons.map((r, i) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate max-w-[160px]">{r.label}</span>
                      <span className="text-xs font-bold text-gray-800 ml-1 flex-shrink-0">{r.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${(r.count / maxReason) * 100}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Company breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">สัดส่วนตามบริษัท</h3>
            {companyBreakdown.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">ไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3.5">
                {companyBreakdown.map((c, i) => (
                  <div key={c.company}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{c.company}</span>
                      <span className="text-xs text-gray-500">{c.count} คน ({c.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${c.pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department donut */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">การพ้นสภาพตามแผนก</h3>
            {deptData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">ไม่มีข้อมูลแผนก</p>
            ) : (
              <div className="flex items-center gap-2">
                <ResponsiveContainer width="45%" height={200}>
                  <PieChart>
                    <Pie data={deptData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} dataKey="value">
                      {deptData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} คน`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 overflow-hidden">
                  {deptData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700 flex-shrink-0">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="ค้นหาชื่อ, ฝ่ายงาน..." value={eiSearch}
                  onChange={e => setEiSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleExport}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            {/* Month filter pills */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setEiMonth('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${eiMonth === 'all' ? 'bg-[#78c045] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                ทั้งหมด
              </button>
              {THAI_MONTHS.map(m => {
                const cnt = monthCounts[m] || 0;
                if (!cnt) return null;
                return (
                  <button key={m} onClick={() => setEiMonth(eiMonth === m ? 'all' : m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${eiMonth === m ? 'bg-[#78c045] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {m} <span className={eiMonth === m ? 'opacity-75' : 'text-[#78c045] font-bold'}>{cnt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">กำลังโหลด...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">ไม่พบข้อมูล</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['ประเภท','เดือน','ชื่อ-สกุล','ฝ่ายงาน','บริษัท','วันทำงานสุดท้าย','สถานะ',''].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.map(r => {
                    const isResign = r.type === 'resign';
                    const hasData  = isResign ? !!r.resign_reason : true;
                    return (
                      <tr key={r.uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${TYPE_BADGE[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{r.month_label || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{r.full_name}</p>
                          {r.position !== '-' && <p className="text-xs text-gray-400 mt-0.5">{r.position}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.company_entity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {r.last_working_date ? new Date(r.last_working_date).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {isResign ? (
                            hasData ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <CheckCircle className="w-3 h-3" /> มีข้อมูล
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <Clock className="w-3 h-3" /> ยังไม่มี
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Layoff
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isResign && !hasData ? (
                            <button onClick={() => setAddModalData(r._raw)}
                              className="text-amber-600 hover:bg-amber-50 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 transition-colors">
                              เพิ่มข้อมูล
                            </button>
                          ) : (
                            <button onClick={() => setSelectedRecord(r)}
                              className="text-[#78c045] hover:bg-[#f0f9e8] text-xs font-medium px-3 py-1.5 rounded-lg border border-[#c6e8a3] transition-colors">
                              ดูรายละเอียด
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      {selectedRecord && <RecordDetail record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
      {addModalData !== null && (
        <AddExitInterviewModal
          existing={addModalData || null}
          onClose={() => setAddModalData(null)}
          onSaved={() => { setAddModalData(null); fetchAllData(); }}
        />
      )}
    </div>
  );
}

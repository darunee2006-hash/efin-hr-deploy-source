/**
 * Recruitment.jsx — แดชบอร์ดงานสรรหา + กรอกข้อมูล
 * Tab 1: Dashboard (charts + KPIs)
 * Tab 2: กรอกข้อมูล (update status / pipeline / log / close / create)
 * Online Asset design system: #78c045 green, #ffffff/#f6f6f6 BG, #333333 text
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport';
import { supabase } from '../lib/supabase';

/* ─── Design Tokens ──────────────────────────────────────── */
const OA = {
  bg:     '#ffffff',
  bgSoft: '#f6f6f6',
  text:   '#333333',
  muted:  '#8c8c8c',
  border: 'rgba(26,26,26,0.10)',
  accent: '#78c045',
  blue:   '#1692dc',
  teal:   '#00afab',
  red:    '#ff5252',
  orange: '#f39c12',
  purple: '#9b59b6',
  dark:   '#4e4e4e',
};
const SHADOW = '0 2px 14px rgba(0,0,0,0.07)';
const RADIUS = 12;

/* ─── Status config ─────────────────────────────────────── */
const STATUS_CFG = {
  open:         { label: 'เปิดรับ',     color: OA.accent, bg: OA.accent + '20' },
  screening:    { label: 'คัดกรอง',     color: OA.blue,   bg: OA.blue   + '20' },
  interviewing: { label: 'สัมภาษณ์',    color: OA.teal,   bg: OA.teal   + '20' },
  offering:     { label: 'ยื่นข้อเสนอ', color: OA.orange, bg: OA.orange + '20' },
  filled:       { label: 'ปิดแล้ว',    color: '#fff',    bg: OA.teal          },
  cancelled:    { label: 'ยกเลิก',     color: '#fff',    bg: OA.red           },
  on_hold:      { label: 'รอ',          color: '#fff',    bg: OA.dark          },
  draft:        { label: 'ร่าง',        color: OA.muted,  bg: '#e0e0e0'        },
};

const PIPELINE_STAGES = [
  { key: 'open',         label: 'เปิดรับ',       color: OA.accent },
  { key: 'screening',    label: 'คัดกรอง',       color: OA.blue   },
  { key: 'interviewing', label: 'สัมภาษณ์',      color: OA.teal   },
  { key: 'offering',     label: 'ยื่นข้อเสนอ',   color: OA.orange },
  { key: 'filled',       label: 'ปิดสำเร็จ',    color: '#2ecc71'  },
  { key: 'cancelled',    label: 'ยกเลิก',       color: OA.red    },
];

/* ─── Recruiter avatar colors ────────────────────────────── */
const PERSON_COLORS = {
  'พรีม': OA.blue, 'ลูกหยี': '#e84393', 'ยุ้ย': OA.purple,
  'ปลา': OA.teal,  'บีม': OA.orange,    'นิ้ง': '#e67e22',
};

/* ─── Helpers ────────────────────────────────────────────── */
const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

function normalizeBU(bu) {
  if (!bu) return 'ไม่ระบุ';
  const l = bu.toLowerCase().trim();
  if (l === 'center')                        return 'Center';
  if (l === 'content')                       return 'Content';
  if (l === 'efin.finance')                  return 'efin.finance';
  if (l === 'ir plus')                       return 'IR PLUS';
  if (l === 'it - efin' || l === 'it-efin') return 'IT - efin';
  if (l === 'atess')                         return 'Atess';
  if (l === 'efinxpert')                     return 'efinXpert';
  if (l === 'mol')                           return 'MOL';
  return bu;
}

/* ─── Sub-components ─────────────────────────────────────── */

function Card({ children, style, ...p }) {
  return (
    <div style={{ background: OA.bg, borderRadius: RADIUS, boxShadow: SHADOW, ...style }} {...p}>
      {children}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 4, height: 16, background: OA.accent, borderRadius: 2 }} />
        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 13, color: OA.text }}>
          {children}
        </span>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: OA.muted, bg: '#eee' };
  return (
    <span style={{
      display: 'inline-block', borderRadius: 100,
      padding: '3px 12px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  );
}

function Avatar({ name, size = 28 }) {
  if (!name) return <span style={{ color: '#ccc', fontSize: 12 }}>—</span>;
  const c = PERSON_COLORS[name] || OA.dark;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: c, color: '#fff', fontWeight: 700,
      fontSize: Math.max(9, size * 0.38), flexShrink: 0,
    }}>{name.slice(0, 2)}</span>
  );
}

/* ─── KPI Card ───────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, color }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, marginBottom: 12,
        background: (color || OA.accent) + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{icon}</div>
      <p style={{ margin: '0 0 2px', fontSize: 11, color: OA.muted, fontWeight: 500 }}>{label}</p>
      <p style={{
        margin: 0,
        fontFamily: 'Montserrat,sans-serif', fontWeight: 700,
        fontSize: 30, color: color || OA.text, lineHeight: 1,
      }}>{value}</p>
      {sub && <p style={{ margin: '5px 0 0', fontSize: 11, color: OA.muted }}>{sub}</p>}
    </Card>
  );
}

/* ─── Dropdown ───────────────────────────────────────────── */
function Dropdown({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        border: `1px solid ${OA.border}`, borderRadius: 8,
        padding: '8px 14px', fontSize: 13, color: OA.text,
        background: OA.bg, cursor: 'pointer', outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      <option value="all">{placeholder}</option>
      {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );
}

/* ─── Input field helper ─────────────────────────────────── */
function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: OA.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: OA.red, marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 10, color: OA.muted }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', border: `1px solid ${OA.border}`,
        borderRadius: 8, fontSize: 13, color: OA.text, background: disabled ? OA.bgSoft : OA.bg,
        fontFamily: 'inherit',
      }}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', border: `1px solid ${OA.border}`,
        borderRadius: 8, fontSize: 13, color: OA.text, background: disabled ? OA.bgSoft : OA.bg,
        fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ onClick, children, variant = 'primary', disabled, small }) {
  const styles = {
    primary:  { background: OA.accent, color: '#fff', border: 'none' },
    outline:  { background: 'transparent', color: OA.accent, border: `1.5px solid ${OA.accent}` },
    danger:   { background: OA.red, color: '#fff', border: 'none' },
    ghost:    { background: 'transparent', color: OA.muted, border: `1.5px solid ${OA.border}` },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...s, borderRadius: 8, padding: small ? '6px 14px' : '9px 18px',
        fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
        transition: 'opacity 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── Save feedback toast ────────────────────────────────── */
function Toast({ msg, type = 'success' }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: type === 'success' ? OA.accent : OA.red,
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontSize: 13, fontWeight: 600, boxShadow: SHADOW,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {type === 'success' ? '✓' : '✕'} {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM TAB COMPONENT
═══════════════════════════════════════════════════════════ */
function RecruitmentFormTab({ data, onRefresh }) {
  /* ── State ───────────────────────────────────────────────── */
  const [selected, setSelected]       = useState(null);
  const [search, setSearch]           = useState('');
  const [listFilter, setListFilter]   = useState('all'); // status filter for list
  const [showCreate, setShowCreate]   = useState(false);
  const [saving, setSaving]           = useState('');    // which section is saving
  const [toast, setToast]             = useState(null);  // { msg, type }
  const [loggerName, setLoggerName]   = useState('');    // who is logging

  /* Edit state for selected position */
  const [editStatus, setEditStatus]   = useState('');
  const [editPipeline, setEditPipeline] = useState({ applied: 0, screened: 0, interviewed: 0, offered: 0 });
  const [noteText, setNoteText]       = useState('');
  const [hiredName, setHiredName]     = useState('');
  const [hiredStart, setHiredStart]   = useState('');

  /* Create form state */
  const [newForm, setNewForm] = useState({
    wams_ref: '', position_title: '', bu: '', department_name: '',
    recruitment_type: '', employment_type: '', headcount: 1,
    responsible_person: '', open_date: '', sla_days: 60,
    notes: '', status: 'open',
  });

  /* ── When position selected, pre-fill form fields ──────── */
  const selectPosition = (row) => {
    setSelected(row);
    setEditStatus(row.status || 'open');
    setEditPipeline({
      applied:     row.candidates_applied     || 0,
      screened:    row.candidates_screened    || 0,
      interviewed: row.candidates_interviewed || 0,
      offered:     row.candidates_offered     || 0,
    });
    setHiredName(row.hired_person_name || '');
    setHiredStart(row.start_date ? row.start_date.split('T')[0] : '');
    setNoteText('');
  };

  /* ── Toast helper ────────────────────────────────────────── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Add activity log entry ─────────────────────────────── */
  const appendLog = (existingLog, action, text) => {
    const entry = {
      at:   new Date().toISOString(),
      by:   loggerName || 'เจ้าหน้าที่',
      type: action,
      text,
    };
    return [...(existingLog || []), entry];
  };

  /* ── SAVE: Status update ─────────────────────────────────── */
  const saveStatus = async () => {
    if (!selected) return;
    setSaving('status');
    const newLog = appendLog(selected.activity_log, 'status', `เปลี่ยนสถานะ: ${(STATUS_CFG[selected.status] || {}).label || selected.status} → ${(STATUS_CFG[editStatus] || {}).label || editStatus}`);
    const { error } = await supabase
      .from('hr_recruitment')
      .update({ status: editStatus, activity_log: newLog, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setSaving('');
    if (error) { showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return; }
    showToast('อัพเดทสถานะสำเร็จ');
    await onRefresh();
    setSelected(prev => prev ? { ...prev, status: editStatus, activity_log: newLog } : prev);
  };

  /* ── SAVE: Pipeline counts ───────────────────────────────── */
  const savePipeline = async () => {
    if (!selected) return;
    setSaving('pipeline');
    const newLog = appendLog(selected.activity_log, 'pipeline',
      `อัพเดท Pipeline — สมัคร: ${editPipeline.applied}, คัดกรอง: ${editPipeline.screened}, สัมภาษณ์: ${editPipeline.interviewed}, Offer: ${editPipeline.offered}`);
    const { error } = await supabase
      .from('hr_recruitment')
      .update({
        candidates_applied:     parseInt(editPipeline.applied)     || 0,
        candidates_screened:    parseInt(editPipeline.screened)    || 0,
        candidates_interviewed: parseInt(editPipeline.interviewed) || 0,
        candidates_offered:     parseInt(editPipeline.offered)     || 0,
        activity_log: newLog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);
    setSaving('');
    if (error) { showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return; }
    showToast('บันทึก Pipeline สำเร็จ');
    await onRefresh();
    setSelected(prev => prev ? { ...prev, ...{ candidates_applied: editPipeline.applied, candidates_screened: editPipeline.screened, candidates_interviewed: editPipeline.interviewed, candidates_offered: editPipeline.offered, activity_log: newLog } } : prev);
  };

  /* ── SAVE: Note / progress log ───────────────────────────── */
  const saveNote = async () => {
    if (!selected || !noteText.trim()) return;
    setSaving('note');
    const newLog = appendLog(selected.activity_log, 'note', noteText.trim());
    const { error } = await supabase
      .from('hr_recruitment')
      .update({ activity_log: newLog, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setSaving('');
    if (error) { showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return; }
    showToast('บันทึกความคืบหน้าสำเร็จ');
    setNoteText('');
    await onRefresh();
    setSelected(prev => prev ? { ...prev, activity_log: newLog } : prev);
  };

  /* ── SAVE: Close position (filled) ──────────────────────── */
  const closePosition = async () => {
    if (!selected || !hiredName.trim()) return;
    setSaving('close');
    const today = new Date().toISOString().split('T')[0];
    const newLog = appendLog(selected.activity_log, 'close',
      `ปิดตำแหน่ง — รับเข้า: ${hiredName.trim()}${hiredStart ? ` วันเริ่มงาน: ${hiredStart}` : ''}`);
    const { error } = await supabase
      .from('hr_recruitment')
      .update({
        status: 'filled',
        hired_person_name: hiredName.trim(),
        filled_date: today,
        start_date: hiredStart || null,
        activity_log: newLog,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);
    setSaving('');
    if (error) { showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return; }
    showToast('ปิดตำแหน่งสำเร็จ 🎉');
    setEditStatus('filled');
    await onRefresh();
    setSelected(prev => prev ? { ...prev, status: 'filled', hired_person_name: hiredName.trim(), activity_log: newLog } : prev);
  };

  /* ── CREATE new position ─────────────────────────────────── */
  const createPosition = async () => {
    if (!newForm.position_title.trim()) { showToast('กรุณาระบุชื่อตำแหน่ง', 'error'); return; }
    setSaving('create');
    const { error, data: inserted } = await supabase
      .from('hr_recruitment')
      .insert({
        wams_ref:          newForm.wams_ref || null,
        position_title:    newForm.position_title.trim(),
        bu:                newForm.bu || null,
        department_name:   newForm.department_name || null,
        recruitment_type:  newForm.recruitment_type || null,
        employment_type:   newForm.employment_type || null,
        headcount:         parseInt(newForm.headcount) || 1,
        responsible_person: newForm.responsible_person || null,
        open_date:         newForm.open_date || null,
        sla_days:          parseInt(newForm.sla_days) || 60,
        notes:             newForm.notes || null,
        status:            newForm.status || 'open',
        activity_log:      [],
        company_entity:    'ONL',
      })
      .select()
      .single();
    setSaving('');
    if (error) { showToast('สร้างไม่สำเร็จ: ' + error.message, 'error'); return; }
    showToast('สร้างตำแหน่งใหม่สำเร็จ');
    setShowCreate(false);
    setNewForm({ wams_ref: '', position_title: '', bu: '', department_name: '', recruitment_type: '', employment_type: '', headcount: 1, responsible_person: '', open_date: '', sla_days: 60, notes: '', status: 'open' });
    await onRefresh();
    if (inserted) selectPosition(inserted);
  };

  /* ── Filtered list ───────────────────────────────────────── */
  const listRows = useMemo(() => {
    return data.filter(r => {
      const sOk = listFilter === 'all' || r.status === listFilter;
      const qOk = !search || (r.position_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.wams_ref || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.department_name || '').toLowerCase().includes(search.toLowerCase());
      return sOk && qOk;
    });
  }, [data, listFilter, search]);

  /* ── Activity log (newest first) ────────────────────────── */
  const activityLog = useMemo(() => {
    if (!selected?.activity_log) return [];
    return [...(selected.activity_log)].reverse();
  }, [selected?.activity_log]);

  const fmtLogTime = iso => {
    try {
      return new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const typeIcon = t => ({ status: '🔄', pipeline: '📊', note: '💬', close: '✅' }[t] || '📝');

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 28px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Logger name + Create button ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: OA.muted, fontWeight: 500 }}>ชื่อผู้บันทึก:</span>
          <input
            type="text" value={loggerName} onChange={e => setLoggerName(e.target.value)}
            placeholder="ระบุชื่อของคุณ..."
            style={{ border: `1px solid ${OA.border}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: OA.text, width: 180, fontFamily: 'inherit' }}
          />
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{
            background: showCreate ? OA.bgSoft : OA.accent, color: showCreate ? OA.muted : '#fff',
            border: showCreate ? `1.5px solid ${OA.border}` : 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {showCreate ? '✕ ยกเลิก' : '+ เพิ่มตำแหน่งใหม่'}
        </button>
      </div>

      {/* ── Create new position form ─────────────────────────── */}
      {showCreate && (
        <Card style={{ padding: 24 }}>
          <SectionTitle>สร้างตำแหน่งใหม่</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Field label="ชื่อตำแหน่ง" required>
              <TextInput value={newForm.position_title} onChange={v => setNewForm(f => ({ ...f, position_title: v }))} placeholder="เช่น Software Developer" />
            </Field>
            <Field label="WAMS Ref.">
              <TextInput value={newForm.wams_ref} onChange={v => setNewForm(f => ({ ...f, wams_ref: v }))} placeholder="เช่น WAMS-2026-001" />
            </Field>
            <Field label="BU">
              <SelectInput value={newForm.bu} onChange={v => setNewForm(f => ({ ...f, bu: v }))}
                placeholder="เลือก BU..."
                options={['Center','Content','efin.finance','IT - efin','IR PLUS','Atess','efinXpert','MOL'].map(b => ({ value: b, label: b }))} />
            </Field>
            <Field label="ฝ่าย / Department">
              <TextInput value={newForm.department_name} onChange={v => setNewForm(f => ({ ...f, department_name: v }))} placeholder="เช่น IT Development" />
            </Field>
            <Field label="ผู้รับผิดชอบ (Recruiter)">
              <TextInput value={newForm.responsible_person} onChange={v => setNewForm(f => ({ ...f, responsible_person: v }))} placeholder="ชื่อ Recruiter" />
            </Field>
            <Field label="จำนวนอัตรา">
              <TextInput type="number" value={newForm.headcount} onChange={v => setNewForm(f => ({ ...f, headcount: v }))} placeholder="1" />
            </Field>
            <Field label="ประเภทการสรรหา">
              <SelectInput value={newForm.recruitment_type} onChange={v => setNewForm(f => ({ ...f, recruitment_type: v }))}
                placeholder="เลือก..."
                options={[{ value: 'เพิ่ม', label: 'เพิ่ม (New Hire)' }, { value: 'ทดแทน', label: 'ทดแทน (Replacement)' }]} />
            </Field>
            <Field label="ประเภทการจ้างงาน">
              <SelectInput value={newForm.employment_type} onChange={v => setNewForm(f => ({ ...f, employment_type: v }))}
                placeholder="เลือก..."
                options={[{ value: 'Permanent', label: 'Permanent (พนักงานประจำ)' }, { value: 'Contract', label: 'Contract (สัญญาจ้าง)' }]} />
            </Field>
            <Field label="วันที่เปิดรับ">
              <TextInput type="date" value={newForm.open_date} onChange={v => setNewForm(f => ({ ...f, open_date: v }))} />
            </Field>
            <Field label="SLA เป้าหมาย (วัน)">
              <SelectInput value={String(newForm.sla_days)} onChange={v => setNewForm(f => ({ ...f, sla_days: parseInt(v) }))}
                options={[{ value: '60', label: '60 วัน (เพิ่ม / IT)' }, { value: '45', label: '45 วัน (ทดแทน non-IT)' }]} />
            </Field>
            <Field label="สถานะเริ่มต้น">
              <SelectInput value={newForm.status} onChange={v => setNewForm(f => ({ ...f, status: v }))}
                options={PIPELINE_STAGES.map(s => ({ value: s.key, label: s.label }))} />
            </Field>
            <Field label="หมายเหตุ">
              <TextInput value={newForm.notes} onChange={v => setNewForm(f => ({ ...f, notes: v }))} placeholder="หมายเหตุเพิ่มเติม..." />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${OA.border}` }}>
            <Btn variant="ghost" onClick={() => setShowCreate(false)}>ยกเลิก</Btn>
            <Btn onClick={createPosition} disabled={saving === 'create'}>
              {saving === 'create' ? 'กำลังบันทึก...' : '💾 บันทึกตำแหน่งใหม่'}
            </Btn>
          </div>
        </Card>
      )}

      {/* ── Main 2-column: List + Form ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>

        {/* LEFT: Position list */}
        <Card style={{ overflow: 'hidden', position: 'sticky', top: 16 }}>
          {/* Search */}
          <div style={{ padding: '14px 14px 10px' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 ค้นหาตำแหน่ง..."
              style={{ width: '100%', border: `1px solid ${OA.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'inherit', color: OA.text }}
            />
          </div>
          {/* Status filter pills */}
          <div style={{ padding: '0 10px 10px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['all', 'open', 'screening', 'interviewing', 'offering', 'filled', 'cancelled'].map(s => {
              const cfg = STATUS_CFG[s] || { label: 'ทั้งหมด', color: OA.muted, bg: '#eee' };
              const isAll = s === 'all';
              const active = listFilter === s;
              return (
                <button key={s} onClick={() => setListFilter(s)} style={{
                  padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer', border: 'none',
                  background: active ? (isAll ? OA.dark : cfg.color) : '#f0f0f0',
                  color: active ? '#fff' : OA.muted,
                }}>{isAll ? 'ทั้งหมด' : cfg.label}</button>
              );
            })}
          </div>
          {/* List */}
          <div style={{ maxHeight: 520, overflowY: 'auto', borderTop: `1px solid ${OA.border}` }}>
            {listRows.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: OA.muted, fontSize: 12 }}>ไม่พบข้อมูล</div>
            )}
            {listRows.map(r => {
              const cfg = STATUS_CFG[r.status] || {};
              const isActive = selected?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => selectPosition(r)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    borderLeft: isActive ? `3px solid ${OA.accent}` : '3px solid transparent',
                    background: isActive ? OA.accent + '0c' : 'transparent',
                    borderBottom: `1px solid ${OA.border}`,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = OA.bgSoft; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {r.wams_ref && (
                        <p style={{ margin: '0 0 2px', fontSize: 10, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, color: OA.blue }}>{r.wams_ref}</p>
                      )}
                      <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: OA.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.position_title}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: OA.muted }}>{r.department_name || r.bu || '—'} · {r.responsible_person || '—'}</p>
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 100, padding: '2px 8px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cfg.label || r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${OA.border}`, fontSize: 11, color: OA.muted, textAlign: 'center' }}>
            {listRows.length} จาก {data.length} ตำแหน่ง
          </div>
        </Card>

        {/* RIGHT: Edit form */}
        {!selected ? (
          <Card style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>←</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: OA.text, marginBottom: 6 }}>เลือกตำแหน่งจากรายการ</p>
            <p style={{ fontSize: 13, color: OA.muted }}>หรือกด "เพิ่มตำแหน่งใหม่" เพื่อสร้างตำแหน่งใหม่</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Position header */}
            <Card style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  {selected.wams_ref && (
                    <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 11, color: OA.blue, background: OA.blue + '12', borderRadius: 6, padding: '3px 10px', display: 'inline-block', marginBottom: 6 }}>
                      {selected.wams_ref}
                    </span>
                  )}
                  <h2 style={{ margin: '0 0 6px', fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 17, color: OA.text }}>
                    {selected.position_title}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatusBadge status={selected.status} />
                    <span style={{ fontSize: 12, color: OA.muted }}>{selected.department_name || '—'}</span>
                    {selected.bu && <span style={{ fontSize: 12, color: OA.muted }}>· {selected.bu}</span>}
                    {selected.responsible_person && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, color: OA.muted }}>·</span>
                        <Avatar name={selected.responsible_person} size={20} />
                        <span style={{ fontSize: 12, color: OA.muted }}>{selected.responsible_person}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 22, color: OA.accent }}>{selected.headcount}</p>
                    <p style={{ margin: 0, fontSize: 10, color: OA.muted }}>อัตรา</p>
                  </div>
                  {selected.sla_days && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 22, color: OA.blue }}>{selected.sla_days}</p>
                      <p style={{ margin: 0, fontSize: 10, color: OA.muted }}>วัน SLA</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Grid of form sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              {/* ── Section 1: Status Update ─────────────── */}
              <Card style={{ padding: '18px 20px' }}>
                <SectionTitle>🔄 อัพเดทสถานะ</SectionTitle>
                <Field label="สถานะปัจจุบัน">
                  <SelectInput
                    value={editStatus}
                    onChange={setEditStatus}
                    options={PIPELINE_STAGES.map(s => ({ value: s.key, label: s.label }))}
                  />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn onClick={saveStatus} disabled={saving === 'status' || editStatus === selected.status}>
                    {saving === 'status' ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
                  </Btn>
                </div>
              </Card>

              {/* ── Section 2: Pipeline Counts ─────────── */}
              <Card style={{ padding: '18px 20px' }}>
                <SectionTitle>📊 จำนวนผู้สมัคร / Pipeline</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { key: 'applied',     label: '📩 สมัครทั้งหมด' },
                    { key: 'screened',    label: '🔍 ผ่านคัดกรอง'   },
                    { key: 'interviewed', label: '🗣️ สัมภาษณ์แล้ว'  },
                    { key: 'offered',     label: '📄 ยื่น Offer'    },
                  ].map(f => (
                    <Field key={f.key} label={f.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min={0}
                          value={editPipeline[f.key]}
                          onChange={e => setEditPipeline(p => ({ ...p, [f.key]: e.target.value }))}
                          style={{ flex: 1, border: `1px solid ${OA.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 11, color: OA.muted }}>คน</span>
                      </div>
                    </Field>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn onClick={savePipeline} disabled={saving === 'pipeline'}>
                    {saving === 'pipeline' ? 'กำลังบันทึก...' : 'บันทึก Pipeline'}
                  </Btn>
                </div>
              </Card>
            </div>

            {/* ── Section 3: Progress Log ──────────────── */}
            <Card style={{ padding: '18px 20px' }}>
              <SectionTitle>💬 บันทึกความคืบหน้า</SectionTitle>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="พิมพ์ความคืบหน้า เช่น โพสต์ JD แล้ว / สัมภาษณ์ 3 คน / รอ approval..."
                  rows={3}
                  style={{ flex: 1, border: `1px solid ${OA.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: OA.text, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Btn onClick={saveNote} disabled={saving === 'note' || !noteText.trim()}>
                    {saving === 'note' ? '...' : 'บันทึก'}
                  </Btn>
                </div>
              </div>

              {/* Activity log history */}
              {activityLog.length > 0 ? (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: OA.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ประวัติกิจกรรม
                  </p>
                  <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activityLog.map((entry, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: OA.bgSoft, borderRadius: 8 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcon(entry.type)}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 3px', fontSize: 12, color: OA.text, lineHeight: 1.5 }}>{entry.text}</p>
                          <p style={{ margin: 0, fontSize: 10, color: OA.muted }}>
                            {entry.by && <strong>{entry.by}</strong>} · {fmtLogTime(entry.at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: OA.muted, textAlign: 'center', padding: '10px 0', margin: 0 }}>
                  ยังไม่มีประวัติกิจกรรม
                </p>
              )}
            </Card>

            {/* ── Section 4: Close Position ──────────── */}
            <Card style={{ padding: '18px 20px', borderTop: selected.status === 'filled' ? `3px solid ${OA.teal}` : `3px solid ${OA.accent}` }}>
              <SectionTitle>
                {selected.status === 'filled' ? '✅ ปิดตำแหน่งแล้ว' : '🎯 ปิดตำแหน่ง (รับเข้าทำงาน)'}
              </SectionTitle>
              {selected.status === 'filled' && selected.hired_person_name ? (
                <div style={{ background: OA.teal + '10', borderRadius: 10, padding: '16px 18px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: OA.muted }}>ผู้ที่ได้รับการคัดเลือก</p>
                  <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: OA.teal }}>{selected.hired_person_name}</p>
                  {selected.start_date && (
                    <p style={{ margin: 0, fontSize: 12, color: OA.muted }}>วันเริ่มงาน: {fmtDate(selected.start_date)}</p>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <Field label="ชื่อผู้ที่รับเข้า" required>
                      <TextInput
                        value={hiredName}
                        onChange={setHiredName}
                        placeholder="ชื่อ-นามสกุล พนักงานใหม่"
                        disabled={selected.status === 'filled'}
                      />
                    </Field>
                    <Field label="วันเริ่มงาน (Target Start Date)">
                      <TextInput
                        type="date" value={hiredStart}
                        onChange={setHiredStart}
                        disabled={selected.status === 'filled'}
                      />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Btn
                      variant="primary"
                      onClick={closePosition}
                      disabled={saving === 'close' || !hiredName.trim() || selected.status === 'filled'}
                    >
                      {saving === 'close' ? 'กำลังบันทึก...' : '✅ ยืนยันปิดตำแหน่ง'}
                    </Btn>
                  </div>
                </>
              )}
            </Card>

          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Recruitment({ lang }) {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('dashboard'); // 'dashboard' | 'form'
  const [filterDept, setFilterDept] = useState('all');
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [detailRow, setDetailRow]   = useState(null);
  const [showAll, setShowAll]       = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('hr_recruitment')
      .select('*')
      .order('open_date', { ascending: false });
    if (!error && rows) setData(rows);
    setLoading(false);
  }

  /* ─── KPIs ──────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const active    = data.filter(r => ['open','screening','interviewing','offering'].includes(r.status));
    const filled    = data.filter(r => r.status === 'filled');
    const cancelled = data.filter(r => r.status === 'cancelled');
    return {
      total:      data.length,
      active:     active.length,
      activeHC:   active.reduce((s, r) => s + (r.headcount || 0), 0),
      totalHC:    data.reduce((s, r) => s + (r.headcount || 0), 0),
      filled:     filled.length,
      cancelled:  cancelled.length,
      add:        data.filter(r => r.recruitment_type === 'เพิ่ม').length,
      replace:    data.filter(r => r.recruitment_type === 'ทดแทน').length,
    };
  }, [data]);

  /* ─── Monthly trend ─────────────────────────────────────── */
  const trendData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!r.open_date) return;
      const d = new Date(r.open_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, label, เปิดรับ: 0, สะสม: 0 };
      map[key].เปิดรับ++;
    });
    const sorted = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    let cum = 0;
    sorted.forEach(m => { cum += m.เปิดรับ; m.สะสม = cum; });
    return sorted;
  }, [data]);

  /* ─── Type donut data ───────────────────────────────────── */
  const typeData = useMemo(() => [
    { name: 'ทดแทน', value: kpis.replace, color: OA.blue   },
    { name: 'เพิ่ม',  value: kpis.add,     color: OA.accent },
  ], [kpis]);

  /* ─── Pipeline funnel ───────────────────────────────────── */
  const pipelineData = useMemo(() => {
    const total = data.length || 1;
    return PIPELINE_STAGES.map(s => {
      const count = data.filter(r => r.status === s.key).length;
      return { ...s, count, pct: +((count / total) * 100).toFixed(1) };
    });
  }, [data]);

  /* ─── Upcoming SLA deadlines ────────────────────────────── */
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    return data
      .filter(r => r.close_date && ['open','screening','interviewing','offering'].includes(r.status))
      .map(r => ({ ...r, daysLeft: Math.ceil((new Date(r.close_date) - today) / 86400000) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);
  }, [data]);

  /* ─── Recruiter summary ─────────────────────────────────── */
  const recruiterData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const p = r.responsible_person || 'ไม่ระบุ';
      if (!map[p]) map[p] = { name: p, open: 0, filled: 0, total: 0 };
      map[p].total++;
      if (['open','screening','interviewing','offering'].includes(r.status)) map[p].open++;
      if (r.status === 'filled') map[p].filled++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data]);

  /* ─── BU summary ────────────────────────────────────────── */
  const buData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const bu = normalizeBU(r.bu);
      if (!map[bu]) map[bu] = { bu, count: 0, open: 0, filled: 0 };
      map[bu].count++;
      if (['open','screening','interviewing','offering'].includes(r.status)) map[bu].open++;
      if (r.status === 'filled') map[bu].filled++;
    });
    return Object.values(map).filter(b => b.bu !== 'ไม่ระบุ').sort((a, b) => b.count - a.count);
  }, [data]);

  /* ─── Departments / persons lists ───────────────────────── */
  const depts = useMemo(() => Array.from(new Set(data.map(r => r.department_name).filter(Boolean))).sort(), [data]);
  const persons = useMemo(() => Array.from(new Set(data.map(r => r.responsible_person).filter(Boolean))).sort(), [data]);

  /* ─── Filtered rows ─────────────────────────────────────── */
  // ลำดับสถานะสำหรับจัดเรียงตาราง: เปิดรับ/อยู่ระหว่างดำเนินการขึ้นก่อน ตามด้วยปิดแล้ว/ยกเลิก
  const STATUS_SORT_ORDER = {
    open: 0, screening: 1, interviewing: 2, offering: 3,
    on_hold: 4, draft: 5, filled: 6, cancelled: 7,
  };
  const filtered = useMemo(() => data
    .filter(r => {
      const dOk = filterDept === 'all'   || r.department_name    === filterDept;
      const pOk = filterPerson === 'all' || r.responsible_person === filterPerson;
      const sOk = filterStatus === 'all' || r.status             === filterStatus;
      const tOk = filterType === 'all'   || r.recruitment_type   === filterType;
      return dOk && pOk && sOk && tOk;
    })
    .sort((a, b) => {
      const oa = STATUS_SORT_ORDER[a.status] ?? 99;
      const ob = STATUS_SORT_ORDER[b.status] ?? 99;
      if (oa !== ob) return oa - ob;
      // ภายในสถานะเดียวกัน เรียงวันที่เปิดรับล่าสุดขึ้นก่อน
      return new Date(b.open_date || 0) - new Date(a.open_date || 0);
    }), [data, filterDept, filterPerson, filterStatus, filterType]);

  const hasFilter = filterDept !== 'all' || filterPerson !== 'all' || filterStatus !== 'all' || filterType !== 'all';

  /* ─── SLA Analysis ──────────────────────────────────────── */
  const slaAnalysis = useMemo(() => {
    const today   = new Date();
    const active  = data.filter(r => ['open','screening','interviewing','offering'].includes(r.status));
    const overSla = active.filter(r => r.close_date && new Date(r.close_date) < today).length;
    const warn7   = active.filter(r => {
      if (!r.close_date) return false;
      const diff = (new Date(r.close_date) - today) / 86400000;
      return diff >= 0 && diff <= 7;
    }).length;
    return {
      onTrack:  active.length - overSla - warn7,
      warn7,
      overSla,
      sla60:    data.filter(r => r.sla_days === 60).length,
      sla45:    data.filter(r => r.sla_days === 45).length,
    };
  }, [data]);

  /* ─── Export ─────────────────────────────────────────────── */
  const handleExport = () => {
    exportToExcel({
      data: filtered.map(r => ({
        'WAMS Ref.':     r.wams_ref || '',
        'ตำแหน่ง':      r.position_title,
        'BU':            r.bu,
        'ฝ่าย':         r.department_name,
        'ประเภท':        r.recruitment_type,
        'อัตรา':         r.headcount,
        'ผู้รับผิดชอบ': r.responsible_person,
        'สถานะ':         (STATUS_CFG[r.status] || {}).label || r.status,
        'วันเปิด':       r.open_date || '',
        'ครบกำหนด SLA': r.close_date || '',
        'SLA (วัน)':     r.sla_days || '',
        'ประเภทการจ้าง': r.employment_type || '',
      })),
      columns: [
        { header: 'WAMS Ref.',     accessor: 'WAMS Ref.',     width: 18 },
        { header: 'ตำแหน่ง',      accessor: 'ตำแหน่ง',      width: 35 },
        { header: 'BU',            accessor: 'BU',            width: 14 },
        { header: 'ฝ่าย',         accessor: 'ฝ่าย',         width: 24 },
        { header: 'ประเภท',        accessor: 'ประเภท',        width: 10 },
        { header: 'อัตรา',         accessor: 'อัตรา',         width: 8  },
        { header: 'ผู้รับผิดชอบ', accessor: 'ผู้รับผิดชอบ', width: 14 },
        { header: 'สถานะ',         accessor: 'สถานะ',         width: 10 },
        { header: 'วันเปิด',       accessor: 'วันเปิด',       width: 14 },
        { header: 'ครบกำหนด SLA', accessor: 'ครบกำหนด SLA', width: 14 },
        { header: 'SLA (วัน)',     accessor: 'SLA (วัน)',     width: 10 },
        { header: 'ประเภทการจ้าง', accessor: 'ประเภทการจ้าง', width: 14 },
      ],
      filename: 'recruitment_data',
      sheetName: 'Recruitment',
    });
  };

  /* ─── Import ─────────────────────────────────────────────── */
  const statusImportMap = {
    'เปิดรับ': 'open', 'open': 'open',
    'ปิดแล้ว': 'filled', 'filled': 'filled',
    'ยกเลิก': 'cancelled', 'cancelled': 'cancelled',
    'คัดกรอง': 'screening', 'screening': 'screening',
    'สัมภาษณ์': 'interviewing', 'interviewing': 'interviewing',
    'ยื่นข้อเสนอ': 'offering', 'offering': 'offering',
  };
  const handleImportSubmit = async (mappedData) => {
    const rows = mappedData.filter(r => r.position).map(r => ({
      position_title:    r.position,
      company_entity:    r.company || 'ONL',
      bu:                r.bu || null,
      department_name:   r.department || null,
      recruitment_type:  r.type || null,
      headcount:         parseInt(r.count) || 1,
      status:            statusImportMap[(r.status || '').trim().toLowerCase()] || 'open',
      responsible_person: r.responsible || null,
      open_date:         r.open_date || null,
      notes:             r.notes || null,
      wams_ref:          r.wams_ref || null,
    }));
    if (!rows.length) throw new Error('ไม่พบคอลัมน์ "ตำแหน่ง"');
    const { error } = await supabase.from('hr_recruitment').insert(rows);
    if (error) throw new Error(error.message);
    await fetchData();
    return rows.length;
  };
  const importColumns = [
    { header: 'ตำแหน่ง',     headerEn: 'Position',    dbField: 'position',    accessor: 'position',    example: 'Software Engineer', width: 30 },
    { header: 'WAMS Ref.',    headerEn: 'WAMS',        dbField: 'wams_ref',    accessor: 'wams_ref',    example: 'WAMS-001',          width: 14 },
    { header: 'BU',           headerEn: 'BU',          dbField: 'bu',          accessor: 'bu',          example: 'Center',            width: 14 },
    { header: 'ฝ่าย',        headerEn: 'Department',  dbField: 'department',  accessor: 'department',  example: 'IT',                width: 18 },
    { header: 'ประเภท',       headerEn: 'Type',        dbField: 'type',        accessor: 'type',        example: 'เพิ่ม',            width: 10 },
    { header: 'อัตรา',        headerEn: 'Count',       dbField: 'count',       accessor: 'count',       example: '1',                 width: 8  },
    { header: 'สถานะ',        headerEn: 'Status',      dbField: 'status',      accessor: 'status',      example: 'open',              width: 10 },
    { header: 'ผู้รับผิดชอบ', headerEn: 'Responsible', dbField: 'responsible', accessor: 'responsible', example: 'พรีม',             width: 14 },
    { header: 'วันเปิด',      headerEn: 'Open Date',   dbField: 'open_date',   accessor: 'open_date',   example: '2026-01-01',        width: 12 },
  ];

  /* ─── Loading screen ─────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: OA.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 38, height: 38, border: `3px solid ${OA.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: OA.muted, fontSize: 14 }}>กำลังโหลดข้อมูล...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ─── Table rows to show ─────────────────────────────────── */
  const tableRows = showAll ? filtered : filtered.slice(0, 8);

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: OA.bgSoft, fontFamily: 'system-ui,sans-serif', color: OA.text }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&display=swap" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select:focus { outline: none; border-color: ${OA.accent} !important; }
        input:focus, textarea:focus { outline: none; border-color: ${OA.accent} !important; }
      `}</style>

      {/* ══ Page Header + Tab Nav ═══════════════════════════════ */}
      <div style={{ background: OA.bg, borderBottom: `1px solid ${OA.border}` }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '16px 28px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            <div>
              <h1 style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 20, color: OA.text, margin: 0 }}>
                {activeTab === 'dashboard' ? 'แดชบอร์ดงานสรรหา' : 'กรอกข้อมูลการสรรหา'}
              </h1>
              <p style={{ color: OA.muted, fontSize: 12, margin: '3px 0 0' }}>
                {activeTab === 'dashboard'
                  ? `ภาพรวมผลการสรรหาและความคืบหน้าของ Pipeline · ข้อมูล ${data.length} ตำแหน่ง`
                  : 'อัพเดทสถานะ บันทึก Pipeline และปิดตำแหน่งงาน'}
              </p>
            </div>
            {activeTab === 'dashboard' && (
              <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImport(true)} lang={lang} />
            )}
          </div>
          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { id: 'dashboard', label: '📊 แดชบอร์ด' },
              { id: 'form',      label: '✏️ กรอกข้อมูล' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 22px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'system-ui,sans-serif', fontSize: 13, fontWeight: 600,
                  color: activeTab === t.id ? OA.accent : OA.muted,
                  borderBottom: activeTab === t.id ? `2px solid ${OA.accent}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ Form Tab ════════════════════════════════════════════ */}
      {activeTab === 'form' && (
        <RecruitmentFormTab data={data} onRefresh={fetchData} />
      )}

      {activeTab === 'dashboard' && (
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 28px 40px' }}>

        {/* ══ Filter Bar ══════════════════════════════════════ */}
        <Card style={{ padding: '12px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Dropdown value={filterDept}   onChange={setFilterDept}   options={depts}   placeholder="แผนก: ทั้งหมด" />
            <Dropdown value={filterPerson} onChange={setFilterPerson} options={persons} placeholder="ผู้สรรหา: ทั้งหมด" />
            <Dropdown
              value={filterStatus} onChange={setFilterStatus}
              options={[
                { value: 'open',         label: 'เปิดรับ'     },
                { value: 'screening',    label: 'คัดกรอง'     },
                { value: 'interviewing', label: 'สัมภาษณ์'    },
                { value: 'offering',     label: 'ยื่นข้อเสนอ' },
                { value: 'filled',       label: 'ปิดแล้ว'    },
                { value: 'cancelled',    label: 'ยกเลิก'     },
              ]}
              placeholder="สถานะ: ทั้งหมด"
            />
            <Dropdown
              value={filterType} onChange={setFilterType}
              options={[{ value: 'เพิ่ม', label: 'เพิ่ม (New Hire)' }, { value: 'ทดแทน', label: 'ทดแทน (Replacement)' }]}
              placeholder="ประเภท: ทั้งหมด"
            />
            {hasFilter && (
              <button
                onClick={() => { setFilterDept('all'); setFilterPerson('all'); setFilterStatus('all'); setFilterType('all'); }}
                style={{ background: 'none', border: 'none', color: OA.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ↺ ล้างตัวกรอง
              </button>
            )}
            {hasFilter && (
              <span style={{ fontSize: 12, color: OA.muted, marginLeft: 4 }}>
                แสดง {filtered.length} จาก {data.length} รายการ
              </span>
            )}
          </div>
        </Card>

        {/* ══ KPI Row (6 cards) ════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 18 }}>
          <KpiCard icon="💼" label="ตำแหน่งเปิดรับ"   value={kpis.active}   color={OA.accent} sub={`จาก ${kpis.total} ตำแหน่งทั้งหมด`} />
          <KpiCard icon="👥" label="อัตราที่เปิดอยู่"  value={kpis.activeHC} color={OA.accent} sub={`รวม ${kpis.totalHC} อัตรา`} />
          <KpiCard icon="📋" label="ตำแหน่งทั้งหมด"  value={kpis.total}    color={OA.blue}   sub="ปี 2026" />
          <KpiCard icon="⭐" label="New Hire (เพิ่ม)"  value={kpis.add}      color={OA.orange} sub={`${kpis.total > 0 ? ((kpis.add/kpis.total)*100).toFixed(0) : 0}% ของทั้งหมด`} />
          <KpiCard icon="🔄" label="ทดแทน"            value={kpis.replace}  color={OA.purple} sub={`${kpis.total > 0 ? ((kpis.replace/kpis.total)*100).toFixed(0) : 0}% ของทั้งหมด`} />
          <KpiCard icon="✅" label="ปิดสำเร็จแล้ว"    value={kpis.filled}   color={OA.teal}   sub={`${kpis.total > 0 ? ((kpis.filled/kpis.total)*100).toFixed(0) : 0}% อัตราปิด`} />
        </div>

        {/* ══ Charts Row ══════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 18 }}>

          {/* Line Chart - Monthly Trend */}
          <Card style={{ padding: '20px 20px 14px' }}>
            <SectionTitle>แนวโน้มตำแหน่งที่เปิดรับ (รายเดือน)</SectionTitle>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={OA.border} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: OA.muted }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: OA.muted }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: SHADOW, fontSize: 12, padding: '8px 14px' }}
                    cursor={{ stroke: OA.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    type="monotone" dataKey="เปิดรับ" stroke={OA.accent} strokeWidth={2.5}
                    dot={{ r: 4, fill: OA.accent, stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: OA.accent }}
                    name="เปิดรับ/เดือน"
                  />
                  <Line
                    type="monotone" dataKey="สะสม" stroke={OA.blue} strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: OA.blue, stroke: '#fff', strokeWidth: 2 }}
                    name="สะสม"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Donut Chart - Type breakdown */}
          <Card style={{ padding: '20px 20px 14px' }}>
            <SectionTitle>ประเภทการสรรหา</SectionTitle>
            <div style={{ height: 170, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData} cx="50%" cy="50%"
                    outerRadius={76} innerRadius={44}
                    dataKey="value" paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: SHADOW, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 6 }}>
              {typeData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontWeight: 600, color: OA.text }}>{d.name}</span>
                  <span style={{
                    fontFamily: 'Montserrat,sans-serif', fontWeight: 700,
                    fontSize: 13, color: d.color,
                  }}>{d.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ══ 3-Column Main Section ════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px 270px', gap: 16, marginBottom: 18 }}>

          {/* LEFT: Positions Table */}
          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px' }}>
              <SectionTitle
                action={
                  <button
                    onClick={() => setShowAll(v => !v)}
                    style={{ background: 'none', border: 'none', color: OA.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    {showAll ? 'ย่อ ▲' : `ดูทั้งหมด (${filtered.length}) →`}
                  </button>
                }
              >
                ตำแหน่งงานที่เปิดรับ
              </SectionTitle>
            </div>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: OA.bgSoft }}>
                    {['Requisition ID', 'ตำแหน่ง', 'ฝ่าย', 'Recruiter', 'อัตรา', 'SLA', 'สถานะ'].map(h => (
                      <th key={h} style={{
                        padding: '9px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 700, color: OA.muted,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: `1px solid ${OA.border}`, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, idx) => (
                    <tr
                      key={r.id}
                      onClick={() => setDetailRow(r)}
                      style={{
                        background: idx % 2 === 0 ? OA.bg : OA.bgSoft + 'aa',
                        cursor: 'pointer', transition: 'background 0.1s',
                        borderBottom: `1px solid ${OA.border}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = OA.accent + '0d'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? OA.bg : OA.bgSoft + 'aa'; }}
                    >
                      {/* Requisition ID */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        {r.wams_ref
                          ? <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 11, color: OA.blue }}>{r.wams_ref}</span>
                          : <span style={{ color: OA.muted, fontSize: 11 }}>—</span>}
                      </td>
                      {/* Position */}
                      <td style={{ padding: '11px 14px', maxWidth: 200 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: OA.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190, fontSize: 12 }}>
                          {r.position_title}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: OA.muted }}>{r.recruitment_type || '—'}</p>
                      </td>
                      {/* Dept */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontSize: 11, color: OA.dark }}>{r.department_name || '—'}</span>
                      </td>
                      {/* Recruiter */}
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar name={r.responsible_person} size={24} />
                          <span style={{ fontSize: 11, color: OA.text, whiteSpace: 'nowrap' }}>
                            {r.responsible_person || '—'}
                          </span>
                        </div>
                      </td>
                      {/* Headcount */}
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 16, color: OA.text }}>
                          {r.headcount}
                        </span>
                      </td>
                      {/* SLA */}
                      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 11, color: OA.muted }}>
                          {r.sla_days ? `${r.sla_days} วัน` : r.close_date ? fmtDate(r.close_date) : '—'}
                        </span>
                      </td>
                      {/* Status */}
                      <td style={{ padding: '11px 14px' }}>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: OA.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <p style={{ fontSize: 13 }}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>
                </div>
              )}
            </div>
          </Card>

          {/* CENTER: Pipeline Funnel */}
          <Card style={{ padding: 18 }}>
            <SectionTitle>ความคืบหน้า Pipeline</SectionTitle>
            {pipelineData.map(s => (
              <div key={s.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: OA.text, fontWeight: 500 }}>{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 15, color: s.color }}>{s.count}</span>
                    <span style={{ fontSize: 10, color: OA.muted }}>{s.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: '#f0f0f0', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: s.color, borderRadius: 100, width: `${Math.max(s.pct, 0)}%`, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}

            {/* BU Breakdown */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${OA.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: OA.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ตามหน่วยงาน
              </p>
              {buData.slice(0, 7).map(b => (
                <div key={b.bu} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: OA.text, flex: 1, fontWeight: 500 }}>{b.bu}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: OA.accent, minWidth: 16, textAlign: 'right' }}>{b.open}</span>
                  <span style={{ fontSize: 10, color: OA.muted }}>เปิด</span>
                  {b.filled > 0 && <>
                    <span style={{ fontSize: 11, fontWeight: 700, color: OA.teal, minWidth: 14, textAlign: 'right' }}>{b.filled}</span>
                    <span style={{ fontSize: 10, color: OA.muted }}>ปิด</span>
                  </>}
                </div>
              ))}
            </div>
          </Card>

          {/* RIGHT: Upcoming Deadlines + Recruiter Workload */}
          <Card style={{ padding: 18 }}>
            <SectionTitle>ครบกำหนด SLA ที่ใกล้มา</SectionTitle>
            {upcomingDeadlines.length === 0 ? (
              <p style={{ fontSize: 13, color: OA.muted, textAlign: 'center', padding: '16px 0' }}>ไม่มีข้อมูล</p>
            ) : (
              <div>
                {upcomingDeadlines.map((r, i) => {
                  const overdue = r.daysLeft < 0;
                  const urgent  = !overdue && r.daysLeft <= 7;
                  const dotColor = overdue ? OA.red : urgent ? OA.orange : OA.accent;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setDetailRow(r)}
                      style={{
                        display: 'flex', gap: 10, marginBottom: 10,
                        paddingBottom: 10, cursor: 'pointer',
                        borderBottom: i < upcomingDeadlines.length - 1 ? `1px solid ${OA.border}` : 'none',
                      }}
                    >
                      {/* Days badge */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                        background: dotColor + '18',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 12, color: dotColor, lineHeight: 1 }}>
                          {overdue ? `+${Math.abs(r.daysLeft)}` : r.daysLeft}
                        </span>
                        <span style={{ fontSize: 8, color: dotColor, fontWeight: 600 }}>วัน</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 11, color: OA.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.position_title}
                        </p>
                        <p style={{ margin: '0 0 3px', fontSize: 10, color: OA.muted }}>
                          {r.department_name || r.bu || '—'}
                        </p>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <StatusBadge status={r.status} />
                          {r.responsible_person && (
                            <span style={{ fontSize: 10, color: OA.muted }}>{r.responsible_person}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recruiter Workload */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${OA.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: OA.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ภาระงาน Recruiter
              </p>
              {recruiterData.map(p => {
                const pct = kpis.total > 0 ? (p.total / kpis.total) * 100 : 0;
                const c = PERSON_COLORS[p.name] || OA.dark;
                return (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Avatar name={p.name} size={22} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: OA.text }}>{p.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{p.total}</span>
                      </div>
                      <div style={{ height: 4, background: '#f0f0f0', borderRadius: 100 }}>
                        <div style={{ height: '100%', background: c, borderRadius: 100, width: `${pct}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ══ Bottom Row (3 Summary cards) ════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* สรุปผลการสรรหา */}
          <Card style={{ padding: 20 }}>
            <SectionTitle>สรุปผลการสรรหา</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'อัตราการปิดตำแหน่ง', value: kpis.total > 0 ? `${((kpis.filled / kpis.total) * 100).toFixed(0)}%` : '0%', color: OA.accent, icon: '📊' },
                { label: 'ตำแหน่งที่ยังเปิดอยู่', value: kpis.active, color: OA.blue, icon: '📂' },
                { label: 'New Hire', value: kpis.add, color: OA.orange, icon: '⭐' },
                { label: 'Replacement', value: kpis.replace, color: OA.purple, icon: '🔄' },
              ].map(m => (
                <div key={m.label} style={{ background: OA.bgSoft, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                  <p style={{ margin: '0 0 2px', fontSize: 10, color: OA.muted, fontWeight: 500 }}>{m.label}</p>
                  <p style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 28, color: m.color, lineHeight: 1 }}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* ประเภทการจ้างงาน */}
          <Card style={{ padding: 20 }}>
            <SectionTitle>ประเภทการจ้างงาน</SectionTitle>
            {(() => {
              const perm  = data.filter(r => r.employment_type === 'Permanent').length;
              const cont  = data.filter(r => r.employment_type === 'Contract').length;
              const other = kpis.total - perm - cont;
              return [
                { label: 'Permanent', count: perm,  color: OA.accent },
                { label: 'Contract',  count: cont,  color: OA.blue   },
                ...(other > 0 ? [{ label: 'ไม่ระบุ', count: other, color: '#ccc' }] : []),
              ].map(it => {
                const pct = kpis.total > 0 ? (it.count / kpis.total) * 100 : 0;
                return (
                  <div key={it.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: OA.text }}>{it.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: it.color }}>{it.count} <span style={{ fontSize: 11, fontWeight: 500, color: OA.muted }}>({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div style={{ height: 8, background: '#f0f0f0', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: it.color, borderRadius: 100, width: `${pct}%`, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              });
            })()}
          </Card>

          {/* SLA Analysis */}
          <Card style={{ padding: 20 }}>
            <SectionTitle>วิเคราะห์ SLA</SectionTitle>
            <div style={{ marginBottom: 14 }}>
              {[
                { label: '🟢 On Track',              count: slaAnalysis.onTrack, color: OA.accent },
                { label: '🟡 ใกล้ครบกำหนด (≤7 วัน)', count: slaAnalysis.warn7,   color: OA.orange },
                { label: '🔴 เกิน SLA',               count: slaAnalysis.overSla, color: OA.red    },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 8, padding: '10px 14px',
                  background: OA.bgSoft, borderRadius: 8,
                }}>
                  <span style={{ fontSize: 12, color: OA.text }}>{s.label}</span>
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 20, color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
            <div style={{ paddingTop: 12, borderTop: `1px solid ${OA.border}` }}>
              <p style={{ fontSize: 11, color: OA.muted, margin: '0 0 8px', fontWeight: 600 }}>SLA เป้าหมาย (จากทั้งหมด {kpis.total} ตำแหน่ง)</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, background: OA.blue + '12', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: OA.blue, fontWeight: 600 }}>60 วัน</p>
                  <p style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 24, color: OA.blue }}>{slaAnalysis.sla60}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: OA.muted }}>ตำแหน่ง</p>
                </div>
                <div style={{ flex: 1, background: OA.accent + '12', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, color: OA.accent, fontWeight: 600 }}>45 วัน</p>
                  <p style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 24, color: OA.accent }}>{slaAnalysis.sla45}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: OA.muted }}>ตำแหน่ง</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      )} {/* end dashboard tab */}

      {/* ══ Detail Modal ════════════════════════════════════════ */}
      {detailRow && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setDetailRow(null); }}
        >
          <Card style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                {detailRow.wams_ref && (
                  <span style={{ fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 11, color: OA.blue, background: OA.blue + '12', borderRadius: 6, padding: '3px 10px', display: 'inline-block', marginBottom: 8 }}>
                    {detailRow.wams_ref}
                  </span>
                )}
                <h2 style={{ margin: 0, fontFamily: 'Montserrat,sans-serif', fontWeight: 700, fontSize: 17, color: OA.text, lineHeight: 1.35 }}>
                  {detailRow.position_title}
                </h2>
              </div>
              <button
                onClick={() => setDetailRow(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: OA.muted, padding: 0, lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>

            <StatusBadge status={detailRow.status} />

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${OA.border}` }}>
              {[
                { label: 'BU',            value: detailRow.bu                },
                { label: 'ฝ่าย',         value: detailRow.department_name   },
                { label: 'ประเภทการสรรหา', value: detailRow.recruitment_type },
                { label: 'ประเภทการจ้าง', value: detailRow.employment_type  },
                { label: 'จำนวนอัตรา',   value: detailRow.headcount, big: true },
                { label: 'SLA เป้าหมาย',  value: detailRow.sla_days ? `${detailRow.sla_days} วัน` : '—' },
              ].map(({ label, value, big }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: OA.muted, margin: '0 0 3px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{
                    margin: 0,
                    fontFamily: big ? 'Montserrat,sans-serif' : 'inherit',
                    fontWeight: big ? 700 : 600,
                    fontSize: big ? 30 : 13,
                    color: big ? OA.accent : OA.text,
                    lineHeight: big ? 1 : 1.4,
                  }}>{value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Recruiter */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${OA.border}` }}>
              <p style={{ fontSize: 10, color: OA.muted, margin: '0 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recruiter ผู้รับผิดชอบ
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={detailRow.responsible_person} size={34} />
                <span style={{ fontWeight: 700, fontSize: 14, color: OA.text }}>
                  {detailRow.responsible_person || '—'}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${OA.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'วันที่เปิดรับ',    value: fmtDate(detailRow.open_date)   },
                { label: 'ครบกำหนด SLA',     value: fmtDate(detailRow.close_date)  },
                detailRow.filled_date && { label: 'วันปิดตำแหน่ง', value: fmtDate(detailRow.filled_date) },
                detailRow.start_date  && { label: 'Target Start',   value: fmtDate(detailRow.start_date)  },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: OA.muted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: OA.text }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Notes */}
            {detailRow.notes && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${OA.border}` }}>
                <p style={{ fontSize: 10, color: OA.muted, margin: '0 0 6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>หมายเหตุ</p>
                <p style={{ margin: 0, fontSize: 12, color: OA.text, lineHeight: 1.7, background: OA.bgSoft, borderRadius: 8, padding: '10px 12px' }}>
                  {detailRow.notes}
                </p>
              </div>
            )}

            {/* JD Link */}
            {detailRow.job_description?.startsWith('http') && (
              <a
                href={detailRow.job_description} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', marginTop: 16, padding: '12px',
                  background: OA.accent + '12', borderRadius: 10,
                  textAlign: 'center', color: OA.accent,
                  fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                ดู Job Description ↗
              </a>
            )}
          </Card>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportSubmit}
        columns={importColumns}
        tableName="Recruitment"
        lang={lang}
      />
    </div>
  );
}

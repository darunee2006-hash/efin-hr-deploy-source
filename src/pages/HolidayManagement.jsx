import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Edit2, Trash2, X, Check, Copy, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TYPES = [
  { value: 'public', th: 'วันหยุดราชการ', en: 'Public Holiday', color: 'bg-red-100 text-red-700' },
  { value: 'company', th: 'วันหยุดบริษัท', en: 'Company Holiday', color: 'bg-blue-100 text-blue-700' },
  { value: 'special', th: 'วันหยุดพิเศษ', en: 'Special Holiday', color: 'bg-purple-100 text-purple-700' },
];

const EMPTY = { date: '', name_th: '', name_en: '', type: 'public', year: new Date().getFullYear(), is_active: true };

export default function HolidayManagement({ lang }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [copying, setCopying] = useState(false);

  const L = {
    title: lang === 'th' ? 'จัดการวันหยุดประจำปี' : 'Holiday Management',
    add: lang === 'th' ? 'เพิ่มวันหยุด' : 'Add Holiday',
    edit: lang === 'th' ? 'แก้ไขวันหยุด' : 'Edit Holiday',
    date: lang === 'th' ? 'วันที่' : 'Date',
    nameTh: lang === 'th' ? 'ชื่อวันหยุด (ไทย)' : 'Holiday Name (Thai)',
    nameEn: lang === 'th' ? 'ชื่อวันหยุด (EN)' : 'Holiday Name (EN)',
    type: lang === 'th' ? 'ประเภท' : 'Type',
    year: lang === 'th' ? 'ปี' : 'Year',
    active: lang === 'th' ? 'ใช้งาน' : 'Active',
    inactive: lang === 'th' ? 'ไม่ใช้งาน' : 'Inactive',
    save: lang === 'th' ? 'บันทึก' : 'Save',
    cancel: lang === 'th' ? 'ยกเลิก' : 'Cancel',
    delete: lang === 'th' ? 'ลบ' : 'Delete',
    confirmDelete: lang === 'th' ? 'ยืนยันการลบวันหยุดนี้?' : 'Confirm delete this holiday?',
    saveSuccess: lang === 'th' ? 'บันทึกสำเร็จ!' : 'Saved!',
    deleteSuccess: lang === 'th' ? 'ลบสำเร็จ!' : 'Deleted!',
    noHolidays: lang === 'th' ? 'ยังไม่มีวันหยุด' : 'No holidays',
    total: lang === 'th' ? 'รวม' : 'Total',
    days: lang === 'th' ? 'วัน' : 'days',
    allTypes: lang === 'th' ? 'ทุกประเภท' : 'All Types',
    copyYear: lang === 'th' ? 'คัดลอกจากปีก่อน' : 'Copy from previous year',
    copySuccess: lang === 'th' ? 'คัดลอกสำเร็จ!' : 'Copied!',
    copyConfirm: lang === 'th' ? 'คัดลอกวันหยุดจากปี' : 'Copy holidays from year',
    toYear: lang === 'th' ? 'มาปี' : 'to year',
    searchPlaceholder: lang === 'th' ? 'ค้นหาวันหยุด...' : 'Search holidays...',
    status: lang === 'th' ? 'สถานะ' : 'Status',
  };

  useEffect(() => { loadHolidays(); }, [selectedYear]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('hr_holidays')
        .select('*')
        .eq('year', selectedYear)
        .order('date');
      if (err) throw err;
      setHolidays(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY, year: selectedYear });
    setShowModal(true);
    setError(null);
  };

  const openEdit = (h) => {
    setEditId(h.id);
    setForm({ date: h.date, name_th: h.name_th || '', name_en: h.name_en || '', type: h.type, year: h.year, is_active: h.is_active });
    setShowModal(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.date || !form.name_th) {
      setError(lang === 'th' ? 'กรุณากรอกวันที่และชื่อวันหยุด' : 'Please fill date and holiday name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, year: parseInt(form.date.substring(0, 4)) || selectedYear };
      if (editId) {
        const { error: err } = await supabase.from('hr_holidays').update(payload).eq('id', editId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('hr_holidays').insert([payload]);
        if (err) throw err;
      }
      setShowModal(false);
      setSuccess(L.saveSuccess);
      loadHolidays();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(L.confirmDelete)) return;
    setDeleting(id);
    try {
      const { error: err } = await supabase.from('hr_holidays').delete().eq('id', id);
      if (err) throw err;
      setSuccess(L.deleteSuccess);
      loadHolidays();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyYear = async () => {
    const prevYear = selectedYear - 1;
    if (!confirm(`${L.copyConfirm} ${prevYear + 543} ${L.toYear} ${selectedYear + 543}?`)) return;
    setCopying(true);
    setError(null);
    try {
      const { data: prev, error: err1 } = await supabase
        .from('hr_holidays')
        .select('*')
        .eq('year', prevYear)
        .order('date');
      if (err1) throw err1;
      if (!prev || prev.length === 0) {
        setError(lang === 'th' ? `ไม่พบวันหยุดในปี ${prevYear + 543}` : `No holidays found in ${prevYear}`);
        setCopying(false);
        return;
      }
      const newHolidays = prev.map(h => ({
        date: h.date.replace(String(prevYear), String(selectedYear)),
        name_th: h.name_th,
        name_en: h.name_en,
        type: h.type,
        year: selectedYear,
        is_active: true,
      }));
      const { error: err2 } = await supabase.from('hr_holidays').insert(newHolidays);
      if (err2) throw err2;
      setSuccess(L.copySuccess + ` (${newHolidays.length} ${L.days})`);
      loadHolidays();
    } catch (e) {
      setError(e.message);
    } finally {
      setCopying(false);
    }
  };

  const typeLabel = (type) => {
    const t = TYPES.find(t => t.value === type);
    return t ? (lang === 'th' ? t.th : t.en) : type;
  };

  const typeColor = (type) => {
    const t = TYPES.find(t => t.value === type);
    return t ? t.color : 'bg-gray-100 text-gray-700';
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    const day = dt.getDate();
    const months = lang === 'th'
      ? ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
      : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNames = lang === 'th'
      ? ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.']
      : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return `${dayNames[dt.getDay()]} ${day} ${months[dt.getMonth()]} ${lang === 'th' ? dt.getFullYear() + 543 : dt.getFullYear()}`;
  };

  // Filter
  const filtered = holidays.filter(h => {
    if (filterType !== 'all' && h.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (h.name_th || '').toLowerCase().includes(s) || (h.name_en || '').toLowerCase().includes(s);
    }
    return true;
  });

  // Stats
  const stats = {
    total: holidays.length,
    public: holidays.filter(h => h.type === 'public').length,
    company: holidays.filter(h => h.type === 'company').length,
    special: holidays.filter(h => h.type === 'special').length,
    active: holidays.filter(h => h.is_active).length,
  };

  const years = [];
  for (let y = new Date().getFullYear() + 1; y >= 2024; y--) years.push(y);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#c6e8a3] border-t-[#78c045] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success / Error banner */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
          <Check className="w-4 h-4" /> {success}
        </div>
      )}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
          <X className="w-4 h-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-[#78c045]" />
            <span className="text-xs text-gray-500">{L.total}</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-400">{L.days}</p>
        </div>
        {TYPES.map(tp => (
          <div key={tp.value} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${tp.value === 'public' ? 'bg-red-500' : tp.value === 'company' ? 'bg-blue-500' : 'bg-purple-500'}`} />
              <span className="text-xs text-gray-500">{lang === 'th' ? tp.th : tp.en}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats[tp.value] || 0}</p>
            <p className="text-xs text-gray-400">{L.days}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50 font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{lang === 'th' ? `ปี ${y + 543}` : `Year ${y}`}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50"
          >
            <option value="all">{L.allTypes}</option>
            {TYPES.map(tp => (
              <option key={tp.value} value={tp.value}>{lang === 'th' ? tp.th : tp.en}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={L.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#78c045] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Copy from previous year */}
            <button
              onClick={handleCopyYear}
              disabled={copying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
            >
              {copying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              {L.copyYear}
            </button>
            {/* Add button */}
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#78c045] hover:bg-[#5a9030] text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              {L.add}
            </button>
          </div>
        </div>
      </div>

      {/* Holiday Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{L.noHolidays}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.date}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.nameTh}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.nameEn}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{L.type}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">{L.status}</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, i) => {
                  const isPast = new Date(h.date) < new Date(new Date().toDateString());
                  return (
                    <tr key={h.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isPast ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{formatDate(h.date)}</td>
                      <td className="px-4 py-3 text-gray-800">{h.name_th}</td>
                      <td className="px-4 py-3 text-gray-500">{h.name_en || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(h.type)}`}>
                          {typeLabel(h.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {h.is_active ? L.active : L.inactive}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(h)}
                            className="p-1.5 rounded-lg hover:bg-[#f0f9e8] text-gray-400 hover:text-[#5a9030] transition-colors"
                            title={L.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            disabled={deleting === h.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title={L.delete}
                          >
                            {deleting === h.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            {L.total} {filtered.length} {L.days}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#78c045]" />
                {editId ? L.edit : L.add}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{L.date} *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{L.nameTh} *</label>
                <input
                  type="text"
                  value={form.name_th}
                  onChange={e => setForm({ ...form, name_th: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none"
                  placeholder={lang === 'th' ? 'เช่น วันปีใหม่' : 'e.g. New Year Day'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{L.nameEn}</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={e => setForm({ ...form, name_en: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none"
                  placeholder="e.g. New Year Day"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{L.type}</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none"
                  >
                    {TYPES.map(tp => (
                      <option key={tp.value} value={tp.value}>{lang === 'th' ? tp.th : tp.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{L.status}</label>
                  <select
                    value={form.is_active ? 'active' : 'inactive'}
                    onChange={e => setForm({ ...form, is_active: e.target.value === 'active' })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none"
                  >
                    <option value="active">{L.active}</option>
                    <option value="inactive">{L.inactive}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {L.cancel}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#78c045] hover:bg-[#5a9030] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {L.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

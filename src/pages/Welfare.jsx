import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Users, CreditCard, TrendingUp, Search, Plus,
  Heart, PiggyBank, Stethoscope, Pill, HandHelping, MoreVertical,
  Edit2, X, Check, Shield, Star,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { PageHeader, KPICard, Section, DetailPanel, StatusBadge, ProgressBar } from '../components/PageUI';
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport';

// Category config
const CATEGORY_CONFIG = {
  health:     { label: 'ประกันสุขภาพ',         icon: Heart,        color: 'bg-red-100',    iconColor: 'text-red-600',    fill: '#ef4444' },
  pvd:        { label: 'กองทุนสำรองเลี้ยงชีพ', icon: PiggyBank,    color: 'bg-green-100',  iconColor: 'text-green-600',  fill: '#22c55e' },
  medical:    { label: 'ค่ารักษาพยาบาล',       icon: Stethoscope,  color: 'bg-blue-100',   iconColor: 'text-blue-600',   fill: '#3b82f6' },
  dental:     { label: 'ค่าทันตกรรม',           icon: Pill,         color: 'bg-orange-100', iconColor: 'text-orange-600', fill: '#f97316' },
  assistance: { label: 'เงินช่วยเหลือ',         icon: HandHelping,  color: 'bg-purple-100', iconColor: 'text-purple-600', fill: '#a855f7' },
  insurance:  { label: 'ประกันชีวิต',           icon: Shield,       color: 'bg-[#e2f4d3]', iconColor: 'text-[#78c045]', fill: '#78c045' },
  bonus:      { label: 'โบนัส/รางวัล',          icon: Star,         color: 'bg-yellow-100', iconColor: 'text-yellow-600', fill: '#eab308' },
  other:      { label: 'สวัสดิการอื่นๆ',        icon: MoreVertical, color: 'bg-gray-100',   iconColor: 'text-gray-600',   fill: '#6b7280' },
};

const getCategoryConfig = (category) =>
  CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

const formatBaht = (num) => {
  if (!num && num !== 0) return '-';
  if (num >= 1_000_000) return `฿${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `฿${(num / 1_000).toFixed(0)}K`;
  return `฿${Number(num).toLocaleString('th-TH')}`;
};

const EMPTY_FORM = {
  name_th: '', name_en: '', category: 'health',
  description: '', eligibility: '', coverage_amount: '',
  provider: '', effective_date: '', expiry_date: '', is_active: true,
};

export default function Welfare({ lang = 'th' }) {
  const [welfareList, setWelfareList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedWelfare, setSelectedWelfare] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => { fetchWelfare(); }, []);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  const fetchWelfare = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('hr_welfare')
        .select('*')
        .order('category', { ascending: true });
      if (err) throw err;
      setWelfareList(data || []);
      if (data && data.length > 0) setSelectedWelfare(data[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    return welfareList.filter(w => {
      const matchSearch = !searchTerm ||
        w.name_th?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.provider?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !filterCategory || w.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [welfareList, searchTerm, filterCategory]);

  // KPI
  const kpis = useMemo(() => {
    const active = welfareList.filter(w => w.is_active).length;
    const totalCoverage = welfareList.reduce((sum, w) => sum + (Number(w.coverage_amount) || 0), 0);
    const categories = new Set(welfareList.map(w => w.category)).size;
    const today = new Date().toISOString().split('T')[0];
    const expiring = welfareList.filter(w => w.expiry_date && w.expiry_date <= today).length;
    return { total: welfareList.length, active, totalCoverage, categories, expiring };
  }, [welfareList]);

  // Pie chart data
  const pieData = useMemo(() => {
    const byCategory = {};
    welfareList.filter(w => w.is_active).forEach(w => {
      const cat = w.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + (Number(w.coverage_amount) || 0);
    });
    return Object.entries(byCategory).map(([cat, val]) => ({
      name: getCategoryConfig(cat).label,
      value: val,
      fill: getCategoryConfig(cat).fill,
    })).filter(d => d.value > 0);
  }, [welfareList]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const byCategory = {};
    welfareList.forEach(w => {
      const cat = w.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, coverage: 0 };
      byCategory[cat].count += 1;
      byCategory[cat].coverage += Number(w.coverage_amount) || 0;
    });
    return byCategory;
  }, [welfareList]);

  const maxCoverage = Math.max(...Object.values(categoryBreakdown).map(v => v.coverage), 1);

  // Open add modal
  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (w) => {
    setEditId(w.id);
    setForm({
      name_th: w.name_th || '',
      name_en: w.name_en || '',
      category: w.category || 'health',
      description: w.description || '',
      eligibility: w.eligibility || '',
      coverage_amount: w.coverage_amount || '',
      provider: w.provider || '',
      effective_date: w.effective_date || '',
      expiry_date: w.expiry_date || '',
      is_active: w.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name_th.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        coverage_amount: form.coverage_amount ? Number(form.coverage_amount) : null,
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
      };
      if (editId) {
        const { error: err } = await supabase.from('hr_welfare').update(payload).eq('id', editId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('hr_welfare').insert([payload]);
        if (err) throw err;
      }
      setSuccess(editId ? 'แก้ไขสำเร็จ!' : 'เพิ่มสวัสดิการสำเร็จ!');
      setShowModal(false);
      await fetchWelfare();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ยืนยันการลบสวัสดิการนี้?')) return;
    try {
      const { error: err } = await supabase.from('hr_welfare').delete().eq('id', id);
      if (err) throw err;
      setSuccess('ลบสำเร็จ!');
      if (selectedWelfare?.id === id) setSelectedWelfare(null);
      await fetchWelfare();
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    }
  };

  const handleExport = () => {
    const columns = [
      { header: 'ชื่อสวัสดิการ (ไทย)', accessor: 'name_th', width: 30 },
      { header: 'ชื่อสวัสดิการ (EN)', accessor: 'name_en', width: 30 },
      { header: 'หมวดหมู่', accessor: (r) => getCategoryConfig(r.category).label, width: 20 },
      { header: 'วงเงินคุ้มครอง', accessor: 'coverage_amount', width: 16 },
      { header: 'บริษัทประกัน/ผู้ให้บริการ', accessor: 'provider', width: 24 },
      { header: 'ผู้มีสิทธิ์', accessor: 'eligibility', width: 20 },
      { header: 'วันที่มีผล', accessor: 'effective_date', width: 14 },
      { header: 'วันหมดอายุ', accessor: 'expiry_date', width: 14 },
      { header: 'สถานะ', accessor: (r) => r.is_active ? 'ใช้งาน' : 'ปิดใช้งาน', width: 12 },
    ];
    exportToExcel({ data: filtered, columns, filename: 'welfare-programs', sheetName: 'สวัสดิการ' });
  };

  const importColumns = [
    { header: 'ชื่อสวัสดิการ (ไทย)', dbField: 'name_th', example: 'ประกันสุขภาพกลุ่ม', width: 30 },
    { header: 'ชื่อสวัสดิการ (EN)', dbField: 'name_en', example: 'Group Health Insurance', width: 30 },
    { header: 'หมวดหมู่', dbField: 'category', example: 'health', width: 16 },
    { header: 'รายละเอียด', dbField: 'description', example: 'ประกันสุขภาพกลุ่มสำหรับพนักงานประจำ', width: 40 },
    { header: 'ผู้มีสิทธิ์', dbField: 'eligibility', example: 'พนักงานประจำ', width: 20 },
    { header: 'วงเงินคุ้มครอง', dbField: 'coverage_amount', example: '500000', transform: v => Number(v) || null, width: 16 },
    { header: 'บริษัทประกัน/ผู้ให้บริการ', dbField: 'provider', example: 'AIA', width: 24 },
    { header: 'วันที่มีผล', dbField: 'effective_date', example: '2026-01-01', width: 14 },
    { header: 'วันหมดอายุ', dbField: 'expiry_date', example: '2026-12-31', width: 14 },
  ];

  const handleImport = async (mappedData) => {
    const { data, error: err } = await supabase.from('hr_welfare').insert(mappedData).select();
    if (err) throw err;
    await fetchWelfare();
    return data?.length || 0;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลสวัสดิการ...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader title="สวัสดิการ" lang={lang} />
          <div className="flex items-center gap-2">
            {success && (
              <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                <Check className="w-4 h-4" /> {success}
              </span>
            )}
            <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImport(true)} lang={lang} />
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" />
              {lang === 'th' ? 'เพิ่มสวัสดิการ' : 'Add Welfare'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Wallet}    iconBg="bg-green-100"  iconColor="text-green-600"  label="โปรแกรมสวัสดิการ"   value={kpis.total} />
          <KPICard icon={TrendingUp} iconBg="bg-blue-100"   iconColor="text-blue-600"  label="ใช้งานอยู่"          value={kpis.active} />
          <KPICard icon={CreditCard} iconBg="bg-orange-100" iconColor="text-orange-600" label="วงเงินคุ้มครองรวม"  value={formatBaht(kpis.totalCoverage)} />
          <KPICard icon={Users}      iconBg="bg-purple-100" iconColor="text-purple-600" label="หมวดหมู่ทั้งหมด"    value={kpis.categories} />
        </div>

        {/* Category Overview */}
        <Section title="ภาพรวมตามหมวดหมู่สวัสดิการ">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(CATEGORY_CONFIG).map(([catKey, cfg]) => {
              const data = categoryBreakdown[catKey];
              if (!data) return null;
              const Icon = cfg.icon;
              return (
                <div key={catKey}
                  onClick={() => setFilterCategory(filterCategory === catKey ? '' : catKey)}
                  className={`p-4 rounded-lg border cursor-pointer transition ${filterCategory === catKey ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'}`}>
                  <div className={`w-10 h-10 ${cfg.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
                  </div>
                  <p className="text-xs font-medium text-gray-700">{cfg.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{data.count} รายการ</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatBaht(data.coverage)}</p>
                  <ProgressBar value={data.coverage} max={maxCoverage} color="bg-blue-400" className="mt-2" />
                </div>
              );
            })}
          </div>
        </Section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Welfare Table */}
          <div className="lg:col-span-2">
            <Section title={`รายการสวัสดิการ (${filtered.length})`}>
              {/* Search & Filter */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาสวัสดิการ..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">ยังไม่มีข้อมูลสวัสดิการ</p>
                  <p className="text-xs mt-1">กดปุ่ม "เพิ่มสวัสดิการ" หรือนำเข้าจาก Excel</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">สวัสดิการ</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">หมวดหมู่</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">วงเงิน</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">ผู้ให้บริการ</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">สถานะ</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(w => {
                        const cfg = getCategoryConfig(w.category);
                        const Icon = cfg.icon;
                        return (
                          <tr key={w.id}
                            onClick={() => setSelectedWelfare(w)}
                            className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition ${selectedWelfare?.id === w.id ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 ${cfg.color} rounded-md flex items-center justify-center flex-shrink-0`}>
                                  <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-xs">{w.name_th}</p>
                                  {w.name_en && <p className="text-xs text-gray-400">{w.name_en}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.iconColor}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 text-xs">
                              {w.coverage_amount ? formatBaht(w.coverage_amount) : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{w.provider || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {w.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => openEdit(w)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(w.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                  <X className="w-3.5 h-3.5" />
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
            </Section>
          </div>

          {/* Right: Chart + Detail */}
          <div className="space-y-5">
            {/* Pie Chart */}
            <Section title="สัดส่วนวงเงินตามหมวดหมู่">
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatBaht(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-gray-600">{d.name}</span>
                        </div>
                        <span className="font-medium text-gray-800">{formatBaht(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-gray-400 text-sm">ยังไม่มีข้อมูล</div>
              )}
            </Section>

            {/* Selected Detail */}
            {selectedWelfare && (
              <Section title="รายละเอียดสวัสดิการ">
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'ชื่อ (ไทย)', value: selectedWelfare.name_th },
                    { label: 'ชื่อ (EN)', value: selectedWelfare.name_en || '-' },
                    { label: 'หมวดหมู่', value: getCategoryConfig(selectedWelfare.category).label },
                    { label: 'วงเงินคุ้มครอง', value: formatBaht(selectedWelfare.coverage_amount) },
                    { label: 'ผู้มีสิทธิ์', value: selectedWelfare.eligibility || '-' },
                    { label: 'ผู้ให้บริการ', value: selectedWelfare.provider || '-' },
                    { label: 'วันที่มีผล', value: selectedWelfare.effective_date || '-' },
                    { label: 'วันหมดอายุ', value: selectedWelfare.expiry_date || '-' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-500 text-xs">{label}</span>
                      <span className="text-gray-900 font-medium text-xs text-right max-w-[55%]">{value}</span>
                    </div>
                  ))}
                  {selectedWelfare.description && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">รายละเอียด</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{selectedWelfare.description}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-bold text-gray-900">
                  {editId ? 'แก้ไขสวัสดิการ' : 'เพิ่มสวัสดิการใหม่'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อสวัสดิการ (ไทย) *</label>
                    <input value={form.name_th} onChange={e => setForm(f => ({ ...f, name_th: e.target.value }))} required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อสวัสดิการ (EN)</label>
                    <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">หมวดหมู่</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none">
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">วงเงินคุ้มครอง (บาท)</label>
                    <input type="number" value={form.coverage_amount} onChange={e => setForm(f => ({ ...f, coverage_amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" placeholder="500000" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ผู้ให้บริการ / บริษัทประกัน</label>
                    <input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" placeholder="AIA, กรุงเทพประกันภัย..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">ผู้มีสิทธิ์</label>
                    <input value={form.eligibility} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" placeholder="พนักงานประจำผ่านทดลองงาน..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">วันที่มีผล</label>
                    <input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ</label>
                    <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">รายละเอียด</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none" />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-600">สถานะ</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                        className="w-4 h-4 rounded text-blue-600" />
                      <span className="text-sm text-gray-700">ใช้งานอยู่</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Modal */}
        <ImportModal
          open={showImport}
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          columns={importColumns}
          tableName="hr_welfare"
          lang={lang}
        />
      </div>
    </div>
  );
}

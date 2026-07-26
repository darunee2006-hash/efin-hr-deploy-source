import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, X, Check, Globe, Phone, Mail, CreditCard, Landmark, Shield, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, Button, Modal, Input, LoadingSpinner } from '../components/UI';

const EMPTY = {
  code: '', name_th: '', name_en: '', tax_id: '', registration_no: '',
  address_th: '', address_en: '', phone: '', fax: '', email: '', website: '', logo_url: '',
  authorized_signatory: '', signatory_position: '',
  social_security_no: '', social_security_branch: '',
  bank_name: '', bank_branch: '', bank_account_no: '', bank_account_name: '',
  provident_fund_name: '', provident_fund_no: '',
  is_active: true, notes: '',
};

export default function CompanyManagement({ lang }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const L = {
    title: lang === 'th' ? 'จัดการบริษัท' : 'Company Management',
    addCompany: lang === 'th' ? 'เพิ่มบริษัท' : 'Add Company',
    editCompany: lang === 'th' ? 'แก้ไขบริษัท' : 'Edit Company',
    code: lang === 'th' ? 'รหัสบริษัท' : 'Company Code',
    nameTh: lang === 'th' ? 'ชื่อบริษัท (ไทย)' : 'Company Name (Thai)',
    nameEn: lang === 'th' ? 'ชื่อบริษัท (EN)' : 'Company Name (EN)',
    taxId: lang === 'th' ? 'เลขประจำตัวผู้เสียภาษี' : 'Tax ID',
    regNo: lang === 'th' ? 'เลขทะเบียนนิติบุคคล' : 'Registration No.',
    addressTh: lang === 'th' ? 'ที่อยู่ (ไทย)' : 'Address (Thai)',
    addressEn: lang === 'th' ? 'ที่อยู่ (EN)' : 'Address (EN)',
    phone: lang === 'th' ? 'โทรศัพท์' : 'Phone',
    fax: lang === 'th' ? 'แฟกซ์' : 'Fax',
    email: lang === 'th' ? 'อีเมล' : 'Email',
    website: lang === 'th' ? 'เว็บไซต์' : 'Website',
    logoUrl: lang === 'th' ? 'URL โลโก้' : 'Logo URL',
    signatory: lang === 'th' ? 'ผู้มีอำนาจลงนาม' : 'Authorized Signatory',
    signatoryPos: lang === 'th' ? 'ตำแหน่งผู้ลงนาม' : 'Signatory Position',
    ssoNo: lang === 'th' ? 'เลขประกันสังคม (สปส.)' : 'SSO Number',
    ssoBranch: lang === 'th' ? 'สาขาประกันสังคม' : 'SSO Branch',
    bankName: lang === 'th' ? 'ธนาคาร' : 'Bank Name',
    bankBranch: lang === 'th' ? 'สาขาธนาคาร' : 'Bank Branch',
    bankAccNo: lang === 'th' ? 'เลขบัญชี' : 'Account No.',
    bankAccName: lang === 'th' ? 'ชื่อบัญชี' : 'Account Name',
    pvdName: lang === 'th' ? 'กองทุนสำรองเลี้ยงชีพ' : 'Provident Fund Name',
    pvdNo: lang === 'th' ? 'เลขกองทุนฯ' : 'PVD Number',
    notes: lang === 'th' ? 'หมายเหตุ' : 'Notes',
    active: lang === 'th' ? 'ใช้งาน' : 'Active',
    inactive: lang === 'th' ? 'ปิดใช้งาน' : 'Inactive',
    save: lang === 'th' ? 'บันทึก' : 'Save',
    cancel: lang === 'th' ? 'ยกเลิก' : 'Cancel',
    saveSuccess: lang === 'th' ? 'บันทึกสำเร็จ!' : 'Saved!',
    noCompanies: lang === 'th' ? 'ยังไม่มีบริษัท' : 'No companies',
    sectionGeneral: lang === 'th' ? 'ข้อมูลทั่วไป' : 'General Info',
    sectionContact: lang === 'th' ? 'ข้อมูลติดต่อ' : 'Contact Info',
    sectionLegal: lang === 'th' ? 'ข้อมูลนิติบุคคล' : 'Legal / Tax',
    sectionBank: lang === 'th' ? 'ข้อมูลธนาคาร' : 'Banking Info',
    sectionPvd: lang === 'th' ? 'กองทุนสำรองเลี้ยงชีพ' : 'Provident Fund',
    sectionOther: lang === 'th' ? 'อื่นๆ' : 'Other',
    empCount: lang === 'th' ? 'พนักงาน' : 'Employees',
  };

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase.from('hr_companies').select('*').order('code');
      if (err) throw err;

      // Get employee count per company
      const { data: empData } = await supabase.from('hr_employees').select('company_entity');
      const countMap = {};
      (empData || []).forEach(e => {
        const k = e.company_entity || 'UNKNOWN';
        countMap[k] = (countMap[k] || 0) + 1;
      });

      setCompanies((data || []).map(c => ({ ...c, emp_count: countMap[c.code] || 0 })));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY }); setError(null); setShowModal(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({
      code: c.code || '', name_th: c.name_th || '', name_en: c.name_en || '',
      tax_id: c.tax_id || '', registration_no: c.registration_no || '',
      address_th: c.address_th || '', address_en: c.address_en || '',
      phone: c.phone || '', fax: c.fax || '', email: c.email || '', website: c.website || '',
      logo_url: c.logo_url || '',
      authorized_signatory: c.authorized_signatory || '', signatory_position: c.signatory_position || '',
      social_security_no: c.social_security_no || '', social_security_branch: c.social_security_branch || '',
      bank_name: c.bank_name || '', bank_branch: c.bank_branch || '',
      bank_account_no: c.bank_account_no || '', bank_account_name: c.bank_account_name || '',
      provident_fund_name: c.provident_fund_name || '', provident_fund_no: c.provident_fund_no || '',
      is_active: c.is_active !== false, notes: c.notes || '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null); setSaving(true);
    try {
      if (!form.name_th) throw new Error(lang === 'th' ? 'กรุณากรอกชื่อบริษัท' : 'Company name is required');
      const payload = { ...form };
      // Clean empty strings to null
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      payload.is_active = form.is_active;
      payload.updated_at = new Date().toISOString();

      if (editId) {
        const { error: err } = await supabase.from('hr_companies').update(payload).eq('id', editId);
        if (err) throw err;
      } else {
        payload.created_at = new Date().toISOString();
        const { error: err } = await supabase.from('hr_companies').insert(payload);
        if (err) throw err;
      }
      setSuccess(L.saveSuccess);
      setShowModal(false);
      loadCompanies();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const SectionHeader = ({ icon: Icon, label }) => (
    <div className="flex items-center gap-2 border-b border-gray-100 pb-1.5 mb-3 mt-4 first:mt-0">
      <Icon className="w-4 h-4 text-[#78c045]" />
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );

  const InfoRow = ({ label, value }) => value ? (
    <div className="flex items-start gap-2 text-sm py-1">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  ) : null;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e2f4d3] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#78c045]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{L.title}</h2>
            <p className="text-xs text-gray-400">{companies.length} {lang === 'th' ? 'บริษัท' : 'companies'}</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" />
          {L.addCompany}
        </Button>
      </div>

      {/* Alerts */}
      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-sm text-green-700">{success}</p>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4 text-green-400" /></button>
        </div>
      )}

      {/* Company Cards */}
      {companies.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-gray-400">{L.noCompanies}</p></Card>
      ) : (
        <div className="space-y-4">
          {companies.map(c => (
            <Card key={c.id} className="overflow-hidden">
              {/* Card header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#f0f9e8] flex items-center justify-center flex-shrink-0">
                    {c.logo_url
                      ? <img src={c.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain" />
                      : <Building2 className="w-6 h-6 text-[#78c045]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{c.name_th}</h3>
                      <Badge color={c.is_active ? 'green' : 'gray'}>{c.is_active ? L.active : L.inactive}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.name_en && <span className="text-xs text-gray-500">{c.name_en}</span>}
                      {c.code && <span className="text-xs font-mono text-[#78c045] bg-[#f0f9e8] px-1.5 py-0.5 rounded">{c.code}</span>}
                      <span className="text-xs text-gray-400">{c.emp_count} {L.empCount}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                    className="p-2 rounded-lg hover:bg-[#f0f9e8] text-gray-400 hover:text-[#5a9030] transition-colors"
                    title={L.editCompany}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === c.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === c.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                      <SectionHeader icon={FileText} label={L.sectionLegal} />
                      <InfoRow label={L.taxId} value={c.tax_id} />
                      <InfoRow label={L.regNo} value={c.registration_no} />
                      <InfoRow label={L.signatory} value={c.authorized_signatory} />
                      <InfoRow label={L.signatoryPos} value={c.signatory_position} />
                      <InfoRow label={L.ssoNo} value={c.social_security_no} />
                      <InfoRow label={L.ssoBranch} value={c.social_security_branch} />

                      <SectionHeader icon={Globe} label={L.sectionContact} />
                      <InfoRow label={L.phone} value={c.phone} />
                      <InfoRow label={L.fax} value={c.fax} />
                      <InfoRow label={L.email} value={c.email} />
                      <InfoRow label={L.website} value={c.website} />
                    </div>
                    <div>
                      <SectionHeader icon={Landmark} label={L.sectionBank} />
                      <InfoRow label={L.bankName} value={c.bank_name} />
                      <InfoRow label={L.bankBranch} value={c.bank_branch} />
                      <InfoRow label={L.bankAccNo} value={c.bank_account_no} />
                      <InfoRow label={L.bankAccName} value={c.bank_account_name} />

                      <SectionHeader icon={Shield} label={L.sectionPvd} />
                      <InfoRow label={L.pvdName} value={c.provident_fund_name} />
                      <InfoRow label={L.pvdNo} value={c.provident_fund_no} />

                      <SectionHeader icon={Building2} label={L.sectionOther} />
                      <InfoRow label={L.addressTh} value={c.address_th} />
                      <InfoRow label={L.addressEn} value={c.address_en} />
                      {c.notes && <InfoRow label={L.notes} value={c.notes} />}
                    </div>
                  </div>
                  {(!c.tax_id && !c.phone && !c.bank_name) && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      {lang === 'th' ? 'ยังไม่ได้กรอกรายละเอียด — กดปุ่มแก้ไขเพื่อเพิ่มข้อมูล' : 'No details yet — click Edit to add info'}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? L.editCompany : L.addCompany} wide>
        <form onSubmit={handleSave} className="space-y-1">
          {error && showModal && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <SectionHeader icon={Building2} label={L.sectionGeneral} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Input label={L.code} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="EFIN" />
            <Input label={L.nameTh} value={form.name_th} onChange={e => setForm({ ...form, name_th: e.target.value })} required />
            <Input label={L.nameEn} value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
          </div>

          <SectionHeader icon={FileText} label={L.sectionLegal} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.taxId} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} placeholder="0-0000-00000-00-0" />
            <Input label={L.regNo} value={form.registration_no} onChange={e => setForm({ ...form, registration_no: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.signatory} value={form.authorized_signatory} onChange={e => setForm({ ...form, authorized_signatory: e.target.value })} />
            <Input label={L.signatoryPos} value={form.signatory_position} onChange={e => setForm({ ...form, signatory_position: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.ssoNo} value={form.social_security_no} onChange={e => setForm({ ...form, social_security_no: e.target.value })} />
            <Input label={L.ssoBranch} value={form.social_security_branch} onChange={e => setForm({ ...form, social_security_branch: e.target.value })} />
          </div>

          <SectionHeader icon={Globe} label={L.sectionContact} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.phone} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label={L.fax} value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.email} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@company.com" />
            <Input label={L.website} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{L.addressTh}</label>
              <textarea rows={2} value={form.address_th} onChange={e => setForm({ ...form, address_th: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{L.addressEn}</label>
              <textarea rows={2} value={form.address_en} onChange={e => setForm({ ...form, address_en: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none" />
            </div>
          </div>

          <SectionHeader icon={Landmark} label={L.sectionBank} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.bankName} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
            <Input label={L.bankBranch} value={form.bank_branch} onChange={e => setForm({ ...form, bank_branch: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.bankAccNo} value={form.bank_account_no} onChange={e => setForm({ ...form, bank_account_no: e.target.value })} />
            <Input label={L.bankAccName} value={form.bank_account_name} onChange={e => setForm({ ...form, bank_account_name: e.target.value })} />
          </div>

          <SectionHeader icon={Shield} label={L.sectionPvd} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label={L.pvdName} value={form.provident_fund_name} onChange={e => setForm({ ...form, provident_fund_name: e.target.value })} />
            <Input label={L.pvdNo} value={form.provident_fund_no} onChange={e => setForm({ ...form, provident_fund_no: e.target.value })} />
          </div>

          <div className="mt-3">
            <Input label={L.logoUrl} value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{L.notes}</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300 text-[#78c045] focus:ring-[#78c045]" />
            <label className="text-sm text-gray-700">{L.active}</label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? '...' : L.save}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              {L.cancel}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

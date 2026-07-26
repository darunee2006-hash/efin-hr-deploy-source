import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserPlus, Shield, Edit2, Check, X, Users, ShieldCheck, ShieldAlert, UserCog, Save, ChevronUp, ChevronDown, ChevronsUpDown, Eye, EyeOff, Key, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { Card, Badge, Button, Modal, Input, Select, SearchInput, StatCard, LoadingSpinner } from '../components/UI';
import { exportToExcel, ImportModal, ImportExportButtons } from '../components/ImportExport';

const ROLES = [
  { value: 'employee', labelTh: 'พนักงาน', labelEn: 'Employee', color: 'gray' },
  { value: 'manager', labelTh: 'หัวหน้างาน', labelEn: 'Manager', color: 'blue' },
  { value: 'admin', labelTh: 'ผู้ดูแลระบบ', labelEn: 'Admin', color: 'purple' },
  { value: 'superuser', labelTh: 'Super User', labelEn: 'Super User', color: 'red' },
];

// All 20 columns definition
const COLUMNS = [
  { key: 'employee_code', thLabel: 'รหัสพนักงาน', enLabel: 'Emp Code', width: 'w-24', defaultVisible: true },
  { key: 'full_name', thLabel: 'ชื่อ-นามสกุล', enLabel: 'Name', width: 'w-40', defaultVisible: true },
  { key: 'national_id', thLabel: 'เลขบัตรประชาชน', enLabel: 'ID Card', width: 'w-32', sensitive: true, defaultVisible: false },
  { key: 'date_of_birth', thLabel: 'วันเกิด', enLabel: 'Birth Date', width: 'w-24', defaultVisible: false },
  { key: 'registered_address', thLabel: 'ที่อยู่ทะเบียนบ้าน', enLabel: 'Address', width: 'w-48', defaultVisible: false },
  { key: 'hire_date', thLabel: 'วันที่เริ่มงาน', enLabel: 'Hire Date', width: 'w-24', defaultVisible: true },
  { key: 'employment_type', thLabel: 'ประเภทพนักงาน', enLabel: 'Emp Type', width: 'w-24', defaultVisible: true },
  { key: 'company_entity', thLabel: 'บริษัท', enLabel: 'Company', width: 'w-20', defaultVisible: true },
  { key: 'bu', thLabel: 'BU', enLabel: 'BU', width: 'w-32', defaultVisible: true },
  { key: 'department', thLabel: 'แผนก', enLabel: 'Department', width: 'w-32', defaultVisible: true },
  { key: 'position_th', thLabel: 'ตำแหน่ง', enLabel: 'Position', width: 'w-36', defaultVisible: true },
  { key: 'cost_center', thLabel: 'Cost Center', enLabel: 'Cost Center', width: 'w-24', defaultVisible: false },
  { key: 'base_salary', thLabel: 'เงินเดือน', enLabel: 'Salary', width: 'w-28', sensitive: true, defaultVisible: false },
  { key: 'payroll_cycle', thLabel: 'รอบเงินเดือน', enLabel: 'Pay Cycle', width: 'w-24', defaultVisible: false },
  { key: 'bank_name', thLabel: 'ธนาคาร', enLabel: 'Bank', width: 'w-28', defaultVisible: false },
  { key: 'bank_account', thLabel: 'เลขที่บัญชี', enLabel: 'Account No.', width: 'w-28', sensitive: true, defaultVisible: false },
  { key: 'sso_status', thLabel: 'ประกันสังคม', enLabel: 'SSO Status', width: 'w-24', defaultVisible: false },
  { key: 'sso_hospital', thLabel: 'รพ.ประกันสังคม', enLabel: 'SSO Hospital', width: 'w-32', defaultVisible: false },
  { key: 'tax_id', thLabel: 'เลขผู้เสียภาษี', enLabel: 'Tax ID', width: 'w-28', sensitive: true, defaultVisible: false },
  { key: 'tax_deduction', thLabel: 'ลดหย่อนภาษี', enLabel: 'Tax Deduction', width: 'w-28', defaultVisible: false },
  { key: 'pvd_status', thLabel: 'กองทุนสำรองฯ', enLabel: 'PVD', width: 'w-24', defaultVisible: false },
  { key: 'emergency_contact', thLabel: 'ผู้ติดต่อฉุกเฉิน', enLabel: 'Emergency', width: 'w-40', defaultVisible: false },
];

const BU_OPTIONS = [
  'BU efin.finance',
  'BU Content',
  'BU IR Plus',
  'BU IT Solution',
  'Cost Center',
  'ATESS',
];

// Export columns
const EXPORT_COLS = [
  { header: 'รหัสพนักงาน', accessor: 'employee_code', width: 16 },
  { header: 'คำนำหน้า', accessor: 'prefix_th', width: 10 },
  { header: 'ชื่อ (ไทย)', accessor: 'first_name_th', width: 18 },
  { header: 'นามสกุล (ไทย)', accessor: 'last_name_th', width: 18 },
  { header: 'ชื่อเล่น', accessor: 'nickname', width: 12 },
  { header: 'ชื่อ (EN)', accessor: 'first_name_en', width: 18 },
  { header: 'นามสกุล (EN)', accessor: 'last_name_en', width: 18 },
  { header: 'อีเมล', accessor: 'email', width: 28 },
  { header: 'เบอร์โทร', accessor: 'phone', width: 16 },
  { header: 'บริษัท', accessor: 'company_entity', width: 10 },
  { header: 'BU', accessor: 'bu', width: 22 },
  { header: 'ตำแหน่ง (ไทย)', accessor: 'position_th', width: 30 },
  { header: 'ตำแหน่ง (EN)', accessor: 'position_en', width: 30 },
  { header: 'วันเริ่มงาน', accessor: 'hire_date', width: 14 },
  { header: 'ประเภทพนักงาน', accessor: 'employment_type', width: 14 },
  { header: 'สิทธิ์ระบบ', accessor: 'system_role', width: 14 },
  { header: 'เงินเดือน', accessor: 'base_salary', width: 14 },
  { header: 'เลขบัตรประชาชน', accessor: 'national_id', width: 18 },
  { header: 'วันเกิด', accessor: 'date_of_birth', width: 14 },
  { header: 'ธนาคาร', accessor: 'bank_name', width: 18 },
  { header: 'เลขที่บัญชี', accessor: 'bank_account', width: 18 },
];

// Import columns (map Thai header → db field)
const IMPORT_COLS = [
  { header: 'รหัสพนักงาน', dbField: 'employee_code', example: 'OA50110001', width: 16 },
  { header: 'คำนำหน้า', dbField: 'prefix_th', example: 'นาย', width: 10 },
  { header: 'ชื่อ (ไทย)', dbField: 'first_name_th', example: 'สมชาย', width: 18 },
  { header: 'นามสกุล (ไทย)', dbField: 'last_name_th', example: 'ใจดี', width: 18 },
  { header: 'ชื่อเล่น', dbField: 'nickname', example: 'ชาย', width: 12 },
  { header: 'ชื่อ (EN)', dbField: 'first_name_en', example: 'Somchai', width: 18 },
  { header: 'นามสกุล (EN)', dbField: 'last_name_en', example: 'Jaidee', width: 18 },
  { header: 'อีเมล', dbField: 'email', example: 'somchai@example.com', width: 28 },
  { header: 'เบอร์โทร', dbField: 'phone', example: '081-xxx-xxxx', width: 16 },
  { header: 'บริษัท', dbField: 'company_entity', example: 'OA', width: 10 },
  { header: 'BU', dbField: 'bu', example: 'BU efin.finance', width: 22 },
  { header: 'ตำแหน่ง (ไทย)', dbField: 'position_th', example: 'Software Engineer', width: 30 },
  { header: 'ตำแหน่ง (EN)', dbField: 'position_en', example: 'Software Engineer', width: 30 },
  { header: 'วันเริ่มงาน', dbField: 'hire_date', example: '2025-01-15', width: 14 },
  { header: 'ประเภทพนักงาน', dbField: 'employment_type', example: 'permanent', width: 14 },
  { header: 'สิทธิ์ระบบ', dbField: 'system_role', example: 'employee', width: 14 },
  { header: 'เงินเดือน', dbField: 'base_salary', example: '35000', width: 14, transform: v => Number(v) || null },
];

const EMPTY_FORM = {
  employee_code: '', prefix_th: 'นาย',
  first_name_th: '', last_name_th: '', first_name_en: '', last_name_en: '', nickname: '',
  email: '', phone: '', department_id: '', position_th: '', position_en: '',
  hire_date: '', employment_type: 'permanent', system_role: 'employee', company_entity: '', bu: '',
  national_id: '', date_of_birth: '', registered_address: '', cost_center: '',
  base_salary: '', payroll_cycle: 'monthly', bank_name: '', bank_account: '',
  social_security_no: '', sso_hospital: '', tax_id: '', tax_filing_status: '',
  pvd_employee_rate: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
};

// Sort icon component
function SortIcon({ sortKey, currentSort }) {
  if (currentSort.key !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-0.5 inline" />;
  return currentSort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-[#78c045] ml-0.5 inline" />
    : <ChevronDown className="w-3 h-3 text-[#78c045] ml-0.5 inline" />;
}

export default function UserManagement({ lang }) {
  const { user: currentUser, canViewSalary } = useAuth();
  const { filterByCompany, activeCompanies } = useCompanyFilter();
  const [rawEmployees, setRawEmployees] = useState([]);
  const employees = useMemo(() => filterByCompany(rawEmployees), [rawEmployees, filterByCompany]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterBU, setFilterBU] = useState('all');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRole, setBulkRole] = useState('employee');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [addSaving, setAddSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  // Sort state
  const [sort, setSort] = useState({ key: 'employee_code', dir: 'asc' });
  // Column visibility
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = typeof window !== 'undefined' ? null : null; // no localStorage
    return COLUMNS.reduce((acc, col) => { acc[col.key] = col.defaultVisible; return acc; }, {});
  });
  const [showColPicker, setShowColPicker] = useState(false);
  // Password reset state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState(false);
  const [resetPwTarget, setResetPwTarget] = useState(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [resetPwShow, setResetPwShow] = useState(false);
  const [resetPwSaving, setResetPwSaving] = useState(false);

  const companyOptions = activeCompanies || [];

  const L = {
    title: lang === 'th' ? 'จัดการผู้ใช้' : 'User Management',
    searchPlaceholder: lang === 'th' ? 'ค้นหาพนักงาน...' : 'Search employee...',
    allRoles: lang === 'th' ? 'ทุกสิทธิ์' : 'All Roles',
    allDepts: lang === 'th' ? 'ทุกแผนก' : 'All Departments',
    totalEmployees: lang === 'th' ? 'พนักงานทั้งหมด' : 'Total Employees',
    admins: lang === 'th' ? 'ผู้ดูแลระบบ' : 'Admins',
    managers: lang === 'th' ? 'หัวหน้างาน' : 'Managers',
    employeesLabel: lang === 'th' ? 'พนักงาน' : 'Employees',
    saved: lang === 'th' ? 'บันทึกสำเร็จ!' : 'Saved!',
    bulkUpdate: lang === 'th' ? 'กำหนดสิทธิ์กลุ่ม' : 'Bulk Role',
    bulkConfirm: lang === 'th' ? 'ยืนยัน' : 'Confirm',
    persons: lang === 'th' ? 'คน' : 'persons',
    cancel: lang === 'th' ? 'ยกเลิก' : 'Cancel',
    noData: lang === 'th' ? 'ไม่พบข้อมูล' : 'No data found',
    addEmployee: lang === 'th' ? 'เพิ่มพนักงาน' : 'Add Employee',
    editEmployee: lang === 'th' ? 'แก้ไขข้อมูล' : 'Edit Employee',
    save: lang === 'th' ? 'บันทึก' : 'Save',
    addSuccess: lang === 'th' ? 'เพิ่มพนักงานสำเร็จ!' : 'Employee added!',
    editSuccess: lang === 'th' ? 'แก้ไขข้อมูลสำเร็จ!' : 'Updated!',
    columns: lang === 'th' ? 'คอลัมน์' : 'Columns',
    setAs: lang === 'th' ? 'ตั้งเป็น' : 'Set as',
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); } }, [success]);

  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const [empRes, deptRes, profileRes] = await Promise.all([
        supabase.from('hr_employees')
          .select('id, employee_code, prefix_th, first_name_th, last_name_th, first_name_en, last_name_en, nickname, email, phone, position_th, position_en, department_id, status, system_role, hire_date, employment_type, base_salary, company_entity, bu, level, team_section, national_id, date_of_birth, registered_address, cost_center, payroll_cycle, bank_name, bank_account, social_security_no, sso_hospital, sso_rate, tax_id, tax_filing_status, num_dependents, pvd_employee_rate, pvd_employer_rate, emergency_contact_name, emergency_contact_phone, emergency_contact_relation')
          .order('employee_code', { ascending: true }),
        supabase.from('hr_departments').select('id, name_th, name_en'),
        supabase.from('hr_user_profiles').select('id, employee_id, role, display_name'),
      ]);
      if (empRes.error) throw empRes.error;
      const profileMap = {};
      (profileRes.data || []).forEach(p => { if (p.employee_id) profileMap[p.employee_id] = p; });
      setRawEmployees((empRes.data || []).map(emp => ({ ...emp, userProfile: profileMap[emp.id] || null })));
      setDepartments(deptRes.data || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const deptMap = useMemo(() => { const m = {}; departments.forEach(d => { m[d.id] = d; }); return m; }, [departments]);
  const getDeptName = (deptId) => { const d = deptMap[deptId]; if (!d) return '—'; return lang === 'th' ? (d.name_th || d.name_en || '—') : (d.name_en || d.name_th || '—'); };
  const getEmpName = (emp) => lang === 'th' ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim() : `${emp.first_name_en || emp.first_name_th || ''} ${emp.last_name_en || emp.last_name_th || ''}`.trim();

  // Get cell value for a column
  const getCellValue = useCallback((emp, colKey) => {
    switch (colKey) {
      case 'employee_code': return emp.employee_code || '';
      case 'full_name': return getEmpName(emp);
      case 'national_id': return emp.national_id || '';
      case 'date_of_birth': return emp.date_of_birth || '';
      case 'registered_address': return emp.registered_address || '';
      case 'hire_date': return emp.hire_date || '';
      case 'employment_type': {
        const types = { permanent: lang === 'th' ? 'ประจำ' : 'Permanent', contract: lang === 'th' ? 'สัญญาจ้าง' : 'Contract', part_time: 'Part-time' };
        return types[emp.employment_type] || emp.employment_type || '—';
      }
      case 'company_entity': return emp.company_entity || '—';
      case 'bu': return emp.bu || '—';
      case 'department': return getDeptName(emp.department_id);
      case 'position_th': return (lang === 'th' ? emp.position_th : (emp.position_en || emp.position_th)) || '—';
      case 'cost_center': return emp.cost_center || '—';
      case 'base_salary': return emp.base_salary ? Number(emp.base_salary).toLocaleString('th-TH') : '—';
      case 'payroll_cycle': {
        const cycles = { monthly: lang === 'th' ? 'รายเดือน' : 'Monthly', biweekly: lang === 'th' ? 'ราย 2 สัปดาห์' : 'Bi-weekly' };
        return cycles[emp.payroll_cycle] || emp.payroll_cycle || '—';
      }
      case 'bank_name': return emp.bank_name || '—';
      case 'bank_account': return emp.bank_account || '—';
      case 'sso_status': return emp.social_security_no ? (lang === 'th' ? 'มี' : 'Active') : (lang === 'th' ? 'ไม่มี' : 'None');
      case 'sso_hospital': return emp.sso_hospital || '—';
      case 'tax_id': return emp.tax_id || '—';
      case 'tax_deduction': {
        const parts = [];
        if (emp.tax_filing_status) parts.push(emp.tax_filing_status);
        if (emp.num_dependents) parts.push(`${lang === 'th' ? 'บุตร' : 'Children'}: ${emp.num_dependents}`);
        return parts.length > 0 ? parts.join(', ') : '—';
      }
      case 'pvd_status': {
        if (emp.pvd_employee_rate && Number(emp.pvd_employee_rate) > 0) {
          return `${emp.pvd_employee_rate}%/${emp.pvd_employer_rate || 0}%`;
        }
        return lang === 'th' ? 'ไม่สมัคร' : 'None';
      }
      case 'emergency_contact': {
        if (emp.emergency_contact_name) {
          const rel = emp.emergency_contact_relation ? ` (${emp.emergency_contact_relation})` : '';
          const phone = emp.emergency_contact_phone ? ` ${emp.emergency_contact_phone}` : '';
          return `${emp.emergency_contact_name}${rel}${phone}`;
        }
        return '—';
      }
      default: return '—';
    }
  }, [lang, deptMap]);

  // Sort raw value for comparison
  const getSortValue = useCallback((emp, colKey) => {
    switch (colKey) {
      case 'base_salary': return emp.base_salary ? Number(emp.base_salary) : 0;
      case 'date_of_birth': case 'hire_date': return emp[colKey] || '';
      case 'full_name': return getEmpName(emp).toLowerCase();
      case 'company_entity': return (emp.company_entity || '').toLowerCase();
      case 'bu': return (emp.bu || '').toLowerCase();
      case 'department': return getDeptName(emp.department_id).toLowerCase();
      default: return getCellValue(emp, colKey).toString().toLowerCase();
    }
  }, [getCellValue]);

  const nextCode = useMemo(() => {
    if (employees.length === 0) return 'EF0001';
    const codes = employees.map(e => e.employee_code).filter(Boolean).sort();
    const last = codes[codes.length - 1] || 'EF0000';
    const num = parseInt(last.replace(/\D/g, ''), 10) + 1;
    return 'EF' + String(num).padStart(4, '0');
  }, [employees]);

  // --- Role Change ---
  const handleRoleChange = async (empId, newRole) => {
    setSaving(prev => ({ ...prev, [empId]: true })); setError(null);
    try {
      const { error: empErr } = await supabase.from('hr_employees').update({ system_role: newRole }).eq('id', empId);
      if (empErr) throw empErr;
      const emp = employees.find(e => e.id === empId);
      if (emp?.userProfile) await supabase.from('hr_user_profiles').update({ role: newRole }).eq('employee_id', empId);
      setRawEmployees(prev => prev.map(e => e.id === empId ? { ...e, system_role: newRole } : e));
      setSuccess(L.saved);
    } catch (err) { setError(err.message); }
    finally { setSaving(prev => ({ ...prev, [empId]: false })); }
  };

  // --- Bulk Update ---
  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    setSaving(prev => ({ ...prev, _bulk: true })); setError(null);
    try {
      const ids = Array.from(selectedIds);
      const { error: empErr } = await supabase.from('hr_employees').update({ system_role: bulkRole }).in('id', ids);
      if (empErr) throw empErr;
      const withAccounts = employees.filter(e => ids.includes(e.id) && e.userProfile).map(e => e.id);
      if (withAccounts.length > 0) await supabase.from('hr_user_profiles').update({ role: bulkRole }).in('employee_id', withAccounts);
      setRawEmployees(prev => prev.map(e => ids.includes(e.id) ? { ...e, system_role: bulkRole } : e));
      setSuccess(`${lang === 'th' ? 'อัปเดต' : 'Updated'} ${ids.length} ${L.persons}`);
      setSelectedIds(new Set()); setSelectAll(false); setShowBulkModal(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(prev => ({ ...prev, _bulk: false })); }
  };

  // --- Add Employee ---
  const openAddModal = () => { setAddForm({ ...EMPTY_FORM, employee_code: nextCode }); setError(null); setShowAddModal(true); };
  const handleAddEmployee = async (e) => {
    e.preventDefault(); setError(null); setAddSaving(true);
    try {
      if (!addForm.first_name_th || !addForm.last_name_th) throw new Error(lang === 'th' ? 'กรุณากรอกชื่อ-นามสกุล' : 'Name is required');
      const insert = {
        employee_code: addForm.employee_code || nextCode, prefix_th: addForm.prefix_th,
        first_name_th: addForm.first_name_th, last_name_th: addForm.last_name_th,
        first_name_en: addForm.first_name_en || null, last_name_en: addForm.last_name_en || null,
        nickname: addForm.nickname || null, email: addForm.email || null, phone: addForm.phone || null,
        department_id: addForm.department_id || null, position_th: addForm.position_th || null,
        position_en: addForm.position_en || null, hire_date: addForm.hire_date || null,
        employment_type: addForm.employment_type, system_role: addForm.system_role,
        company_entity: addForm.company_entity || null, bu: addForm.bu || null, national_id: addForm.national_id || null,
        date_of_birth: addForm.date_of_birth || null, registered_address: addForm.registered_address || null,
        cost_center: addForm.cost_center || null, base_salary: addForm.base_salary || null,
        payroll_cycle: addForm.payroll_cycle || 'monthly', bank_name: addForm.bank_name || null,
        bank_account: addForm.bank_account || null, social_security_no: addForm.social_security_no || null,
        sso_hospital: addForm.sso_hospital || null, tax_id: addForm.tax_id || null,
        tax_filing_status: addForm.tax_filing_status || null, pvd_employee_rate: addForm.pvd_employee_rate || null,
        emergency_contact_name: addForm.emergency_contact_name || null,
        emergency_contact_phone: addForm.emergency_contact_phone || null,
        emergency_contact_relation: addForm.emergency_contact_relation || null,
        status: 'active',
      };
      const { error: insErr } = await supabase.from('hr_employees').insert(insert).select().single();
      if (insErr) throw insErr;
      setSuccess(L.addSuccess); setShowAddModal(false); loadData();
    } catch (err) { setError(err.message); } finally { setAddSaving(false); }
  };

  // --- Edit Employee ---
  const openEditModal = (emp) => {
    setEditId(emp.id);
    setEditForm({
      employee_code: emp.employee_code || '', prefix_th: emp.prefix_th || 'นาย',
      first_name_th: emp.first_name_th || '', last_name_th: emp.last_name_th || '',
      first_name_en: emp.first_name_en || '', last_name_en: emp.last_name_en || '',
      nickname: emp.nickname || '', email: emp.email || '', phone: emp.phone || '',
      department_id: emp.department_id || '', position_th: emp.position_th || '',
      position_en: emp.position_en || '', hire_date: emp.hire_date || '',
      employment_type: emp.employment_type || 'permanent', system_role: emp.system_role || 'employee',
      company_entity: emp.company_entity || '', bu: emp.bu || '', national_id: emp.national_id || '',
      date_of_birth: emp.date_of_birth || '', registered_address: emp.registered_address || '',
      cost_center: emp.cost_center || '', base_salary: emp.base_salary || '',
      payroll_cycle: emp.payroll_cycle || 'monthly', bank_name: emp.bank_name || '',
      bank_account: emp.bank_account || '', social_security_no: emp.social_security_no || '',
      sso_hospital: emp.sso_hospital || '', tax_id: emp.tax_id || '',
      tax_filing_status: emp.tax_filing_status || '', pvd_employee_rate: emp.pvd_employee_rate || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      emergency_contact_relation: emp.emergency_contact_relation || '',
    });
    setError(null); setShowEditModal(true);
  };
  const handleEditEmployee = async (e) => {
    e.preventDefault(); setError(null); setEditSaving(true);
    try {
      const upd = {
        prefix_th: editForm.prefix_th, first_name_th: editForm.first_name_th,
        last_name_th: editForm.last_name_th, first_name_en: editForm.first_name_en || null,
        last_name_en: editForm.last_name_en || null, nickname: editForm.nickname || null,
        email: editForm.email || null, phone: editForm.phone || null,
        department_id: editForm.department_id || null, position_th: editForm.position_th || null,
        position_en: editForm.position_en || null, hire_date: editForm.hire_date || null,
        employment_type: editForm.employment_type, system_role: editForm.system_role,
        company_entity: editForm.company_entity || null, bu: editForm.bu || null, national_id: editForm.national_id || null,
        date_of_birth: editForm.date_of_birth || null, registered_address: editForm.registered_address || null,
        cost_center: editForm.cost_center || null, base_salary: editForm.base_salary || null,
        payroll_cycle: editForm.payroll_cycle || 'monthly', bank_name: editForm.bank_name || null,
        bank_account: editForm.bank_account || null, social_security_no: editForm.social_security_no || null,
        sso_hospital: editForm.sso_hospital || null, tax_id: editForm.tax_id || null,
        tax_filing_status: editForm.tax_filing_status || null, pvd_employee_rate: editForm.pvd_employee_rate || null,
        emergency_contact_name: editForm.emergency_contact_name || null,
        emergency_contact_phone: editForm.emergency_contact_phone || null,
        emergency_contact_relation: editForm.emergency_contact_relation || null,
      };
      const { error: updErr } = await supabase.from('hr_employees').update(upd).eq('id', editId);
      if (updErr) throw updErr;
      const emp = employees.find(x => x.id === editId);
      if (emp?.userProfile) await supabase.from('hr_user_profiles').update({ role: editForm.system_role }).eq('employee_id', editId);
      setSuccess(L.editSuccess); setShowEditModal(false); loadData();
    } catch (err) { setError(err.message); } finally { setEditSaving(false); }
  };

  // --- Admin Reset Password ---
  const openResetPwModal = (emp) => {
    setResetPwTarget(emp);
    setResetPwValue('');
    setResetPwShow(false);
    setShowResetPwModal(true);
    setError(null);
  };
  const handleResetPassword = async () => {
    if (!resetPwTarget || !resetPwValue) return;
    if (resetPwValue.length < 6) { setError(lang === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters'); return; }
    setResetPwSaving(true); setError(null);
    try {
      // Check if employee has an auth account
      const profile = resetPwTarget.userProfile;
      if (!profile) {
        // No auth account — create one
        if (!resetPwTarget.email) throw new Error(lang === 'th' ? 'พนักงานไม่มีอีเมล ไม่สามารถสร้างบัญชีได้' : 'Employee has no email, cannot create account');
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: resetPwTarget.email,
          password: resetPwValue,
          options: { data: { display_name: `${resetPwTarget.first_name_th} ${resetPwTarget.last_name_th}` } }
        });
        if (signUpErr) throw signUpErr;
        // Create user profile entry
        if (signUpData?.user) {
          await supabase.from('hr_user_profiles').insert({
            id: signUpData.user.id,
            employee_id: resetPwTarget.id,
            role: resetPwTarget.system_role || 'employee',
            display_name: `${resetPwTarget.first_name_th} ${resetPwTarget.last_name_th}`,
            email: resetPwTarget.email,
          });
        }
        setSuccess(lang === 'th' ? `สร้างบัญชีให้ ${resetPwTarget.first_name_th} สำเร็จ!` : `Account created for ${resetPwTarget.first_name_en || resetPwTarget.first_name_th}!`);
      } else {
        // Has auth account — update password via admin API
        // Note: Supabase anon key cannot reset other users' passwords directly.
        // We'll use a workaround: sign in as that user with current session, or use service role.
        // For now, we update via the admin endpoint if available.
        const { error: updErr } = await supabase.auth.admin.updateUserById(profile.id, { password: resetPwValue });
        if (updErr) {
          // Fallback: if admin API not available, show instructions
          throw new Error(lang === 'th'
            ? 'ไม่สามารถรีเซ็ตรหัสผ่านผ่าน anon key ได้ แนะนำให้ใช้ Supabase Dashboard หรือแจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านเอง'
            : 'Cannot reset password via anon key. Use Supabase Dashboard or ask user to change their own password.');
        }
        setSuccess(lang === 'th' ? `รีเซ็ตรหัสผ่าน ${resetPwTarget.first_name_th} สำเร็จ!` : `Password reset for ${resetPwTarget.first_name_en || resetPwTarget.first_name_th}!`);
      }
      setShowResetPwModal(false); loadData();
    } catch (err) { setError(err.message); }
    finally { setResetPwSaving(false); }
  };

  const uniqueDepts = useMemo(() => [...departments].sort((a, b) => (a.name_th || '').localeCompare(b.name_th || '')), [departments]);

  // --- Filter + Search + Sort ---
  // --- Export ---
  const handleExport = () => {
    exportToExcel({
      data: filtered,
      columns: EXPORT_COLS,
      filename: 'UserManagement',
      sheetName: 'Employees',
    });
  };

  // --- Import ---
  const handleImport = async (mapped) => {
    let count = 0;
    for (const row of mapped) {
      if (!row.employee_code && !row.first_name_th) continue;
      // Check if employee exists by employee_code
      if (row.employee_code) {
        const existing = rawEmployees.find(e => e.employee_code === row.employee_code);
        if (existing) {
          // Update existing
          const { error } = await supabase.from('hr_employees').update(row).eq('id', existing.id);
          if (error) throw error;
          count++;
          continue;
        }
      }
      // Insert new
      const { error } = await supabase.from('hr_employees').insert({ ...row, status: 'active' });
      if (error) throw error;
      count++;
    }
    loadData();
    return count;
  };

  const filtered = useMemo(() => {
    let result = employees.filter(emp => {
      if (filterRole !== 'all' && emp.system_role !== filterRole) return false;
      if (filterDept !== 'all' && emp.department_id !== filterDept) return false;
      if (filterBU !== 'all' && (emp.bu || '') !== filterBU) return false;
      if (search) {
        const s = search.toLowerCase();
        const name = getEmpName(emp).toLowerCase();
        const code = (emp.employee_code || '').toLowerCase();
        const dept = getDeptName(emp.department_id).toLowerCase();
        const company = (emp.company_entity || '').toLowerCase();
        if (!name.includes(s) && !code.includes(s) && !dept.includes(s) && !company.includes(s)) return false;
      }
      return true;
    });
    // Sort
    if (sort.key) {
      result = [...result].sort((a, b) => {
        const va = getSortValue(a, sort.key);
        const vb = getSortValue(b, sort.key);
        if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va;
        return sort.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [employees, filterRole, filterDept, filterBU, search, sort, lang]);

  const stats = useMemo(() => ({
    total: employees.length,
    admin: employees.filter(e => e.system_role === 'admin').length,
    manager: employees.filter(e => e.system_role === 'manager').length,
    employee: employees.filter(e => e.system_role === 'employee').length,
  }), [employees]);

  const toggleSelect = (id) => { setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleSelectAll = () => { if (selectAll) { setSelectedIds(new Set()); setSelectAll(false); } else { setSelectedIds(new Set(filtered.map(e => e.id))); setSelectAll(true); } };

  const handleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const toggleColVisibility = (key) => {
    setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeColumns = COLUMNS.filter(col => visibleCols[col.key]);

  // --- Employee Form ---
  const EmployeeForm = ({ form, setForm, onSubmit, isSaving, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* ข้อมูลส่วนตัว */}
      <div className="border-b border-gray-200 pb-1 mb-2">
        <p className="text-xs font-bold text-[#78c045] uppercase tracking-wider">{lang === 'th' ? 'ข้อมูลส่วนตัว' : 'Personal Info'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Select label={lang === 'th' ? 'คำนำหน้า' : 'Prefix'} value={form.prefix_th} onChange={e => setForm({ ...form, prefix_th: e.target.value })}>
          <option value="นาย">นาย</option><option value="นาง">นาง</option><option value="นางสาว">นางสาว</option>
        </Select>
        <Input label={lang === 'th' ? 'ชื่อ (ไทย)' : 'First (TH)'} value={form.first_name_th} onChange={e => setForm({ ...form, first_name_th: e.target.value })} required />
        <Input label={lang === 'th' ? 'นามสกุล (ไทย)' : 'Last (TH)'} value={form.last_name_th} onChange={e => setForm({ ...form, last_name_th: e.target.value })} required />
        <Input label={lang === 'th' ? 'ชื่อเล่น' : 'Nickname'} value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Input label={lang === 'th' ? 'ชื่อ (EN)' : 'First (EN)'} value={form.first_name_en} onChange={e => setForm({ ...form, first_name_en: e.target.value })} />
        <Input label={lang === 'th' ? 'นามสกุล (EN)' : 'Last (EN)'} value={form.last_name_en} onChange={e => setForm({ ...form, last_name_en: e.target.value })} />
        <Input label={lang === 'th' ? 'อีเมล' : 'Email'} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input label={lang === 'th' ? 'เบอร์โทร' : 'Phone'} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Input label={lang === 'th' ? 'เลขบัตรประชาชน' : 'National ID'} value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
        <Input label={lang === 'th' ? 'วันเกิด' : 'Birth Date'} type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
        <Input label={lang === 'th' ? 'เลขผู้เสียภาษี' : 'Tax ID'} value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
      </div>
      <Input label={lang === 'th' ? 'ที่อยู่ตามทะเบียนบ้าน' : 'Registered Address'} value={form.registered_address} onChange={e => setForm({ ...form, registered_address: e.target.value })} />

      {/* ข้อมูลงาน */}
      <div className="border-b border-gray-200 pb-1 mb-2 mt-4">
        <p className="text-xs font-bold text-[#78c045] uppercase tracking-wider">{lang === 'th' ? 'ข้อมูลงาน' : 'Work Info'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <Input label={lang === 'th' ? 'รหัสพนักงาน' : 'Emp Code'} value={form.employee_code} onChange={e => setForm({ ...form, employee_code: e.target.value })} />
        <Select label={lang === 'th' ? 'บริษัท' : 'Company'} value={form.company_entity} onChange={e => setForm({ ...form, company_entity: e.target.value })}>
          <option value="">{lang === 'th' ? '— เลือก —' : '— Select —'}</option>
          {companyOptions.map(c => <option key={c.code} value={c.code}>{lang === 'th' ? (c.name_th || c.code) : (c.name_en || c.code)}</option>)}
        </Select>
        <Select label={lang === 'th' ? 'BU (หน่วยธุรกิจ)' : 'Business Unit'} value={form.bu} onChange={e => setForm({ ...form, bu: e.target.value })}>
          <option value="">{lang === 'th' ? '— เลือก —' : '— Select —'}</option>
          {BU_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Select label={lang === 'th' ? 'แผนก' : 'Department'} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
          <option value="">{lang === 'th' ? '— เลือก —' : '— Select —'}</option>
          {uniqueDepts.map(d => <option key={d.id} value={d.id}>{lang === 'th' ? d.name_th : (d.name_en || d.name_th)}</option>)}
        </Select>
        <Input label="Cost Center" value={form.cost_center} onChange={e => setForm({ ...form, cost_center: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Input label={lang === 'th' ? 'ตำแหน่ง (ไทย)' : 'Position (TH)'} value={form.position_th} onChange={e => setForm({ ...form, position_th: e.target.value })} />
        <Input label={lang === 'th' ? 'ตำแหน่ง (EN)' : 'Position (EN)'} value={form.position_en} onChange={e => setForm({ ...form, position_en: e.target.value })} />
        <Input label={lang === 'th' ? 'วันเริ่มงาน' : 'Hire Date'} type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Select label={lang === 'th' ? 'ประเภทพนักงาน' : 'Emp Type'} value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
          <option value="permanent">{lang === 'th' ? 'ประจำ' : 'Permanent'}</option>
          <option value="contract">{lang === 'th' ? 'สัญญาจ้าง' : 'Contract'}</option>
          <option value="part_time">Part-time</option>
        </Select>
        <Select label={lang === 'th' ? 'สิทธิ์ระบบ' : 'System Role'} value={form.system_role} onChange={e => setForm({ ...form, system_role: e.target.value })}>
          {ROLES.map(r => <option key={r.value} value={r.value}>{lang === 'th' ? r.labelTh : r.labelEn}</option>)}
        </Select>
      </div>

      {/* เงินเดือน & ธนาคาร */}
      <div className="border-b border-gray-200 pb-1 mb-2 mt-4">
        <p className="text-xs font-bold text-[#78c045] uppercase tracking-wider">{lang === 'th' ? 'เงินเดือน & ธนาคาร' : 'Salary & Bank'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Input label={lang === 'th' ? 'เงินเดือน' : 'Base Salary'} type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} />
        <Select label={lang === 'th' ? 'รอบเงินเดือน' : 'Pay Cycle'} value={form.payroll_cycle} onChange={e => setForm({ ...form, payroll_cycle: e.target.value })}>
          <option value="monthly">{lang === 'th' ? 'รายเดือน' : 'Monthly'}</option>
          <option value="biweekly">{lang === 'th' ? 'ราย 2 สัปดาห์' : 'Bi-weekly'}</option>
        </Select>
        <Input label={lang === 'th' ? 'ธนาคาร' : 'Bank'} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
        <Input label={lang === 'th' ? 'เลขที่บัญชี' : 'Account No.'} value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} />
      </div>

      {/* ประกันสังคม & ภาษี & กองทุน */}
      <div className="border-b border-gray-200 pb-1 mb-2 mt-4">
        <p className="text-xs font-bold text-[#78c045] uppercase tracking-wider">{lang === 'th' ? 'ประกันสังคม / ภาษี / กองทุน' : 'SSO / Tax / PVD'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Input label={lang === 'th' ? 'เลขประกันสังคม' : 'SSO No.'} value={form.social_security_no} onChange={e => setForm({ ...form, social_security_no: e.target.value })} />
        <Input label={lang === 'th' ? 'รพ.ประกันสังคม' : 'SSO Hospital'} value={form.sso_hospital} onChange={e => setForm({ ...form, sso_hospital: e.target.value })} />
        <Input label={lang === 'th' ? 'สถานะภาษี' : 'Tax Filing'} value={form.tax_filing_status} onChange={e => setForm({ ...form, tax_filing_status: e.target.value })} placeholder={lang === 'th' ? 'เช่น โสด/คู่สมรส' : 'e.g. Single/Married'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label={lang === 'th' ? 'กองทุนสำรองฯ (% พนักงาน)' : 'PVD Employee %'} type="number" value={form.pvd_employee_rate} onChange={e => setForm({ ...form, pvd_employee_rate: e.target.value })} />
      </div>

      {/* ผู้ติดต่อฉุกเฉิน */}
      <div className="border-b border-gray-200 pb-1 mb-2 mt-4">
        <p className="text-xs font-bold text-[#78c045] uppercase tracking-wider">{lang === 'th' ? 'ผู้ติดต่อฉุกเฉิน' : 'Emergency Contact'}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Input label={lang === 'th' ? 'ชื่อ' : 'Name'} value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
        <Input label={lang === 'th' ? 'เบอร์โทร' : 'Phone'} value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
        <Input label={lang === 'th' ? 'ความสัมพันธ์' : 'Relation'} value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} placeholder={lang === 'th' ? 'เช่น บิดา/มารดา' : 'e.g. Father/Mother'} />
      </div>

      <div className="flex gap-2 pt-4 sticky bottom-0 bg-white py-3 border-t border-gray-100">
        <Button type="submit" disabled={isSaving} className="flex-1">{isSaving ? '...' : submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1">{L.cancel}</Button>
      </div>
    </form>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label={L.totalEmployees} value={stats.total} color="indigo" />
        <StatCard icon={ShieldAlert} label={L.admins} value={stats.admin} color="purple" />
        <StatCard icon={ShieldCheck} label={L.managers} value={stats.manager} color="blue" />
        <StatCard icon={UserCog} label={L.employeesLabel} value={stats.employee} color="green" />
      </div>

      {/* Alerts */}
      {error && (
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

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
          <div className="w-full sm:w-64">
            <SearchInput value={search} onChange={setSearch} placeholder={L.searchPlaceholder} />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none bg-white">
            <option value="all">{L.allRoles}</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{lang === 'th' ? r.labelTh : r.labelEn}</option>)}
          </select>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none bg-white max-w-xs">
            <option value="all">{L.allDepts}</option>
            {uniqueDepts.map(d => <option key={d.id} value={d.id}>{lang === 'th' ? d.name_th : (d.name_en || d.name_th)}</option>)}
          </select>
          <select value={filterBU} onChange={e => setFilterBU(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none bg-white max-w-xs">
            <option value="all">{lang === 'th' ? 'ทุก BU' : 'All BU'}</option>
            {BU_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {/* Column picker */}
          <div className="relative">
            <Button variant="secondary" onClick={() => setShowColPicker(!showColPicker)}>
              {showColPicker ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {L.columns} ({activeColumns.length})
            </Button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 w-64 max-h-80 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-2">{lang === 'th' ? 'เลือกคอลัมน์ที่จะแสดง' : 'Choose visible columns'}</p>
                {COLUMNS.map(col => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-1">
                    <input type="checkbox" checked={!!visibleCols[col.key]} onChange={() => toggleColVisibility(col.key)} className="rounded border-gray-300 text-[#78c045] focus:ring-[#78c045]" />
                    <span className="text-xs text-gray-700">{lang === 'th' ? col.thLabel : col.enLabel}</span>
                    {col.sensitive && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">sensitive</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
              <Shield className="w-4 h-4" />{L.bulkUpdate} ({selectedIds.size})
            </Button>
          )}
          <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImportModal(true)} lang={lang} />
          <Button onClick={openAddModal}><UserPlus className="w-4 h-4" />{L.addEmployee}</Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-2.5 px-2 text-left w-8 sticky left-0 bg-gray-50/95 z-10">
                  <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded border-gray-300 text-[#78c045] focus:ring-[#78c045]" />
                </th>
                {activeColumns.map(col => (
                  <th key={col.key} className={`py-2.5 px-2 text-left font-medium text-gray-500 text-[10px] uppercase tracking-wider cursor-pointer hover:text-[#5a9030] select-none ${col.key === 'employee_code' ? 'sticky left-8 bg-gray-50/95 z-10' : ''}`}
                    onClick={() => handleSort(col.key)}>
                    {lang === 'th' ? col.thLabel : col.enLabel}
                    <SortIcon sortKey={col.key} currentSort={sort} />
                  </th>
                ))}
                <th className="py-2.5 px-2 text-left font-medium text-gray-500 text-[10px] uppercase tracking-wider">{lang === 'th' ? 'สิทธิ์' : 'Role'}</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={activeColumns.length + 3} className="text-center py-8 text-gray-400">{L.noData}</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.has(emp.id) ? 'bg-[#f0f9e8]/50' : ''}`}>
                  <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                    <input type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => toggleSelect(emp.id)} className="rounded border-gray-300 text-[#78c045] focus:ring-[#78c045]" />
                  </td>
                  {activeColumns.map(col => (
                    <td key={col.key} className={`py-1.5 px-2 text-xs text-gray-700 max-w-[200px] truncate ${col.key === 'employee_code' ? 'sticky left-8 bg-white z-10 font-mono text-gray-500' : ''} ${col.key === 'full_name' ? 'font-medium text-gray-900' : ''}`}
                      title={getCellValue(emp, col.key)}>
                      {getCellValue(emp, col.key)}
                    </td>
                  ))}
                  <td className="py-1.5 px-2">
                    <select value={emp.system_role} onChange={e => handleRoleChange(emp.id, e.target.value)} disabled={saving[emp.id]}
                      className={`text-[10px] font-semibold rounded-md px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-[#78c045] outline-none appearance-none pr-5 ${
                        emp.system_role === 'superuser' ? 'bg-red-100 text-red-700'
                        : emp.system_role === 'admin' ? 'bg-purple-100 text-purple-700'
                        : emp.system_role === 'manager' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                      } ${saving[emp.id] ? 'opacity-50' : ''}`}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{lang === 'th' ? r.labelTh : r.labelEn}</option>)}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => openEditModal(emp)} className="p-1 rounded-lg hover:bg-[#f0f9e8] text-gray-400 hover:text-[#5a9030] transition-colors" title={lang === 'th' ? 'แก้ไข' : 'Edit'}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openResetPwModal(emp)} className="p-1 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors" title={lang === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password'}>
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
          <span>{lang === 'th' ? `แสดง ${filtered.length} จาก ${employees.length} คน` : `Showing ${filtered.length} of ${employees.length}`}</span>
          <span>{lang === 'th' ? `${activeColumns.length} คอลัมน์` : `${activeColumns.length} columns`}</span>
        </div>
      </Card>

      {/* Add Employee Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={L.addEmployee} wide>
        <EmployeeForm form={addForm} setForm={setAddForm} onSubmit={handleAddEmployee} isSaving={addSaving} submitLabel={L.addEmployee} />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title={L.editEmployee} wide>
        <EmployeeForm form={editForm} setForm={setEditForm} onSubmit={handleEditEmployee} isSaving={editSaving} submitLabel={L.save} />
      </Modal>

      {/* Bulk Update Modal */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title={L.bulkUpdate}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{lang === 'th' ? 'เลือกแล้ว' : 'Selected'} <strong>{selectedIds.size}</strong> {L.persons}</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{L.setAs}</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setBulkRole(r.value)}
                  className={`flex-1 px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    bulkRole === r.value
                      ? r.value === 'superuser' ? 'border-red-500 bg-red-50 text-red-700'
                        : r.value === 'admin' ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : r.value === 'manager' ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}>
                  <div className="text-center">{lang === 'th' ? r.labelTh : r.labelEn}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleBulkUpdate} disabled={saving._bulk} className="flex-1">
              <Save className="w-4 h-4" />{saving._bulk ? '...' : L.bulkConfirm}
            </Button>
            <Button variant="secondary" onClick={() => setShowBulkModal(false)} className="flex-1">{L.cancel}</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      {showResetPwModal && resetPwTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowResetPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                {lang === 'th' ? 'ตั้งรหัสผ่าน' : 'Set Password'}
              </h3>
              <button onClick={() => setShowResetPwModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800">{`${resetPwTarget.first_name_th || ''} ${resetPwTarget.last_name_th || ''}`.trim()}</p>
                <p className="text-xs text-gray-400">{resetPwTarget.employee_code} · {resetPwTarget.email || (lang === 'th' ? 'ไม่มีอีเมล' : 'No email')}</p>
                {resetPwTarget.userProfile ? (
                  <span className="inline-block mt-1 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{lang === 'th' ? 'มีบัญชีแล้ว' : 'Has Account'}</span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{lang === 'th' ? 'ยังไม่มีบัญชี — จะสร้างใหม่' : 'No account — will create'}</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}</label>
                <div className="relative">
                  <input type={resetPwShow ? 'text' : 'password'} value={resetPwValue} onChange={e => setResetPwValue(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none pr-9" placeholder="••••••" />
                  <button type="button" onClick={() => setResetPwShow(!resetPwShow)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {resetPwShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleResetPassword} disabled={resetPwSaving || !resetPwValue}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {resetPwSaving ? <><RefreshCw className="w-4 h-4 animate-spin" />{lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</> : <><Key className="w-4 h-4" />{lang === 'th' ? (resetPwTarget.userProfile ? 'รีเซ็ตรหัสผ่าน' : 'สร้างบัญชี') : (resetPwTarget.userProfile ? 'Reset Password' : 'Create Account')}</>}
                </button>
                <button onClick={() => setShowResetPwModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium transition-colors">
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        columns={IMPORT_COLS}
        tableName="Employees"
        lang={lang}
      />

      {/* Click outside to close column picker */}
      {showColPicker && <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />}
    </div>
  );
}

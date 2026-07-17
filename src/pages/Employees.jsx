import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  Building,
  UserPlus,
  Upload,
  Download,
  Check,
  X,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { PageHeader, KPICard, Section, DetailPanel, Avatar, StatusBadge, TabPills } from '../components/PageUI';
import { fmt, fmtDate, insertRow, updateRow, deleteRow, bulkInsert } from '../lib/hooks';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// คำนวณสถานะการแสดงผล — ออกระหว่างทดลองงาน ถ้า resign/terminate ภายใน 90 วัน
function empStatus(emp) {
  if (['resigned', 'terminated'].includes(emp.status)) {
    const hd = emp.hire_date        ? new Date(emp.hire_date)        : null
    const rd = emp.resignation_date ? new Date(emp.resignation_date) : null
    if (hd && rd && (rd - hd) < 90 * 864e5) return 'probation_leaver'
  }
  return emp.status
}

// Collapsible table for resigned / terminated employees
function InactiveTable({ employees, total, searchTerm, onSelect, selectedId, visibleColumns, allColumns, statusLabels, empTypeLabels, getEmployeeName, formatThaiDate }) {
  const [open, setOpen] = useState(false);
  const statusColor = { resigned: 'bg-red-100 text-red-700', terminated: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
      {/* Header — click to toggle */}
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 bg-red-50 hover:bg-red-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-red-400" />
          <span className="font-semibold text-red-700 text-sm">พนักงานที่ลาออก / พ้นสภาพ</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">{total} คน</span>
          {searchTerm && employees.length !== total && (
            <span className="text-xs text-red-400">(แสดง {employees.length} จาก {total})</span>
          )}
        </div>
        <span className="text-red-400 text-xs">{open ? '▲ ซ่อน' : '▼ แสดง'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ไม่พบข้อมูล</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-red-100 bg-red-50/60">
                  {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => (
                    <th key={col.key} className="px-4 py-3 text-left font-semibold text-red-400 whitespace-nowrap text-xs uppercase tracking-wide">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const cellMap = {
                    employee_code: <td key="employee_code" className="px-4 py-3 text-gray-500 font-mono text-xs">{emp.employee_code}</td>,
                    name: <td key="name" className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={getEmployeeName(emp)} size="sm" /><span className="text-gray-500">{getEmployeeName(emp)}</span></div></td>,
                    national_id: <td key="national_id" className="px-4 py-3 text-gray-400 text-xs font-mono">{emp.national_id || '-'}</td>,
                    date_of_birth: <td key="date_of_birth" className="px-4 py-3 text-gray-400 text-xs">{formatThaiDate(emp.date_of_birth)}</td>,
                    address: <td key="address" className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{emp.address || '-'}</td>,
                    hire_date: <td key="hire_date" className="px-4 py-3 text-gray-400 text-xs">{formatThaiDate(emp.hire_date)}</td>,
                    contract_end_date: <td key="contract_end_date" className="px-4 py-3 text-gray-400 text-xs">{formatThaiDate(emp.contract_end_date)}</td>,
                    employment_type: <td key="employment_type" className="px-4 py-3"><StatusBadge status={emp.employment_type} labels={empTypeLabels} /></td>,
                    company_entity: <td key="company_entity" className="px-4 py-3 text-gray-400 text-xs">{emp.company_entity || '-'}</td>,
                    bu: <td key="bu" className="px-4 py-3 text-gray-400 text-xs">{emp.bu || '-'}</td>,
                    department: <td key="department" className="px-4 py-3 text-gray-400 text-xs">{emp.department_name_th || '-'}</td>,
                    position: <td key="position" className="px-4 py-3 text-gray-400">{emp.position_th || '-'}</td>,
                    cost_center: <td key="cost_center" className="px-4 py-3 text-gray-400 text-xs">{emp.cost_center || '-'}</td>,
                    level: <td key="level" className="px-4 py-3 text-gray-400 text-xs">{emp.level || '-'}</td>,
                    status: <td key="status" className="px-4 py-3"><StatusBadge status={empStatus(emp)} labels={statusLabels} /></td>,
                    phone: <td key="phone" className="px-4 py-3 text-gray-400 text-xs">{emp.phone || '-'}</td>,
                    email: <td key="email" className="px-4 py-3 text-gray-400 text-xs">{emp.email || '-'}</td>,
                    bank_name: <td key="bank_name" className="px-4 py-3 text-gray-400 text-xs">{emp.bank_name || '-'}</td>,
                    bank_account: <td key="bank_account" className="px-4 py-3 text-gray-400 text-xs font-mono">{emp.bank_account || '-'}</td>,
                  };
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => onSelect(emp)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedId === emp.id ? 'bg-red-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => cellMap[col.key])}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function Employees({ lang }) {
  const { canViewSalary } = useAuth();
  const { filterByCompany } = useCompanyFilter();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const importFileRef = React.useRef(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = React.useRef(null);

  const allColumns = [
    { key: 'employee_code', label: 'รหัสพนักงาน', default: true },
    { key: 'name', label: 'ชื่อ-นามสกุล', default: true },
    { key: 'national_id', label: 'เลขบัตรประชาชน', sensitive: true, default: false },
    { key: 'date_of_birth', label: 'วันเกิด', default: false },
    { key: 'address', label: 'ที่อยู่ทะเบียนบ้าน', default: false },
    { key: 'hire_date', label: 'วันที่เริ่มงาน', default: true },
    { key: 'contract_end_date', label: 'ครบกำหนดสัญญา', default: true },
    { key: 'employment_type', label: 'ประเภทพนักงาน', default: true },
    { key: 'company_entity', label: 'บริษัท', default: true },
    { key: 'bu', label: 'BU', default: true },
    { key: 'department', label: 'แผนก', default: true },
    { key: 'position', label: 'ตำแหน่ง', default: true },
    { key: 'cost_center', label: 'Cost Center', default: false },
    { key: 'level', label: 'ระดับ', default: false },
    { key: 'status', label: 'สถานะ', default: true },
    { key: 'phone', label: 'เบอร์โทร', default: false },
    { key: 'email', label: 'อีเมล', default: false },
    { key: 'bank_name', label: 'ธนาคาร', default: false },
    { key: 'bank_account', label: 'เลขบัญชี', sensitive: true, default: false },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => allColumns.filter(c => c.default).map(c => c.key));

  const toggleColumn = (key) => {
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const selectAllColumns = () => setVisibleColumns(allColumns.map(c => c.key));
  const deselectAllColumns = () => setVisibleColumns(['employee_code', 'name']);

  // Fetch employees and departments
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchCompanies();
  }, []);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(e.target)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .order('employee_code', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_departments')
        .select('*')
        .order('name_en', { ascending: true });

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_companies')
        .select('id, code, name_th, name_en')
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  function getEmptyFormData() {
    return {
      employee_code: '',
      prefix_th: '',
      first_name_th: '',
      last_name_th: '',
      first_name_en: '',
      last_name_en: '',
      nickname: '',
      gender: 'M',
      date_of_birth: '',
      phone: '',
      email: '',
      department_id: '',
      position_th: '',
      level: 'junior',
      employment_type: 'permanent',
      hire_date: '',
      contract_end_date: '',
      status: 'active',
      base_salary: '',
      position_allowance: '',
      transport_allowance: '',
      housing_allowance: '',
      sso_rate: 5,
      pvd_employee_rate: '',
      pvd_employer_rate: '',
      bank_name: '',
      bank_account: '',
      company_entity: '',
    };
  }

  const getEmployeeName = (emp) => {
    if (!emp) return '-';
    let name = '';
    if (lang === 'th') {
      name = `${emp.prefix_th || ''} ${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
    } else {
      name = `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim();
    }
    if (emp.nickname) name += ` (${emp.nickname})`;
    return name || '-';
  };

  const formatThaiDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setFormData(getEmptyFormData());
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setSelectedEmployee(emp);
    setFormData({ ...emp });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.employee_code?.trim()) errors.employee_code = 'Required';
    if (!formData.first_name_th?.trim()) errors.first_name_th = 'Required';
    if (!formData.last_name_th?.trim()) errors.last_name_th = 'Required';
    if (!formData.first_name_en?.trim()) errors.first_name_en = 'Required';
    if (!formData.last_name_en?.trim()) errors.last_name_en = 'Required';
    if (!formData.department_id) errors.department_id = 'Required';
    if (!formData.hire_date) errors.hire_date = 'Required';
    if (formData.base_salary && isNaN(parseFloat(formData.base_salary))) {
      errors.base_salary = 'Must be a number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : null,
        position_allowance: formData.position_allowance ? parseFloat(formData.position_allowance) : null,
        transport_allowance: formData.transport_allowance ? parseFloat(formData.transport_allowance) : null,
        housing_allowance: formData.housing_allowance ? parseFloat(formData.housing_allowance) : null,
        sso_rate: formData.sso_rate ? parseFloat(formData.sso_rate) : 5,
        pvd_employee_rate: formData.pvd_employee_rate ? parseFloat(formData.pvd_employee_rate) : null,
        pvd_employer_rate: formData.pvd_employer_rate ? parseFloat(formData.pvd_employer_rate) : null,
      };

      if (selectedEmployee?.id) {
        await updateRow('hr_employees', selectedEmployee.id, payload);
      } else {
        await insertRow('hr_employees', payload);
      }

      setShowEditModal(false);
      setShowAddModal(false);
      setSelectedEmployee(null);
      setFormData(getEmptyFormData());
      await fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (emp) => {
    try {
      await deleteRow('hr_employees', emp.id);
      setSelectedEmployee(null);
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const openWithData = (rows) => {
      const filtered = rows.filter((row) => Object.values(row).some((v) => v));
      setImportData(filtered);
      setImportMapping({});
      setShowImportModal(true);
    };

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: (results) => openWithData(results.data),
        error: (error) => {
          console.error('CSV parse error:', error);
          alert('ไม่สามารถอ่านไฟล์ CSV ได้: ' + error.message);
        },
      });
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    ) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        openWithData(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('กรุณาเลือกไฟล์ CSV หรือ Excel (.xlsx)');
    }
  };

  const handleMappingChange = (fileColumn, dbColumn) => {
    setImportMapping((prev) => ({
      ...prev,
      [fileColumn]: dbColumn,
    }));
  };

  const handleConfirmImport = async () => {
    if (importData.length === 0) {
      alert('No data to import');
      return;
    }

    const mappedData = importData.map((row) => {
      const mapped = {};
      Object.entries(importMapping).forEach(([fileCol, dbCol]) => {
        if (dbCol && row[fileCol] !== undefined && row[fileCol] !== '') {
          mapped[dbCol] = row[fileCol];
        }
      });
      return mapped;
    });

    try {
      await bulkInsert('hr_employees', mappedData);
      setShowImportModal(false);
      setImportData([]);
      setImportMapping({});
      await fetchEmployees();
      alert('Import successful!');
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Import failed: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = d.name_th || d.name_en; });

    const LEVEL_LABEL = { c_level: 'C-Level', director: 'Director', manager: 'Manager', lead: 'Lead', senior: 'Senior', junior: 'Staff' };
    const GENDER_LABEL = { male: 'ชาย', female: 'หญิง', M: 'ชาย', F: 'หญิง' };
    const EMPTYPE_LABEL = { permanent: 'พนักงานประจำ', contract: 'พนักงานสัญญาจ้าง', probation: 'พนักงานทดลองงาน', freelance: 'ฟรีแลนซ์', temporary: 'พนักงานชั่วคราว' };
    const STATUS_LABEL = { active: 'ทำงานอยู่', probation: 'ทดลองงาน', resigned: 'ลาออก', terminated: 'พ้นสภาพ', probation_leaver: 'ออกระหว่างทดลองงาน' };

    const exportRows = filteredEmployees.map((emp) => ({
      'รหัสพนักงาน': emp.employee_code || '',
      'คำนำหน้า': emp.prefix_th || '',
      'ชื่อ (ไทย)': emp.first_name_th || '',
      'นามสกุล (ไทย)': emp.last_name_th || '',
      'ชื่อ (English)': emp.first_name_en || '',
      'นามสกุล (English)': emp.last_name_en || '',
      'ชื่อเล่น': emp.nickname || '',
      'เพศ': GENDER_LABEL[emp.gender] || emp.gender || '',
      'วันเกิด': emp.date_of_birth || '',
      'โทรศัพท์': emp.phone || '',
      'อีเมล': emp.email || '',
      'แผนก': deptMap[emp.department_id] || emp.department_id || '',
      'ตำแหน่ง': emp.position_th || '',
      'ระดับ': LEVEL_LABEL[emp.level] || emp.level || '',
      'บริษัทที่สังกัด': emp.company_entity || '',
      'ประเภทพนักงาน': EMPTYPE_LABEL[emp.employment_type] || emp.employment_type || '',
      'วันเริ่มงาน': emp.hire_date || '',
      'สถานะ': STATUS_LABEL[empStatus(emp)] || empStatus(emp) || '',
      ...(canViewSalary ? { 'เงินเดือน': emp.base_salary || '' } : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const colWidths = Object.keys(exportRows[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 14) }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'พนักงาน');
    XLSX.writeFile(wb, `EFIN-Employees-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    const headers = ['รหัสพนักงาน', 'ชื่อ (ไทย)', 'นามสกุล (ไทย)', 'ชื่อ (English)', 'นามสกุล (English)', 'ตำแหน่ง', 'ระดับ (Job Grade)', 'เพศ', 'แผนก', 'บริษัทที่สังกัด', 'ประเภทพนักงาน', 'วันเริ่มงาน (YYYY-MM-DD)'];
    const example = ['EMP001', 'สมชาย', 'ใจดี', 'Somchai', 'Jaidee', 'Software Developer', 'Staff', 'ชาย', 'ฝ่ายนวัตกรรมและเทคโนโลยีสารสนเทศ', 'บริษัท ออนไลน์แอสเซ็ท จำกัด', 'พนักงานประจำ', '2026-05-01'];
    const wsData = [headers, example];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'นำเข้าพนักงาน');

    const refData = [
      ['ระดับ (Job Grade)', 'เพศ', 'แผนก', 'บริษัท', 'ประเภทพนักงาน'],
      ['C-Level', 'ชาย', 'ฝ่ายบัญชีและการเงิน', 'บริษัท ออนไลน์แอสเซ็ท จำกัด', 'พนักงานประจำ'],
      ['Director', 'หญิง', 'ฝ่ายบริหารองค์กรและทรัพยากรบุคคล', 'บริษัท สมาร์ท เมดเทค จำกัด', 'พนักงานสัญญาจ้าง'],
      ['Manager', '', 'ฝ่ายกลยุทธ์และพัฒนาธุรกิจ', 'บริษัท เอเทสส์ (ประเทศไทย) จำกัด', 'พนักงานทดลองงาน'],
      ['Lead', '', 'ฝ่ายออกแบบสร้างสรรค์และผลิตสื่อมัลติมีเดีย', 'บริษัท อีฟิน เอ็กซ์ เพิร์ท จำกัด', 'ฟรีแลนซ์'],
      ['Senior', '', 'ฝ่ายพัฒนาความสัมพันธ์และการมีส่วนร่วมของชุมชน', '', ''],
      ['Staff', '', 'ฝ่ายนักลงทุนสัมพันธ์และการสื่อสารองค์กร', '', ''],
      ['', '', 'ฝ่ายนวัตกรรมและเทคโนโลยีสารสนเทศ', '', ''],
      ['', '', 'ฝ่ายพัฒนาซอฟต์แวร์ระบบซื้อขายหลักทรัพย์', '', ''],
      ['', '', 'ฝ่ายนวัตกรรมและเทคโนโลยีสารสนเทศ-Green', '', ''],
      ['', '', 'ฝ่ายปฏิบัติการไอทีและความมั่นคงปลอดภัยทางไซเบอร์', '', ''],
      ['', '', 'ฝ่ายการตลาดและการสื่อสาร', '', ''],
      ['', '', 'ฝ่ายข่าวและดิจิทัล คอนเทนต์', '', ''],
      ['', '', 'ฝ่ายขาย', '', ''],
    ];
    const refWs = XLSX.utils.aoa_to_sheet(refData);
    refWs['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 40 }, { wch: 32 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, refWs, 'ข้อมูลอ้างอิง');

    XLSX.writeFile(wb, 'EFIN-Import-Template.xlsx');
  };

  const handleImportTemplate = async () => {
    if (importData.length === 0) return;

    const deptLookup = {};
    departments.forEach(d => {
      if (d.name_th) deptLookup[d.name_th] = d.id;
      if (d.name_en) deptLookup[d.name_en] = d.id;
    });

    const LEVEL_MAP_TH = { 'C-Level': 'c_level', 'Director': 'director', 'Manager': 'manager', 'Lead': 'lead', 'Senior': 'senior', 'Staff': 'junior' };
    const GENDER_MAP_TH = { 'ชาย': 'male', 'หญิง': 'female' };
    const EMPTYPE_MAP_TH = { 'พนักงานประจำ': 'permanent', 'พนักงานสัญญาจ้าง': 'contract', 'พนักงานทดลองงาน': 'probation', 'ฟรีแลนซ์': 'freelance' };

    const mappedData = importData.map(row => {
      const mapped = {};
      if (row['รหัสพนักงาน']) mapped.employee_code = String(row['รหัสพนักงาน']);
      if (row['ชื่อ (ไทย)']) mapped.first_name_th = row['ชื่อ (ไทย)'];
      if (row['นามสกุล (ไทย)']) mapped.last_name_th = row['นามสกุล (ไทย)'];
      if (row['ชื่อ (English)']) mapped.first_name_en = row['ชื่อ (English)'];
      if (row['นามสกุล (English)']) mapped.last_name_en = row['นามสกุล (English)'];
      if (row['ตำแหน่ง']) mapped.position_th = row['ตำแหน่ง'];
      if (row['ระดับ (Job Grade)']) mapped.level = LEVEL_MAP_TH[row['ระดับ (Job Grade)']] || 'junior';
      if (row['เพศ']) mapped.gender = GENDER_MAP_TH[row['เพศ']] || row['เพศ'];
      if (row['แผนก']) mapped.department_id = deptLookup[row['แผนก']] || null;
      if (row['บริษัทที่สังกัด']) mapped.company_entity = row['บริษัทที่สังกัด'];
      if (row['ประเภทพนักงาน']) mapped.employment_type = EMPTYPE_MAP_TH[row['ประเภทพนักงาน']] || 'permanent';
      if (row['วันเริ่มงาน (YYYY-MM-DD)']) mapped.hire_date = row['วันเริ่มงาน (YYYY-MM-DD)'];
      mapped.status = 'active';
      return mapped;
    }).filter(r => r.first_name_th || r.first_name_en);

    if (mappedData.length === 0) {
      alert('ไม่พบข้อมูลที่จะนำเข้า');
      return;
    }

    try {
      setIsSubmitting(true);
      await bulkInsert('hr_employees', mappedData);
      setShowImportModal(false);
      setImportData([]);
      await fetchEmployees();
      alert(`นำเข้าสำเร็จ ${mappedData.length} คน`);
    } catch (error) {
      console.error('Error importing:', error);
      alert('นำเข้าไม่สำเร็จ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Apply global company filter first
  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany]);

  // Split: active (active/probation) vs inactive (resigned/terminated)
  const ACTIVE_STATUSES = ['active', 'probation'];
  const INACTIVE_STATUSES = ['resigned', 'terminated'];
  const activeEmployees   = useMemo(() => companyFilteredEmployees.filter(e => ACTIVE_STATUSES.includes(e.status)), [companyFilteredEmployees]);
  const inactiveEmployees = useMemo(() => companyFilteredEmployees.filter(e => INACTIVE_STATUSES.includes(e.status)), [companyFilteredEmployees]);

  // KPI from active employees only
  const totalEmployees = activeEmployees.length;
  const fullTimeCount  = activeEmployees.filter(e => e.employment_type === 'permanent' || e.employment_type === 'fulltime').length;
  const deptCount      = new Set(activeEmployees.map(e => e.department_name_th).filter(Boolean)).size;
  const thisMonth      = new Date();
  const newHireCount   = activeEmployees.filter(e => {
    if (!e.hire_date) return false;
    const hireDate = new Date(e.hire_date);
    return hireDate.getMonth() === thisMonth.getMonth() && hireDate.getFullYear() === thisMonth.getFullYear();
  }).length;

  // Filter active table
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        emp.employee_code?.toLowerCase().includes(searchLower) ||
        emp.first_name_th?.toLowerCase().includes(searchLower) ||
        emp.last_name_th?.toLowerCase().includes(searchLower) ||
        emp.first_name_en?.toLowerCase().includes(searchLower) ||
        emp.last_name_en?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower);

      const matchesDept = filterDept === 'all' || emp.department_name_th === filterDept;
      const matchesType = filterType === 'all' || emp.employment_type === filterType;

      return matchesSearch && matchesDept && matchesType;
    }).sort((a, b) => (a.employee_code || '').localeCompare(b.employee_code || ''));
  }, [activeEmployees, searchTerm, filterDept, filterType]);

  // Filter inactive table (search only)
  const filteredInactive = useMemo(() => {
    if (!searchTerm) return inactiveEmployees;
    const s = searchTerm.toLowerCase();
    return inactiveEmployees.filter(emp =>
      emp.employee_code?.toLowerCase().includes(s) ||
      emp.first_name_th?.toLowerCase().includes(s) ||
      emp.last_name_th?.toLowerCase().includes(s) ||
      emp.first_name_en?.toLowerCase().includes(s) ||
      emp.last_name_en?.toLowerCase().includes(s)
    );
  }, [inactiveEmployees, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="ข้อมูลพนักงาน" subtitle="efin HRS" lang={lang} />
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  const empTypeLabels = {
    permanent: 'ประจำ',
    contract: 'สัญญาจ้าง',
    outsource: 'Outsource',
    temporary: 'ชั่วคราว',
    freelance: 'ฟรีแลนซ์',
  };

  const statusLabels = {
    active: 'ทำงาน',
    probation: 'ทดลองงาน',
    resigned: 'ลาออก',
    terminated: 'พ้นสภาพ',
    probation_leaver: 'ออกระหว่างทดลองงาน',
  };

  return (
    <div className="space-y-5">
      <PageHeader title="ข้อมูลพนักงาน" subtitle="efin HRS" lang={lang} />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        <KPICard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label="จำนวนพนักงานทั้งหมด" value={totalEmployees} />
        <KPICard icon={UserCheck} iconBg="bg-green-100" iconColor="text-green-600" label="พนักงานประจำ" value={fullTimeCount} />
        <KPICard icon={Building} iconBg="bg-purple-100" iconColor="text-purple-600" label="แผนก/ฝ่าย" value={deptCount} />
        <KPICard icon={UserPlus} iconBg="bg-orange-100" iconColor="text-orange-600" label="พนักงานใหม่เดือนนี้" value={newHireCount} />
      </div>

      {/* Tab Pills — active employees only */}
      <Section>
        <TabPills
          tabs={[
            { key: 'all', label: 'ทั้งหมด', count: activeEmployees.length },
            { key: 'permanent', label: 'ประจำ', count: activeEmployees.filter(e => e.employment_type === 'permanent').length },
            { key: 'contract', label: 'สัญญาจ้าง', count: activeEmployees.filter(e => e.employment_type === 'contract').length },
            { key: 'outsource', label: 'Outsource', count: activeEmployees.filter(e => e.employment_type === 'outsource').length },
          ]}
          active={filterType}
          onChange={(key) => {
            if (key === 'all') {
              setFilterType('all');
            } else {
              setFilterType(key);
            }
          }}
        />
      </Section>

      {/* Search and Filters */}
      <Section>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหารหัส, ชื่อ, อีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
              />
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#78c045] text-white rounded-lg font-medium text-sm hover:bg-[#5a9030] transition-colors flex items-center gap-2"
            >
              <Plus size={16} /> เพิ่มพนักงาน
            </button>
            <button
              onClick={() => importFileRef.current?.click()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Upload size={16} /> Import
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                handleImportFile(e);
                e.target.value = '';
              }}
              className="hidden"
            />
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Download size={16} /> Export
            </button>
            <div className="relative" ref={columnSelectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Eye size={16} /> คอลัมน์ ({visibleColumns.length})
              </button>
              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-64 py-2">
                  <p className="px-4 py-1 text-xs text-gray-500 font-medium">เลือกคอลัมน์ที่จะแสดง</p>
                  <div className="px-4 py-1.5 flex gap-2 border-b border-gray-100 mb-1">
                    <button onClick={selectAllColumns} className="text-xs text-[#78c045] hover:text-[#5a9030] font-medium flex items-center gap-1">
                      <CheckSquare size={12} /> เลือกทั้งหมด
                    </button>
                    <button onClick={deselectAllColumns} className="text-xs text-gray-500 hover:text-gray-700 font-medium">ล้าง</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {allColumns.map(col => (
                      <label key={col.key} className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 rounded border-gray-300 text-[#78c045] focus:ring-[#78c045]"
                        />
                        <span className="text-sm text-gray-700">{col.label}</span>
                        {col.sensitive && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">sensitive</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
            >
              <option value="all">แผนก/ฝ่าย ทั้งหมด</option>
              {[...new Set(activeEmployees.map(e => e.department_name_th).filter(Boolean))].sort().map((dname) => (
                <option key={dname} value={dname}>{dname}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Main Content: Table */}
      <Section noPad>
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>ไม่พบข้อมูลพนักงาน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#c6e8a3] bg-[#f0f9e8]">
                  {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => (
                    <th key={col.key} className="px-4 py-3 text-left font-semibold text-[#5a9030] whitespace-nowrap text-xs uppercase tracking-wide">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const dept = departments.find(d => d.id === emp.department_id);
                  const cellMap = {
                    employee_code: <td key="employee_code" className="px-4 py-3 text-gray-700 font-medium font-mono text-xs">{emp.employee_code}</td>,
                    name: <td key="name" className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={getEmployeeName(emp)} size="sm" /><span className="text-gray-800">{getEmployeeName(emp)}</span></div></td>,
                    national_id: <td key="national_id" className="px-4 py-3 text-gray-600 text-xs font-mono">{emp.national_id || '-'}</td>,
                    date_of_birth: <td key="date_of_birth" className="px-4 py-3 text-gray-600 text-xs">{formatThaiDate(emp.date_of_birth)}</td>,
                    address: <td key="address" className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{emp.address || '-'}</td>,
                    hire_date: <td key="hire_date" className="px-4 py-3 text-gray-600 text-xs">{formatThaiDate(emp.hire_date)}</td>,
                    contract_end_date: <td key="contract_end_date" className="px-4 py-3 text-xs">{emp.contract_end_date ? <span className={`font-medium ${new Date(emp.contract_end_date) < new Date() ? 'text-red-500' : new Date(emp.contract_end_date) - new Date() < 90*24*60*60*1000 ? 'text-orange-500' : 'text-gray-600'}`}>{formatThaiDate(emp.contract_end_date)}</span> : <span className="text-gray-300">-</span>}</td>,
                    employment_type: <td key="employment_type" className="px-4 py-3"><StatusBadge status={emp.employment_type} labels={empTypeLabels} /></td>,
                    company_entity: <td key="company_entity" className="px-4 py-3 text-gray-600 text-xs">{emp.company_entity || '-'}</td>,
                    bu: <td key="bu" className="px-4 py-3 text-gray-600 text-xs">{emp.bu || '-'}</td>,
                    department: <td key="department" className="px-4 py-3 text-gray-600 text-xs">{emp.department_name_th || '-'}</td>,
                    position: <td key="position" className="px-4 py-3 text-gray-600">{emp.position_th || '-'}</td>,
                    cost_center: <td key="cost_center" className="px-4 py-3 text-gray-600 text-xs">{emp.cost_center || '-'}</td>,
                    level: <td key="level" className="px-4 py-3 text-gray-600 text-xs">{emp.level || '-'}</td>,
                    status: <td key="status" className="px-4 py-3"><StatusBadge status={empStatus(emp)} labels={statusLabels} /></td>,
                    phone: <td key="phone" className="px-4 py-3 text-gray-600 text-xs">{emp.phone || '-'}</td>,
                    email: <td key="email" className="px-4 py-3 text-gray-600 text-xs">{emp.email || '-'}</td>,
                    bank_name: <td key="bank_name" className="px-4 py-3 text-gray-600 text-xs">{emp.bank_name || '-'}</td>,
                    bank_account: <td key="bank_account" className="px-4 py-3 text-gray-600 text-xs font-mono">{emp.bank_account || '-'}</td>,
                  };
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedEmployee?.id === emp.id ? 'bg-[#f0f9e8]' : 'hover:bg-gray-50'
                      }`}
                    >
                      {allColumns.filter(c => visibleColumns.includes(c.key)).map(col => cellMap[col.key])}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Inactive Employees Table */}
      {inactiveEmployees.length > 0 && (
        <InactiveTable
          employees={filteredInactive}
          total={inactiveEmployees.length}
          searchTerm={searchTerm}
          onSelect={setSelectedEmployee}
          selectedId={selectedEmployee?.id}
          visibleColumns={visibleColumns}
          allColumns={allColumns}
          statusLabels={statusLabels}
          empTypeLabels={empTypeLabels}
          getEmployeeName={getEmployeeName}
          formatThaiDate={formatThaiDate}
        />
      )}

      {/* Employee Detail Popup */}
      {selectedEmployee && (() => {
        const emp = selectedEmployee;
        const deptName = emp.department_name_th || '-';
        const fmtNum = (v) => v ? Number(v).toLocaleString('th-TH') : '-';
        const empTypes = { permanent: 'พนักงานประจำ', contract: 'สัญญาจ้าง', outsource: 'Outsource', temporary: 'ชั่วคราว', freelance: 'ฟรีแลนซ์', part_time: 'Part-time' };
        const statuses = { active: 'ทำงานอยู่', probation: 'ทดลองงาน', resigned: 'ลาออก', terminated: 'พ้นสภาพ', probation_leaver: 'ออกระหว่างทดลองงาน' };
        const payCycles = { monthly: 'รายเดือน', biweekly: 'ราย 2 สัปดาห์' };

        // Calculate tenure
        const tenure = (() => {
          if (!emp.hire_date) return '-';
          const hd = new Date(emp.hire_date);
          const diff = new Date() - hd;
          const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
          const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
          return years > 0 ? `${years} ปี ${months} เดือน` : `${months} เดือน`;
        })();

        const InfoRow = ({ label, value, sensitive = false }) => (
          <div className="flex items-start py-1.5">
            <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
            <span className={`text-sm font-medium text-gray-900 flex-1 ${sensitive ? 'font-mono' : ''}`}>{value || '-'}</span>
          </div>
        );

        const SectionLabel = ({ title, color = 'oa' }) => {
          const cls = color === 'oa'
            ? { border: 'border-[#c6e8a3]', text: 'text-[#78c045]' }
            : { border: `border-${color}-200`, text: `text-${color}-600` };
          return (
            <div className={`border-b-2 ${cls.border} pb-1 mb-3`}>
              <p className={`text-xs font-bold ${cls.text} uppercase tracking-wider`}>{title}</p>
            </div>
          );
        };

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-6 pb-6 px-4 overflow-y-auto" onClick={() => setSelectedEmployee(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#f0f9e8] to-[#e8f5d8] rounded-t-2xl">
                <Avatar name={getEmployeeName(emp)} size="xl" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">{getEmployeeName(emp)}</h2>
                  <p className="text-sm text-gray-500">{emp.employee_code} · {emp.position_th || '-'}</p>
                  <p className="text-xs text-gray-400">{deptName} · {emp.company_entity || '-'}</p>
                  <div className="flex gap-2 mt-1.5">
                    <StatusBadge status={empStatus(emp)} labels={statuses} />
                    <StatusBadge status={emp.employment_type} labels={empTypes} />
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => { handleOpenEditModal(emp); }} className="px-3 py-2 bg-[#78c045] text-white rounded-lg text-xs font-medium hover:bg-[#5a9030] flex items-center gap-1">
                    <Edit2 size={14} /> แก้ไข
                  </button>
                  <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* ข้อมูลส่วนตัว */}
                <div>
                  <SectionLabel title="ข้อมูลส่วนตัว" />
                  <div className="grid grid-cols-2 gap-x-8">
                    <InfoRow label="คำนำหน้า" value={emp.prefix_th} />
                    <InfoRow label="ชื่อเล่น" value={emp.nickname} />
                    <InfoRow label="ชื่อ (ไทย)" value={emp.first_name_th} />
                    <InfoRow label="นามสกุล (ไทย)" value={emp.last_name_th} />
                    <InfoRow label="ชื่อ (EN)" value={emp.first_name_en} />
                    <InfoRow label="นามสกุล (EN)" value={emp.last_name_en} />
                    <InfoRow label="เพศ" value={emp.gender === 'M' || emp.gender === 'male' ? 'ชาย' : emp.gender === 'F' || emp.gender === 'female' ? 'หญิง' : emp.gender} />
                    <InfoRow label="วันเกิด" value={formatThaiDate(emp.date_of_birth)} />
                    <InfoRow label="เลขบัตรประชาชน" value={emp.national_id} sensitive />
                    <InfoRow label="เลขผู้เสียภาษี" value={emp.tax_id} sensitive />
                    <InfoRow label="อีเมล" value={emp.email} />
                    <InfoRow label="โทรศัพท์" value={emp.phone} />
                  </div>
                  <div className="mt-1">
                    <InfoRow label="ที่อยู่ทะเบียนบ้าน" value={emp.registered_address} />
                  </div>
                </div>

                {/* ข้อมูลงาน */}
                <div>
                  <SectionLabel title="ข้อมูลงาน" color="blue" />
                  <div className="grid grid-cols-2 gap-x-8">
                    <InfoRow label="รหัสพนักงาน" value={emp.employee_code} />
                    <InfoRow label="บริษัท" value={emp.company_entity} />
                    <InfoRow label="BU" value={emp.bu} />
                    <InfoRow label="แผนก" value={deptName} />
                    <InfoRow label="ตำแหน่ง (ไทย)" value={emp.position_th} />
                    <InfoRow label="ตำแหน่ง (EN)" value={emp.position_en} />
                    <InfoRow label="ระดับ" value={emp.level} />
                    <InfoRow label="Cost Center" value={emp.cost_center} />
                    <InfoRow label="ประเภทพนักงาน" value={empTypes[emp.employment_type] || emp.employment_type} />
                    <InfoRow label="สถานะ" value={statuses[empStatus(emp)] || empStatus(emp)} />
                    <InfoRow label="วันเริ่มงาน" value={formatThaiDate(emp.hire_date)} />
                    <InfoRow label="อายุงาน" value={tenure} />
                    {['contract','outsource'].includes(emp.employment_type) && (
                      <div className="flex items-start py-1.5">
                        <span className="text-xs text-gray-500 w-32 flex-shrink-0">ครบกำหนดสัญญา</span>
                        <span className={`text-sm font-medium flex-1 ${
                          !emp.contract_end_date ? 'text-gray-400' :
                          new Date(emp.contract_end_date) < new Date() ? 'text-red-600' :
                          new Date(emp.contract_end_date) - new Date() < 90*24*60*60*1000 ? 'text-orange-500' :
                          'text-gray-900'
                        }`}>
                          {emp.contract_end_date ? formatThaiDate(emp.contract_end_date) : 'ยังไม่ระบุ'}
                          {emp.contract_end_date && new Date(emp.contract_end_date) < new Date() && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">สัญญาหมดแล้ว</span>}
                          {emp.contract_end_date && new Date(emp.contract_end_date) >= new Date() && new Date(emp.contract_end_date) - new Date() < 90*24*60*60*1000 && <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">ใกล้ครบกำหนด</span>}
                        </span>
                      </div>
                    )}
                    {emp.resignation_date && <InfoRow label="วันที่ลาออก" value={formatThaiDate(emp.resignation_date)} />}
                    {emp.resignation_reason && <InfoRow label="เหตุผลลาออก" value={emp.resignation_reason} />}
                  </div>
                </div>

                {/* เงินเดือน & ธนาคาร */}
                {canViewSalary && (
                <div>
                  <SectionLabel title="เงินเดือน & ธนาคาร" color="emerald" />
                  <div className="grid grid-cols-2 gap-x-8">
                    <InfoRow label="เงินเดือน" value={emp.base_salary ? `${fmtNum(emp.base_salary)} บาท` : '-'} />
                    <InfoRow label="รอบเงินเดือน" value={payCycles[emp.payroll_cycle] || emp.payroll_cycle} />
                    <InfoRow label="ค่าตำแหน่ง" value={emp.position_allowance ? `${fmtNum(emp.position_allowance)} บาท` : '-'} />
                    <InfoRow label="ค่าเดินทาง" value={emp.transport_allowance ? `${fmtNum(emp.transport_allowance)} บาท` : '-'} />
                    <InfoRow label="ค่าที่พัก" value={emp.housing_allowance ? `${fmtNum(emp.housing_allowance)} บาท` : '-'} />
                    <InfoRow label="ธนาคาร" value={emp.bank_name} />
                    <InfoRow label="เลขที่บัญชี" value={emp.bank_account} sensitive />
                  </div>
                </div>
                )}

                {/* ประกันสังคม / ภาษี / กองทุน */}
                <div>
                  <SectionLabel title="ประกันสังคม / ภาษี / กองทุน" color="violet" />
                  <div className="grid grid-cols-2 gap-x-8">
                    <InfoRow label="เลขประกันสังคม" value={emp.social_security_no} sensitive />
                    <InfoRow label="รพ.ประกันสังคม" value={emp.sso_hospital} />
                    <InfoRow label="สถานะภาษี" value={emp.tax_filing_status} />
                    <InfoRow label="จำนวนบุตร" value={emp.num_dependents} />
                    <InfoRow label="กองทุนสำรองฯ (พนักงาน)" value={emp.pvd_employee_rate ? `${emp.pvd_employee_rate}%` : '-'} />
                    <InfoRow label="กองทุนสำรองฯ (นายจ้าง)" value={emp.pvd_employer_rate ? `${emp.pvd_employer_rate}%` : '-'} />
                  </div>
                </div>

                {/* ผู้ติดต่อฉุกเฉิน */}
                <div>
                  <SectionLabel title="ผู้ติดต่อฉุกเฉิน" color="red" />
                  <div className="grid grid-cols-2 gap-x-8">
                    <InfoRow label="ชื่อ" value={emp.emergency_contact_name} />
                    <InfoRow label="เบอร์โทร" value={emp.emergency_contact_phone} />
                    <InfoRow label="ความสัมพันธ์" value={emp.emergency_contact_relation} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>อัปเดตล่าสุด: {emp.updated_at ? formatThaiDate(emp.updated_at) : '-'}</span>
                <div className="flex gap-2">
                  <button onClick={() => { handleOpenEditModal(emp); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                    <Edit2 size={12} /> แก้ไข
                  </button>
                  <button onClick={() => { if (window.confirm('ยืนยันการลบพนักงาน?')) { handleDelete(emp); setSelectedEmployee(null); } }}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 flex items-center gap-1">
                    <Trash2 size={12} /> ลบ
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedEmployee ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงาน'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedEmployee(null);
                  setFormData(getEmptyFormData());
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสพนักงาน *</label>
                  <input
                    type="text"
                    name="employee_code"
                    value={formData.employee_code}
                    onChange={handleFormChange}
                    disabled={!!selectedEmployee}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045] disabled:bg-gray-100"
                    required
                  />
                  {formErrors.employee_code && <p className="text-red-500 text-xs mt-1">{formErrors.employee_code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                  <input
                    type="text"
                    name="prefix_th"
                    value={formData.prefix_th}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (ไทย) *</label>
                  <input
                    type="text"
                    name="first_name_th"
                    value={formData.first_name_th}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  />
                  {formErrors.first_name_th && <p className="text-red-500 text-xs mt-1">{formErrors.first_name_th}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล (ไทย) *</label>
                  <input
                    type="text"
                    name="last_name_th"
                    value={formData.last_name_th}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  />
                  {formErrors.last_name_th && <p className="text-red-500 text-xs mt-1">{formErrors.last_name_th}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (English) *</label>
                  <input
                    type="text"
                    name="first_name_en"
                    value={formData.first_name_en}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  />
                  {formErrors.first_name_en && <p className="text-red-500 text-xs mt-1">{formErrors.first_name_en}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล (English) *</label>
                  <input
                    type="text"
                    name="last_name_en"
                    value={formData.last_name_en}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  />
                  {formErrors.last_name_en && <p className="text-red-500 text-xs mt-1">{formErrors.last_name_en}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">แผนก *</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  >
                    <option value="">เลือก</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{lang === 'th' ? d.name_th : d.name_en}</option>
                    ))}
                  </select>
                  {formErrors.department_id && <p className="text-red-500 text-xs mt-1">{formErrors.department_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    name="position_th"
                    value={formData.position_th}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทพนักงาน</label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  >
                    <option value="permanent">ประจำ</option>
                    <option value="contract">สัญญาจ้าง</option>
                    <option value="outsource">Outsource</option>
                    <option value="temporary">ชั่วคราว</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่มงาน *</label>
                  <input
                    type="date"
                    name="hire_date"
                    value={formData.hire_date}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                    required
                  />
                  {formErrors.hire_date && <p className="text-red-500 text-xs mt-1">{formErrors.hire_date}</p>}
                </div>
                {['contract','outsource'].includes(formData.employment_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ครบกำหนดสัญญา</label>
                  <input
                    type="date"
                    name="contract_end_date"
                    value={formData.contract_end_date || ''}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  >
                    <option value="active">ทำงาน</option>
                    <option value="probation">ทดลองงาน</option>
                    <option value="resigned">ลาออก</option>
                    <option value="terminated">พ้นสภาพ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">บริษัท</label>
                  <select
                    name="company_entity"
                    value={formData.company_entity}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  >
                    <option value="">เลือก</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.name_th}>{c.name_th}</option>
                    ))}
                  </select>
                </div>
                {canViewSalary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เงินเดือน</label>
                  <input
                    type="number"
                    name="base_salary"
                    value={formData.base_salary}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
                  />
                </div>
                )}
              </div>
              {formErrors.submit && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{formErrors.submit}</div>}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    setFormData(getEmptyFormData());
                  }}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">นำเข้าพนักงาน</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData([]);
                  setImportMapping({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {importData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>ไม่พบข้อมูลในไฟล์</p>
                </div>
              ) : (() => {
                const isTemplate = importData[0] && ('ชื่อ (ไทย)' in importData[0] || 'รหัสพนักงาน' in importData[0]);
                return (
                  <div className="space-y-4">
                    {isTemplate ? (
                      <>
                        <div className="bg-green-50 border border-green-200 p-3 rounded text-sm flex items-center gap-2">
                          <Check size={16} className="text-green-600" />
                          <span>ตรวจพบ EFIN Template — พร้อมนำเข้า {importData.length} รายการ</span>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowImportModal(false);
                              setImportData([]);
                            }}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={handleImportTemplate}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSubmitting ? 'กำลังนำเข้า...' : `นำเข้า ${importData.length} คน`}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">ไฟล์นี้ไม่ใช่ EFIN Template — กรุณาจับคู่คอลัมน์</p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowImportModal(false);
                              setImportData([]);
                            }}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={handleConfirmImport}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                          >
                            นำเข้า
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

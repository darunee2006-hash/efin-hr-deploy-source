import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Clock,
  Users,
  User,
  X,
  Briefcase,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { PageHeader, KPICard } from '../components/PageUI';
import { ImportExportButtons, exportToExcel } from '../components/ImportExport';

const LABELS = {
  th: {
    title: 'ต้อนรับพนักงานใหม่',
    subtitle: 'พนักงานที่เริ่มงานตั้งแต่ 1 มกราคม 2569',
    totalOnboarding: 'พนักงานใหม่ทั้งหมด',
    probation: 'ทดลองงาน',
    active: 'ผ่านทดลองงาน',
    contractOutsource: 'สัญญา/Outsource',
    status: 'สถานะ',
    employeeName: 'ชื่อ-นามสกุล',
    startDate: 'วันที่เริ่มงาน',
    position: 'ตำแหน่ง',
    department: 'ฝ่าย',
    empType: 'ประเภท',
    tenure: 'อายุงาน',
    filterByStatus: 'กรองตามสถานะ',
    allStatuses: 'ทั้งหมด',
    details: 'ข้อมูลพนักงาน',
    noData: 'ไม่พบข้อมูลพนักงานใหม่',
    loading: 'กำลังโหลด...',
    closePanel: 'ปิด',
  },
  en: {
    title: 'New Employees',
    subtitle: 'Employees who joined from January 1, 2026',
    totalOnboarding: 'Total New Employees',
    probation: 'On Probation',
    active: 'Passed Probation',
    contractOutsource: 'Contract/Outsource',
    status: 'Status',
    employeeName: 'Employee Name',
    startDate: 'Start Date',
    position: 'Position',
    department: 'Department',
    empType: 'Type',
    tenure: 'Tenure',
    filterByStatus: 'Filter by Status',
    allStatuses: 'All',
    details: 'Employee Details',
    noData: 'No new employees found',
    loading: 'Loading...',
    closePanel: 'Close',
  },
};

const getLabel = (key, lang) => LABELS[lang]?.[key] || LABELS.en[key];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const calcTenure = (hireDateStr) => {
  if (!hireDateStr) return '-';
  const start = new Date(hireDateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} เดือน`;
  if (months === 0) return `${years} ปี`;
  return `${years} ปี ${months} เดือน`;
};

const STATUS_MAP = {
  active:    { cls: 'bg-green-100 text-green-700',   label: 'ทำงาน' },
  probation: { cls: 'bg-yellow-100 text-yellow-700', label: 'ทดลองงาน' },
  resigned:  { cls: 'bg-red-100 text-red-700',       label: 'ลาออก' },
  terminated:{ cls: 'bg-gray-100 text-gray-600',     label: 'พ้นสภาพ' },
};

const EMP_TYPE_MAP = {
  permanent: 'พนักงานประจำ',
  contract:  'สัญญาจ้าง',
  outsource: 'Outsource',
};

const getEmpName = (emp) => {
  if (!emp) return '-';
  if (emp.first_name_th) return `${emp.first_name_th} ${emp.last_name_th || ''}`.trim();
  return `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim() || '-';
};

export default function Onboarding({ lang = 'en' }) {
  const { filterByCompany } = useCompanyFilter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('hr_employees')
        .select(`
          id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
          nickname, email, phone, position_th, department_name_th, company_entity,
          hire_date, status, employment_type, contract_end_date, bu
        `)
        .gte('hire_date', '2026-01-01')
        .in('status', ['active', 'probation'])
        .order('hire_date', { ascending: false });
      if (fetchError) throw fetchError;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching new employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const companyFiltered = useMemo(
    () => filterByCompany(employees),
    [employees, filterByCompany]
  );

  const kpis = useMemo(() => {
    const total = companyFiltered.length;
    const probation = companyFiltered.filter(e => e.status === 'probation').length;
    const active = companyFiltered.filter(e => e.status === 'active').length;
    const contractOutsource = companyFiltered.filter(
      e => ['contract', 'outsource'].includes(e.employment_type)
    ).length;
    return { total, probation, active, contractOutsource };
  }, [companyFiltered]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return companyFiltered;
    return companyFiltered.filter(e => e.status === filterStatus);
  }, [companyFiltered, filterStatus]);

  const handleExport = () => {
    exportToExcel({
      data: filtered,
      columns: [
        { header: 'รหัสพนักงาน', accessor: 'employee_code', width: 15 },
        { header: 'ชื่อ-นามสกุล', accessor: (e) => getEmpName(e), width: 25 },
        { header: 'ตำแหน่ง', accessor: 'position_th', width: 25 },
        { header: 'ฝ่าย', accessor: 'department_name_th', width: 20 },
        { header: 'วันที่เริ่มงาน', accessor: 'hire_date', width: 15 },
        { header: 'ประเภท', accessor: (e) => EMP_TYPE_MAP[e.employment_type] || e.employment_type || '-', width: 15 },
        { header: 'สถานะ', accessor: (e) => STATUS_MAP[e.status]?.label || e.status, width: 15 },
      ],
      filename: 'new_employees_2026',
      sheetName: 'พนักงานใหม่',
    });
  };

  if (loading) {
    return (
      <div className="p-4">
        <PageHeader
          title={getLabel('title', lang)}
          subtitle={getLabel('subtitle', lang)}
          lang={lang}
        />
        <div className="text-center py-12 text-gray-500">{getLabel('loading', lang)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <PageHeader
          title={getLabel('title', lang)}
          subtitle={getLabel('subtitle', lang)}
          lang={lang}
        />
        <div className="text-center py-12 text-red-500">เกิดข้อผิดพลาด: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex-1">
          <PageHeader
            title={getLabel('title', lang)}
            subtitle={getLabel('subtitle', lang)}
            lang={lang}
          />
        </div>
        <div className="ml-4">
          <ImportExportButtons onExport={handleExport} lang={lang} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KPICard
          icon={Users}
          iconBg="bg-[#e2f4d3]"
          iconColor="text-[#78c045]"
          label={getLabel('totalOnboarding', lang)}
          value={kpis.total}
        />
        <KPICard
          icon={Clock}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          label={getLabel('probation', lang)}
          value={kpis.probation}
        />
        <KPICard
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={getLabel('active', lang)}
          value={kpis.active}
        />
        <KPICard
          icon={Briefcase}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label={getLabel('contractOutsource', lang)}
          value={kpis.contractOutsource}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {getLabel('filterByStatus', lang)}
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#78c045]"
        >
          <option value="all">{getLabel('allStatuses', lang)}</option>
          <option value="probation">ทดลองงาน</option>
          <option value="active">ทำงาน (ผ่านทดลอง)</option>
        </select>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{getLabel('noData', lang)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('employeeName', lang)}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('startDate', lang)}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('position', lang)}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('department', lang)}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('empType', lang)}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    {getLabel('status', lang)}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    {getLabel('tenure', lang)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((emp) => {
                  const st = STATUS_MAP[emp.status] || { cls: 'bg-gray-100 text-gray-600', label: emp.status };
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelected(emp)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {getEmpName(emp)}
                        {emp.nickname && (
                          <span className="text-gray-400 text-xs ml-1">({emp.nickname})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(emp.hire_date)}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.position_th || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{emp.department_name_th || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {EMP_TYPE_MAP[emp.employment_type] || emp.employment_type || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-right">
                        {calcTenure(emp.hire_date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel employee={selected} lang={lang} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// Detail Panel Component
function DetailPanel({ employee: emp, lang, onClose }) {
  if (!emp) return null;
  const st = STATUS_MAP[emp.status] || { cls: 'bg-gray-100 text-gray-600', label: emp.status };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#78c045] to-[#5a9030] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{getLabel('details', lang)}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-[#5a9030] p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name avatar row */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-[#e2f4d3] flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-[#78c045]" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{getEmpName(emp)}</p>
              {emp.nickname && <p className="text-sm text-gray-500">({emp.nickname})</p>}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${st.cls}`}>
                {st.label}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="รหัสพนักงาน" value={emp.employee_code || '-'} />
            <InfoRow label="ตำแหน่ง" value={emp.position_th || '-'} />
            <InfoRow label="ฝ่าย" value={emp.department_name_th || '-'} />
            <InfoRow label="BU" value={emp.bu || emp.company_entity || '-'} />
            <InfoRow label="ประเภทพนักงาน" value={EMP_TYPE_MAP[emp.employment_type] || emp.employment_type || '-'} />
            <InfoRow label="วันที่เริ่มงาน" value={formatDate(emp.hire_date)} />
            <InfoRow label="อายุงาน" value={calcTenure(emp.hire_date)} />
            {emp.contract_end_date && (
              <InfoRow label="ครบกำหนดสัญญา" value={formatDate(emp.contract_end_date)} />
            )}
            <InfoRow label="อีเมล" value={emp.email || '-'} />
            <InfoRow label="โทรศัพท์" value={emp.phone || '-'} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#78c045] text-white rounded-lg font-medium hover:bg-[#5a9030] transition-colors"
          >
            {getLabel('closePanel', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import {
  Shield,
  AlertTriangle,
  FileWarning,
  Scale,
  MessageSquare,
  Search,
  ChevronDown,
  X,
  ExternalLink,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { exportToExcel, ImportModal, ImportExportButtons } from '../components/ImportExport';

const translations = {
  th: {
    title: 'การจัดการความสัมพันธ์พนักงาน',
    kpi: {
      openCases: 'คดีที่เปิด',
      investigating: 'ระหว่างสอบสวน',
      resolved: 'แก้ไขแล้ว',
      criticalSeverity: 'ความรุนแรงสูง',
    },
    filters: {
      caseType: 'ประเภทคดี',
      status: 'สถานะ',
      severity: 'ความรุนแรง',
      all: 'ทั้งหมด',
    },
    table: {
      caseNumber: 'เลขคดี',
      type: 'ประเภท',
      employee: 'พนักงาน',
      incidentDate: 'วันที่เกิดเหตุ',
      severity: 'ความรุนแรง',
      status: 'สถานะ',
      assignedTo: 'มอบหมายให้',
    },
    caseTypes: {
      warning: 'ตักเตือน',
      disciplinary: 'วินัย',
      grievance: 'ร้องเรียน',
      complaint: 'ร้องทุกข์',
      investigation: 'สอบสวน',
      counseling: 'ให้คำปรึกษา',
      labor_case: 'คดีแรงงาน',
    },
    statuses: {
      open: 'เปิด',
      investigating: 'สอบสวน',
      resolved: 'แก้ไขแล้ว',
      closed: 'ปิด',
      escalated: 'ยกระดับ',
    },
    severities: {
      low: 'ต่ำ',
      medium: 'ปานกลาง',
      high: 'สูง',
      critical: 'วิกฤต',
    },
    warningLevels: {
      verbal: 'ตักเตือนด้วยวาจา',
      written_1: 'ตักเตือนเป็นลายลักษณ์อักษรครั้งที่ 1',
      written_2: 'ตักเตือนเป็นลายลักษณ์อักษรครั้งที่ 2',
      final: 'ตักเตือนสุดท้าย',
      termination: 'สิ้นสุดสัญญาจ้าง',
    },
    detailPanel: {
      caseDetails: 'รายละเอียดคดี',
      timeline: 'ลำดับเหตุการณ์',
      evidence: 'หลักฐาน',
      investigationResult: 'ผลการสอบสวน',
      warningLevel: 'ระดับการตักเตือน',
      followUpDate: 'วันติดตามผล',
      closedDate: 'วันที่ปิดคดี',
      notes: 'หมายเหตุ',
      reportedBy: 'รายงานโดย',
      description: 'รายละเอียด',
      actionTaken: 'การดำเนินการ',
    },
    noData: 'ไม่มีข้อมูล',
    loading: 'กำลังโหลด...',
    error: 'เกิดข้อผิดพลาด',
  },
  en: {
    title: 'Employee Relations Management',
    kpi: {
      openCases: 'Open Cases',
      investigating: 'Investigating',
      resolved: 'Resolved',
      criticalSeverity: 'Critical Severity',
    },
    filters: {
      caseType: 'Case Type',
      status: 'Status',
      severity: 'Severity',
      all: 'All',
    },
    table: {
      caseNumber: 'Case #',
      type: 'Type',
      employee: 'Employee',
      incidentDate: 'Incident Date',
      severity: 'Severity',
      status: 'Status',
      assignedTo: 'Assigned To',
    },
    caseTypes: {
      warning: 'Warning',
      disciplinary: 'Disciplinary',
      grievance: 'Grievance',
      complaint: 'Complaint',
      investigation: 'Investigation',
      counseling: 'Counseling',
      labor_case: 'Labor Case',
    },
    statuses: {
      open: 'Open',
      investigating: 'Investigating',
      resolved: 'Resolved',
      closed: 'Closed',
      escalated: 'Escalated',
    },
    severities: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
    warningLevels: {
      verbal: 'Verbal Warning',
      written_1: 'Written Warning 1',
      written_2: 'Written Warning 2',
      final: 'Final Warning',
      termination: 'Termination',
    },
    detailPanel: {
      caseDetails: 'Case Details',
      timeline: 'Timeline',
      evidence: 'Evidence',
      investigationResult: 'Investigation Result',
      warningLevel: 'Warning Level',
      followUpDate: 'Follow-up Date',
      closedDate: 'Closed Date',
      notes: 'Notes',
      reportedBy: 'Reported By',
      description: 'Description',
      actionTaken: 'Action Taken',
    },
    noData: 'No data',
    loading: 'Loading...',
    error: 'Error loading data',
  },
};

const getCaseTypeIcon = (caseType) => {
  switch (caseType) {
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />;
    case 'disciplinary':
      return <Shield className="w-4 h-4" />;
    case 'grievance':
      return <MessageSquare className="w-4 h-4" />;
    case 'complaint':
      return <FileWarning className="w-4 h-4" />;
    case 'investigation':
      return <Search className="w-4 h-4" />;
    case 'counseling':
      return <MessageSquare className="w-4 h-4" />;
    case 'labor_case':
      return <Scale className="w-4 h-4" />;
    default:
      return <FileWarning className="w-4 h-4" />;
  }
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'investigating':
      return 'bg-purple-100 text-purple-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    case 'escalated':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function EmployeeRelations({ lang = 'en' }) {
  const { filterByCompany } = useCompanyFilter();
  const t = translations[lang];
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [employees, setEmployees] = useState({});
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [filters, setFilters] = useState({
    caseType: '',
    status: '',
    severity: '',
  });
  const [showImport, setShowImport] = useState(false);

  // Company-filtered cases
  const companyFilteredCases = useMemo(() => {
    const filteredEmpIds = new Set(filterByCompany(employeesList).map(e => e.id));
    return cases.filter(c => filteredEmpIds.has(c.employee_id));
  }, [cases, employeesList, filterByCompany]);

  // KPI calculations
  const kpis = {
    openCases: companyFilteredCases.filter((c) => c.status === 'open').length,
    investigating: companyFilteredCases.filter((c) => c.status === 'investigating').length,
    resolved: companyFilteredCases.filter((c) => c.status === 'resolved').length,
    critical: companyFilteredCases.filter((c) => c.severity === 'critical').length,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch employee relations cases
      const { data: casesData, error: casesError } = await supabase
        .from('hr_employee_relations')
        .select('*')
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      // Fetch employees for lookup
      const { data: employeesData, error: employeesError } = await supabase
        .from('hr_employees')
        .select('id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, company_entity');

      if (employeesError) throw employeesError;

      // Build employee lookup map
      const employeeMap = {};
      employeesData?.forEach((emp) => {
        employeeMap[emp.id] = (`${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim() + (emp.nickname ? ` (${emp.nickname})` : '')) || emp.employee_code;
      });

      setCases(casesData || []);
      setEmployees(employeeMap);
      setEmployeesList(employeesData || []);
      applyFilters(casesData || [], {});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (casesToFilter, newFilters) => {
    let filtered = casesToFilter;

    if (newFilters.caseType) {
      filtered = filtered.filter((c) => c.case_type === newFilters.caseType);
    }

    if (newFilters.status) {
      filtered = filtered.filter((c) => c.status === newFilters.status);
    }

    if (newFilters.severity) {
      filtered = filtered.filter((c) => c.severity === newFilters.severity);
    }

    setFilteredCases(filtered);
  };

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    setFilters(newFilters);
    applyFilters(companyFilteredCases, newFilters);
  };

  // Export handler with Thai column headers
  const handleExport = () => {
    const columns = [
      { header: lang === 'th' ? 'เลขคดี' : 'Case #', accessor: 'case_number', width: 12 },
      { header: lang === 'th' ? 'ประเภทคดี' : 'Case Type', accessor: (row) => lang === 'th' ? translations.th.caseTypes[row.case_type] : translations.en.caseTypes[row.case_type], width: 14 },
      { header: lang === 'th' ? 'พนักงาน' : 'Employee', accessor: (row) => employees[row.employee_id] || '-', width: 16 },
      { header: lang === 'th' ? 'วันที่เกิดเหตุ' : 'Incident Date', accessor: (row) => formatDate(row.incident_date), width: 14 },
      { header: lang === 'th' ? 'ความรุนแรง' : 'Severity', accessor: (row) => lang === 'th' ? translations.th.severities[row.severity] : translations.en.severities[row.severity], width: 12 },
      { header: lang === 'th' ? 'สถานะ' : 'Status', accessor: (row) => lang === 'th' ? translations.th.statuses[row.status] : translations.en.statuses[row.status], width: 12 },
      { header: lang === 'th' ? 'มอบหมายให้' : 'Assigned To', accessor: 'assigned_to', width: 14 },
      { header: lang === 'th' ? 'รายละเอียด' : 'Description', accessor: 'description', width: 20 },
      { header: lang === 'th' ? 'ผลการสอบสวน' : 'Investigation Result', accessor: 'investigation_result', width: 20 },
      { header: lang === 'th' ? 'การดำเนินการ' : 'Action Taken', accessor: 'action_taken', width: 20 },
      { header: lang === 'th' ? 'ระดับการตักเตือน' : 'Warning Level', accessor: (row) => row.warning_level ? (lang === 'th' ? translations.th.warningLevels[row.warning_level] : translations.en.warningLevels[row.warning_level]) : '-', width: 16 },
    ];

    exportToExcel({
      data: filteredCases.length > 0 ? filteredCases : cases,
      columns: columns,
      filename: 'Employee_Relations_Cases',
      sheetName: lang === 'th' ? 'การจัดการความสัมพันธ์' : 'Employee Relations',
    });
  };

  // Import handler to insert into hr_employee_relations
  const handleImport = async (mappedData) => {
    try {
      const { data, error } = await supabase
        .from('hr_employee_relations')
        .insert(mappedData);

      if (error) throw error;

      // Refresh the data after successful import
      await fetchData();
      return mappedData.length;
    } catch (error) {
      console.error('Import error:', error);
      throw new Error(error.message || 'Failed to import records');
    }
  };

  // Define import column mappings with Thai headers and examples
  const importColumns = [
    {
      header: lang === 'th' ? 'เลขคดี' : 'Case #',
      headerEn: 'Case #',
      dbField: 'case_number',
      accessor: 'case_number',
      example: 'ER-2024-001',
      width: 12,
    },
    {
      header: lang === 'th' ? 'ประเภทคดี' : 'Case Type',
      headerEn: 'Case Type',
      dbField: 'case_type',
      accessor: 'case_type',
      example: 'warning',
      width: 14,
    },
    {
      header: lang === 'th' ? 'พนักงานID' : 'Employee ID',
      headerEn: 'Employee ID',
      dbField: 'employee_id',
      accessor: 'employee_id',
      example: 'uuid-here',
      width: 16,
    },
    {
      header: lang === 'th' ? 'วันที่เกิดเหตุ' : 'Incident Date',
      headerEn: 'Incident Date',
      dbField: 'incident_date',
      accessor: 'incident_date',
      example: '2024-01-15',
      width: 14,
    },
    {
      header: lang === 'th' ? 'ความรุนแรง' : 'Severity',
      headerEn: 'Severity',
      dbField: 'severity',
      accessor: 'severity',
      example: 'high',
      width: 12,
    },
    {
      header: lang === 'th' ? 'สถานะ' : 'Status',
      headerEn: 'Status',
      dbField: 'status',
      accessor: 'status',
      example: 'investigating',
      width: 12,
    },
    {
      header: lang === 'th' ? 'มอบหมายให้' : 'Assigned To',
      headerEn: 'Assigned To',
      dbField: 'assigned_to',
      accessor: 'assigned_to',
      example: 'John Doe',
      width: 14,
    },
    {
      header: lang === 'th' ? 'รายละเอียด' : 'Description',
      headerEn: 'Description',
      dbField: 'description',
      accessor: 'description',
      example: 'Case details here',
      width: 20,
    },
    {
      header: lang === 'th' ? 'ผลการสอบสวน' : 'Investigation Result',
      headerEn: 'Investigation Result',
      dbField: 'investigation_result',
      accessor: 'investigation_result',
      example: 'Result details',
      width: 20,
    },
    {
      header: lang === 'th' ? 'การดำเนินการ' : 'Action Taken',
      headerEn: 'Action Taken',
      dbField: 'action_taken',
      accessor: 'action_taken',
      example: 'Action details',
      width: 20,
    },
  ];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(
      lang === 'th' ? 'th-TH' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  const KPICard = ({ label, value, icon: Icon }) => (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-blue-500 opacity-20" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <ImportExportButtons
            onExport={handleExport}
            onImportClick={() => setShowImport(true)}
            lang={lang}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            label={t.kpi.openCases}
            value={kpis.openCases}
            icon={AlertTriangle}
          />
          <KPICard
            label={t.kpi.investigating}
            value={kpis.investigating}
            icon={Search}
          />
          <KPICard
            label={t.kpi.resolved}
            value={kpis.resolved}
            icon={CheckCircle}
          />
          <KPICard
            label={t.kpi.criticalSeverity}
            value={kpis.critical}
            icon={Shield}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Case Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.filters.caseType}
              </label>
              <select
                value={filters.caseType}
                onChange={(e) =>
                  handleFilterChange('caseType', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t.filters.all}</option>
                {Object.entries(
                  lang === 'th'
                    ? translations.th.caseTypes
                    : translations.en.caseTypes
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.filters.status}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t.filters.all}</option>
                {Object.entries(
                  lang === 'th'
                    ? translations.th.statuses
                    : translations.en.statuses
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.filters.severity}
              </label>
              <select
                value={filters.severity}
                onChange={(e) =>
                  handleFilterChange('severity', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t.filters.all}</option>
                {Object.entries(
                  lang === 'th'
                    ? translations.th.severities
                    : translations.en.severities
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredCases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">{t.noData}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.caseNumber}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.type}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.employee}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.incidentDate}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.severity}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.status}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t.table.assignedTo}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCases.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      onClick={() => setSelectedCase(caseItem)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {caseItem.case_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getCaseTypeIcon(caseItem.case_type)}
                          <span className="text-sm text-gray-900">
                            {lang === 'th'
                              ? translations.th.caseTypes[caseItem.case_type]
                              : translations.en.caseTypes[caseItem.case_type]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employees[caseItem.employee_id] || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(caseItem.incident_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getSeverityColor(
                            caseItem.severity
                          )}`}
                        >
                          {lang === 'th'
                            ? translations.th.severities[caseItem.severity]
                            : translations.en.severities[caseItem.severity]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                            caseItem.status
                          )}`}
                        >
                          {lang === 'th'
                            ? translations.th.statuses[caseItem.status]
                            : translations.en.statuses[caseItem.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {caseItem.assigned_to || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        columns={importColumns}
        tableName={lang === 'th' ? 'hr_employee_relations' : 'Employee Relations'}
        lang={lang}
      />

      {/* Detail Panel */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end">
          <div className="w-full md:w-1/2 bg-white h-screen md:h-auto md:max-h-[90vh] overflow-y-auto shadow-lg rounded-t-lg md:rounded-lg md:m-4 md:ml-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCase.case_number}
              </h2>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6 space-y-6">
              {/* Case Details Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t.detailPanel.caseDetails}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table.type}
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {lang === 'th'
                        ? translations.th.caseTypes[selectedCase.case_type]
                        : translations.en.caseTypes[selectedCase.case_type]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table.severity}
                    </p>
                    <p className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full border inline-block ${getSeverityColor(
                          selectedCase.severity
                        )}`}
                      >
                        {lang === 'th'
                          ? translations.th.severities[selectedCase.severity]
                          : translations.en.severities[selectedCase.severity]}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table.status}
                    </p>
                    <p className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${getStatusBadgeColor(
                          selectedCase.status
                        )}`}
                      >
                        {lang === 'th'
                          ? translations.th.statuses[selectedCase.status]
                          : translations.en.statuses[selectedCase.status]}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table.employee}
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {employees[selectedCase.employee_id] || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.detailPanel.reportedBy}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCase.reported_by || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.table.incidentDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedCase.incident_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {t.detailPanel.description}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedCase.description}
                  </p>
                </div>
              )}

              {/* Investigation Result */}
              {selectedCase.investigation_result && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {t.detailPanel.investigationResult}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedCase.investigation_result}
                  </p>
                </div>
              )}

              {/* Action Taken */}
              {selectedCase.action_taken && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {t.detailPanel.actionTaken}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedCase.action_taken}
                  </p>
                </div>
              )}

              {/* Warning Level */}
              {selectedCase.warning_level && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {t.detailPanel.warningLevel}
                  </p>
                  <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    {lang === 'th'
                      ? translations.th.warningLevels[
                          selectedCase.warning_level
                        ]
                      : translations.en.warningLevels[
                          selectedCase.warning_level
                        ]}
                  </span>
                </div>
              )}

              {/* Important Dates */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                {selectedCase.follow_up_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.detailPanel.followUpDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedCase.follow_up_date)}
                    </p>
                  </div>
                )}
                {selectedCase.closed_date && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.detailPanel.closedDate}
                    </p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedCase.closed_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Evidence Links */}
              {selectedCase.evidence_urls &&
                Array.isArray(selectedCase.evidence_urls) &&
                selectedCase.evidence_urls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {t.detailPanel.evidence}
                    </h4>
                    <div className="space-y-2">
                      {selectedCase.evidence_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="truncate">{url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* Notes */}
              {selectedCase.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {t.detailPanel.notes}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedCase.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

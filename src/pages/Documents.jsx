import React, { useState, useEffect, useMemo } from 'react';
import {
  PageHeader,
  KPICard,
  Section,
  DetailPanel,
  Avatar,
  TabPills,
} from '../components/PageUI';
import {
  FileText,
  FileCheck,
  AlertCircle,
  Clock,
  Download,
  Eye,
  File,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport';

// Helper: format bytes → KB / MB
const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper: calculate expiry status from expiry_date string (YYYY-MM-DD)
const calcExpiryStatus = (expiryDate, dbStatus) => {
  if (dbStatus === 'inactive') return 'inactive';
  if (!expiryDate) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 30) return 'expiring';
  return 'normal';
};

const calcDaysLeft = (expiryDate) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((new Date(expiryDate) - today) / (1000 * 60 * 60 * 24));
};

// Map document_type → tab category key
const toTabCategory = (docType) => {
  if (!docType) return 'เอกสารอื่นๆ';
  const t = docType.trim();
  if (t === 'ใบอนุญาต') return 'ใบอนุญาต';
  if (t === 'สัญญาจ้าง') return 'สัญญาจ้าง';
  if (t === 'ใบรับรอง') return 'ใบรับรอง';
  if (t === 'PDPA Consent' || t === 'pdpa') return 'PDPA Consent';
  return 'เอกสารอื่นๆ';
};

const labels = {
  th: {
    title: 'เอกสาร',
    allDocs: 'เอกสารทั้งหมด',
    expiringSoon: 'ใกล้หมดอายุ',
    expired: 'หมดอายุ',
    activeLabel: 'ใช้งาน',
    tabLicenses: 'ใบอนุญาต',
    tabContracts: 'สัญญาจ้าง',
    tabCerts: 'ใบรับรอง',
    tabOther: 'เอกสารอื่นๆ',
    tabPDPA: 'PDPA Consent',
    number: 'ลำดับ',
    docName: 'ชื่อเอกสาร',
    type: 'ประเภท',
    owner: 'เจ้าของ',
    uploadDate: 'วันที่อัปโหลด',
    expiryDate: 'วันหมดอายุ',
    status: 'สถานะ',
    normal: 'ปกติ',
    expiringSoonLabel: 'ใกล้หมดอายุ',
    expiredLabel: 'หมดอายุ',
    fileInfo: 'ข้อมูลเอกสาร',
    docType: 'ประเภทเอกสาร',
    uploadedBy: 'เจ้าของเอกสาร',
    fileSize: 'ขนาดไฟล์',
    download: 'ดาวน์โหลด',
    preview: 'ดูตัวอย่าง',
    upcomingExpiry: 'เอกสารที่ใกล้หมดอายุ',
    daysLeft: 'วัน',
    pdpaTracking: 'การติดตามความยินยอม PDPA',
    employee: 'พนักงาน',
    consentStatus: 'สถานะการยินยอม',
    consentDate: 'วันที่ยินยอม',
    consented: 'ยินยอมแล้ว',
    pending: 'รอยินยอม',
    search: 'ค้นหาเอกสาร...',
    noData: 'ยังไม่มีเอกสารในหมวดหมู่นี้',
    noDataSub: 'เพิ่มเอกสารหรือนำเข้าจาก Excel',
    version: 'เวอร์ชัน',
    description: 'รายละเอียด',
  },
  en: {
    title: 'Documents',
    allDocs: 'Total Documents',
    expiringSoon: 'Expiring Soon',
    expired: 'Expired',
    activeLabel: 'Active',
    tabLicenses: 'Licenses',
    tabContracts: 'Contracts',
    tabCerts: 'Certificates',
    tabOther: 'Others',
    tabPDPA: 'PDPA Consent',
    number: 'No.',
    docName: 'Document Name',
    type: 'Type',
    owner: 'Owner',
    uploadDate: 'Upload Date',
    expiryDate: 'Expiry Date',
    status: 'Status',
    normal: 'Normal',
    expiringSoonLabel: 'Expiring Soon',
    expiredLabel: 'Expired',
    fileInfo: 'File Info',
    docType: 'Document Type',
    uploadedBy: 'Owner',
    fileSize: 'File Size',
    download: 'Download',
    preview: 'Preview',
    upcomingExpiry: 'Upcoming Expiry',
    daysLeft: 'days',
    pdpaTracking: 'PDPA Consent Tracking',
    employee: 'Employee',
    consentStatus: 'Consent Status',
    consentDate: 'Consent Date',
    consented: 'Consented',
    pending: 'Pending',
    search: 'Search documents...',
    noData: 'No documents in this category',
    noDataSub: 'Add documents or import from Excel',
    version: 'Version',
    description: 'Description',
  },
};

export default function Documents({ lang = 'th' }) {
  const { filterByCompany } = useCompanyFilter();
  const t = labels[lang] || labels.th;

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('ใบอนุญาต');
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch employees for PDPA tracking and company filter
      const { data: empData, error: empErr } = await supabase
        .from('hr_employees')
        .select('id, employee_code, first_name_th, last_name_th, nickname, company_entity')
        .eq('status', 'active')
        .order('first_name_th');
      if (empErr) throw empErr;

      // Fetch documents joined with employee info
      const { data: docData, error: docErr } = await supabase
        .from('hr_documents')
        .select(`
          id,
          employee_id,
          document_type,
          title,
          description,
          file_url,
          file_name,
          file_size,
          version,
          status,
          expiry_date,
          uploaded_by,
          created_at,
          updated_at,
          hr_employees!hr_documents_employee_id_fkey (
            id, employee_code, first_name_th, last_name_th, nickname, company_entity
          )
        `)
        .order('created_at', { ascending: false });
      if (docErr) throw docErr;

      setEmployees(empData || []);

      // Process docs: calculate derived fields
      const processed = (docData || []).map(doc => {
        const emp = doc.hr_employees;
        const expiryStatus = calcExpiryStatus(doc.expiry_date, doc.status);
        const daysLeft = calcDaysLeft(doc.expiry_date);
        return {
          ...doc,
          tabCategory: toTabCategory(doc.document_type),
          expiryStatus,
          daysLeft,
          ownerName: emp
            ? `${emp.first_name_th} ${emp.last_name_th}${emp.nickname ? ` (${emp.nickname})` : ''}`
            : '-',
          ownerCompany: emp?.company_entity || '',
          ownerEmpId: emp?.id || doc.employee_id,
        };
      });

      setDocuments(processed);
      if (processed.length > 0) setSelectedDoc(processed[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter by company (using employee company_entity)
  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany]);
  const companyFilteredEmpIds = useMemo(
    () => new Set(companyFilteredEmployees.map(e => e.id)),
    [companyFilteredEmployees]
  );

  const companyDocs = useMemo(
    () => documents.filter(d => !d.ownerEmpId || companyFilteredEmpIds.has(d.ownerEmpId)),
    [documents, companyFilteredEmpIds]
  );

  // Tab + search filter
  const filteredDocs = useMemo(() => companyDocs.filter(d =>
    d.tabCategory === activeTab &&
    (d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [companyDocs, activeTab, searchTerm]);

  // KPI counts
  const kpis = useMemo(() => ({
    total: companyDocs.length,
    active: companyDocs.filter(d => d.status === 'active').length,
    expiring: companyDocs.filter(d => d.expiryStatus === 'expiring').length,
    expired: companyDocs.filter(d => d.expiryStatus === 'expired').length,
  }), [companyDocs]);

  // Expiring docs for right panel
  const expiringDocs = useMemo(() =>
    companyDocs
      .filter(d => d.expiryStatus === 'expiring')
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
      .slice(0, 5),
    [companyDocs]
  );

  // Tab options with counts
  const tabOptions = [
    { key: 'ใบอนุญาต',   label: t.tabLicenses,  count: companyDocs.filter(d => d.tabCategory === 'ใบอนุญาต').length },
    { key: 'สัญญาจ้าง',  label: t.tabContracts,  count: companyDocs.filter(d => d.tabCategory === 'สัญญาจ้าง').length },
    { key: 'ใบรับรอง',   label: t.tabCerts,      count: companyDocs.filter(d => d.tabCategory === 'ใบรับรอง').length },
    { key: 'เอกสารอื่นๆ', label: t.tabOther,     count: companyDocs.filter(d => d.tabCategory === 'เอกสารอื่นๆ').length },
    { key: 'PDPA Consent', label: t.tabPDPA,     count: companyDocs.filter(d => d.tabCategory === 'PDPA Consent').length },
  ];

  // Status badge
  const getStatusInfo = (expiryStatus, dbStatus) => {
    if (dbStatus === 'inactive') return { color: 'bg-gray-100 text-gray-500', label: 'ไม่ใช้งาน' };
    switch (expiryStatus) {
      case 'expired':  return { color: 'bg-red-100 text-red-700',    label: t.expiredLabel };
      case 'expiring': return { color: 'bg-yellow-100 text-yellow-700', label: t.expiringSoonLabel };
      default:         return { color: 'bg-green-100 text-green-700',  label: t.normal };
    }
  };

  // Format date
  const fmtDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH');
  };

  // Export
  const handleExport = () => {
    const columns = [
      { header: 'ชื่อเอกสาร', accessor: 'title', width: 30 },
      { header: 'ประเภท', accessor: 'document_type', width: 16 },
      { header: 'เจ้าของ', accessor: 'ownerName', width: 24 },
      { header: 'ชื่อไฟล์', accessor: 'file_name', width: 24 },
      { header: 'ขนาดไฟล์', accessor: (r) => formatFileSize(r.file_size), width: 12 },
      { header: 'เวอร์ชัน', accessor: 'version', width: 10 },
      { header: 'วันที่อัปโหลด', accessor: (r) => fmtDate(r.created_at), width: 14 },
      { header: 'วันหมดอายุ', accessor: (r) => fmtDate(r.expiry_date), width: 14 },
      { header: 'สถานะ', accessor: (r) => getStatusInfo(r.expiryStatus, r.status).label, width: 14 },
    ];
    exportToExcel({ data: companyDocs, columns, filename: 'documents', sheetName: 'เอกสาร' });
  };

  // Import columns
  const importColumns = [
    { header: 'รหัสพนักงาน', dbField: 'employee_id', example: 'uuid', width: 20 },
    { header: 'ประเภทเอกสาร', dbField: 'document_type', example: 'ใบอนุญาต', width: 18 },
    { header: 'ชื่อเอกสาร', dbField: 'title', example: 'ใบอนุญาตทำงาน 2026', width: 30 },
    { header: 'รายละเอียด', dbField: 'description', example: '', width: 30 },
    { header: 'ชื่อไฟล์', dbField: 'file_name', example: 'license_2026.pdf', width: 24 },
    { header: 'URL ไฟล์', dbField: 'file_url', example: 'https://...', width: 30 },
    { header: 'วันหมดอายุ', dbField: 'expiry_date', example: '2026-12-31', width: 14 },
  ];

  const handleImport = async (mappedData) => {
    const { data, error: err } = await supabase.from('hr_documents').insert(mappedData).select();
    if (err) throw err;
    await fetchData();
    return data?.length || 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <PageHeader title={t.title} lang={lang} />
        <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImport(true)} lang={lang} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={FileText}  iconBg="bg-blue-100"   iconColor="text-blue-600"   label={t.allDocs}     value={kpis.total} />
        <KPICard icon={FileCheck} iconBg="bg-green-100"  iconColor="text-green-600"  label={t.activeLabel} value={kpis.active} />
        <KPICard icon={Clock}     iconBg="bg-yellow-100" iconColor="text-yellow-600" label={t.expiringSoon} value={kpis.expiring} />
        <KPICard icon={AlertCircle} iconBg="bg-red-100"  iconColor="text-red-600"    label={t.expired}     value={kpis.expired} />
      </div>

      {/* Tab Pills */}
      <TabPills tabs={tabOptions} active={activeTab} onChange={setActiveTab} />

      {/* Search Row */}
      <Section>
        <input
          type="text"
          placeholder={t.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Section>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Document List */}
        <div className="flex-1">
          <Section title={`${activeTab} (${filteredDocs.length})`}>
            {filteredDocs.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">{t.noData}</p>
                <p className="text-xs mt-1">{t.noDataSub}</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.number}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.docName}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.type}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.owner}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.uploadDate}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.expiryDate}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc, idx) => {
                      const statusInfo = getStatusInfo(doc.expiryStatus, doc.status);
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc)}
                          className={`border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition ${selectedDoc?.id === doc.id ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-4 py-3 text-xs text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{doc.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{doc.document_type || '-'}</td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar name={doc.ownerName} size="sm" />
                              <span className="text-gray-900 truncate max-w-[120px]">{doc.ownerName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(doc.created_at)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{fmtDate(doc.expiry_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
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

        {/* Right: Detail Panel */}
        <DetailPanel>
          {selectedDoc && (
            <Section title={t.fileInfo}>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full h-28 bg-gray-100 rounded-lg">
                  <File className="w-12 h-12 text-gray-400" />
                </div>
                <div className="space-y-2.5 text-sm">
                  {[
                    { label: t.docName,    value: selectedDoc.title },
                    { label: t.docType,    value: selectedDoc.document_type || '-' },
                    { label: t.uploadedBy, value: selectedDoc.ownerName },
                    { label: t.fileSize,   value: formatFileSize(selectedDoc.file_size) },
                    { label: t.version,    value: selectedDoc.version ? `v${selectedDoc.version}` : '-' },
                    { label: t.uploadDate, value: fmtDate(selectedDoc.created_at) },
                    { label: t.expiryDate, value: fmtDate(selectedDoc.expiry_date) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-xs font-medium text-gray-900 text-right max-w-[55%] truncate">{value}</p>
                    </div>
                  ))}
                  {selectedDoc.description && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">{t.description}</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{selectedDoc.description}</p>
                    </div>
                  )}
                </div>
                {selectedDoc.file_url && (
                  <div className="flex gap-2 pt-2">
                    <a href={selectedDoc.file_url} download target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                      <Download className="w-4 h-4" />
                      {t.download}
                    </a>
                    <a href={selectedDoc.file_url} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
                      <Eye className="w-4 h-4" />
                      {t.preview}
                    </a>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Expiring Soon */}
          <Section title={t.upcomingExpiry}>
            <div className="space-y-3">
              {expiringDocs.length > 0 ? expiringDocs.map(doc => (
                <div key={doc.id} onClick={() => setSelectedDoc(doc)}
                  className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition">
                  <p className="text-xs font-semibold text-gray-900 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{doc.ownerName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-yellow-700">
                      {doc.daysLeft} {t.daysLeft}
                    </span>
                    <span className="text-xs text-gray-500">{fmtDate(doc.expiry_date)}</span>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-gray-400 py-4 text-center">ไม่มีเอกสารใกล้หมดอายุ</p>
              )}
            </div>
          </Section>
        </DetailPanel>
      </div>

      {/* PDPA Tracking */}
      <Section title={t.pdpaTracking}>
        {companyFilteredEmployees.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">ไม่มีข้อมูลพนักงาน</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.employee}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.consentStatus}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{t.consentDate}</th>
                </tr>
              </thead>
              <tbody>
                {companyFilteredEmployees.slice(0, 15).map(emp => {
                  const pdpaDoc = documents.find(
                    d => d.ownerEmpId === emp.id && d.tabCategory === 'PDPA Consent'
                  );
                  return (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-900">
                        {emp.first_name_th} {emp.last_name_th}
                        {emp.nickname ? ` (${emp.nickname})` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${pdpaDoc ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {pdpaDoc ? t.consented : t.pending}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {pdpaDoc ? fmtDate(pdpaDoc.created_at) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        columns={importColumns}
        tableName="hr_documents"
        lang={lang}
      />
    </div>
  );
}

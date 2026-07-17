import { useState, useEffect, useMemo } from 'react';
import { Wallet, Calculator, MinusCircle, Clock, Banknote, Plus, Download, Search, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { PageHeader, KPICard, Section, DetailPanel, Avatar, StatusBadge, TabPills } from '../components/PageUI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport';

// T helper for bilingual text
const T = (lang, th, en) => lang === 'th' ? th : en;

// Format number with comma and M suffix
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  }
  return num.toLocaleString('th-TH');
};

// Format number with comma only
const formatCurrency = (num) => num.toLocaleString('th-TH');

// ── Provident Fund (PVD) — กองทุนสำรองเลี้ยงชีพ ──
// อัตราสมทบ (แบบขั้นบันได ตามอายุสมาชิกภาพ) — นายจ้างสมทบเท่ากับพนักงาน
const PVD_CONTRIBUTION_TIERS = [
  { minYears: 8, rate: 0.06 },  // 8 ปีขึ้นไป → 6%
  { minYears: 6, rate: 0.05 },  // 6-8 ปี → 5%
  { minYears: 4, rate: 0.04 },  // 4-6 ปี → 4%
  { minYears: 0, rate: 0.03 },  // น้อยกว่า 4 ปี → 3%
];

// Vesting — สิทธิ์รับเงินสมทบนายจ้างเมื่อสิ้นสุดสมาชิกภาพ (ตามอายุงาน)
const PVD_VESTING_TIERS = [
  { minYears: 9, pct: 100 },  // 9 ปีขึ้นไป → 100%
  { minYears: 7, pct: 75 },   // 7-9 ปี → 75%
  { minYears: 5, pct: 50 },   // 5-7 ปี → 50%
  { minYears: 3, pct: 25 },   // 3-5 ปี → 25%
  { minYears: 0, pct: 0 },    // น้อยกว่า 3 ปี → 0%
];

function calcYearsOfService(hireDate, asOfDate) {
  if (!hireDate) return 0;
  const hire = new Date(hireDate);
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const diff = (now - hire) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, diff);
}

function getPvdRate(yearsOfService) {
  for (const tier of PVD_CONTRIBUTION_TIERS) {
    if (yearsOfService >= tier.minYears) return tier.rate;
  }
  return 0.03;
}

function getVestingPct(yearsOfService) {
  for (const tier of PVD_VESTING_TIERS) {
    if (yearsOfService >= tier.minYears) return tier.pct;
  }
  return 0;
}

function getPvdTierLabel(yearsOfService, lang) {
  const rate = getPvdRate(yearsOfService);
  const pct = (rate * 100).toFixed(0);
  const yrs = Math.floor(yearsOfService);
  return lang === 'th'
    ? `${pct}% (${yrs} ปี)`
    : `${pct}% (${yrs} yrs)`;
}

// Generate mock payroll data from employees
const generateMockPayrollData = (employees, month, year) => {
  const salaryGrades = {
    'G3': 18000,
    'G4': 25000,
    'G5': 35000,
    'G6': 45000,
    'G7': 55000,
    'G8': 70000,
    'G9': 90000,
  };

  const asOfDate = new Date(year, month - 1, 1);

  return employees.map(emp => {
    const salary = Number(emp.base_salary) || salaryGrades[emp.level] || 25000;
    const sso = Math.min(salary * 0.05, 750);

    // PVD calculation — อายุสมาชิกภาพ (ใช้ hire_date เป็นฐาน)
    const yearsOfService = calcYearsOfService(emp.hire_date, asOfDate);
    const pvdRate = getPvdRate(yearsOfService);
    const pvdEmployee = Math.round(salary * pvdRate);    // เงินสะสม (พนักงาน)
    const pvdEmployer = Math.round(salary * pvdRate);    // เงินสมทบ (นายจ้าง)
    const vestingPct = getVestingPct(yearsOfService);    // สิทธิ์รับเงินสมทบนายจ้าง

    // Progressive tax (simplified) — PVD ลดหย่อนภาษีได้
    const taxableIncome = salary - sso - pvdEmployee;
    let tax = 0;
    if (taxableIncome > 50000) {
      tax = (taxableIncome - 50000) * 0.05;
    }

    const ot = Math.floor(Math.random() * 15000);
    const net = salary + ot - sso - pvdEmployee - tax;

    const fullName = (lang) => {
      let n = lang === 'th'
        ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()
        : `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim();
      if (emp.nickname) n += ` (${emp.nickname})`;
      return n;
    };

    return {
      id: emp.id,
      employee_id: emp.id,
      employee_code: emp.employee_code,
      employee_name_th: fullName('th'),
      employee_name_en: fullName('en'),
      position: emp.position_th || emp.position_en || '',
      department_id: emp.department_id,
      department_name: emp.department_name,
      hire_date: emp.hire_date,
      years_of_service: yearsOfService,
      pvd_rate: pvdRate,
      pvd_employee: pvdEmployee,
      pvd_employer: pvdEmployer,
      vesting_pct: vestingPct,
      salary: salary,
      sso: sso,
      tax: tax,
      ot: ot,
      net: net,
      status: 'calculated',
      pay_period: `${year}-${String(month).padStart(2, '0')}-01`,
    };
  });
};

export default function Payroll({ lang }) {
  const { filterByCompany } = useCompanyFilter();
  const [activeTab, setActiveTab] = useState('individual');
  const [payrollData, setPayrollData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterDept, setFilterDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [showImport, setShowImport] = useState(false);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees
        const { data: empData } = await supabase
          .from('hr_employees')
          .select('*')
          .eq('status', 'active');

        // Fetch departments
        const { data: deptData } = await supabase
          .from('hr_departments')
          .select('*');

        const deptMap = {};
        (deptData || []).forEach(d => { deptMap[d.id] = d; });

        const enriched = (empData || []).map(emp => ({
          ...emp,
          department_name: deptMap[emp.department_id]?.name_th || '',
        }));

        setEmployees(enriched);
        setDepartments(deptData || []);

        // Fetch payroll data
        const payPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const { data: payData } = await supabase
          .from('hr_payroll')
          .select('*')
          .eq('pay_period', payPeriod);

        if (payData && payData.length > 0) {
          const empMap = {};
          enriched.forEach(e => { empMap[e.id] = e; });
          const asOfDate = new Date(selectedYear, selectedMonth - 1, 1);
          const merged = payData.map(p => {
            const emp = empMap[p.employee_id] || {};
            const salary = Number(p.base_salary) || 0;
            const yearsOfService = calcYearsOfService(emp.hire_date, asOfDate);
            const pvdRate = getPvdRate(yearsOfService);
            const pvdEmployee = Number(p.pvd_employee) || Math.round(salary * pvdRate);
            const pvdEmployer = Number(p.pvd_employer) || Math.round(salary * pvdRate);
            const vestingPct = getVestingPct(yearsOfService);
            return {
              id: p.employee_id,
              employee_id: p.employee_id,
              employee_code: emp.employee_code || '',
              employee_name_th: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
              employee_name_en: `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim(),
              position: emp.position_th || '',
              department_id: emp.department_id,
              department_name: emp.department_name || '',
              hire_date: emp.hire_date,
              years_of_service: yearsOfService,
              pvd_rate: pvdRate,
              pvd_employee: pvdEmployee,
              pvd_employer: pvdEmployer,
              vesting_pct: vestingPct,
              salary: salary,
              sso: Number(p.sso_employee) || 0,
              tax: Number(p.withholding_tax) || 0,
              ot: Number(p.overtime_pay) || 0,
              net: Number(p.net_pay) || 0,
              status: p.status || 'calculated',
              pay_period: payPeriod,
            };
          });
          setPayrollData(merged);
        } else {
          const mockPayroll = generateMockPayrollData(enriched, selectedMonth, selectedYear);
          setPayrollData(mockPayroll);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear, filterDept]);

  // Company-filtered payroll data
  const companyFilteredPayroll = useMemo(() => {
    const filteredEmpIds = new Set(filterByCompany(employees).map(e => e.id));
    return payrollData.filter(item => filteredEmpIds.has(item.employee_id));
  }, [payrollData, employees, filterByCompany]);

  // Filter payroll data by search and department
  const filteredPayroll = useMemo(() => {
    return companyFilteredPayroll.filter(item => {
      const name = lang === 'th' ? item.employee_name_th : item.employee_name_en;
      const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || item.employee_code?.includes(searchTerm);
      const matchesDept = filterDept === 'all' || item.department_id === filterDept;
      return matchesSearch && matchesDept;
    }).sort((a, b) => (b.salary || 0) - (a.salary || 0));
  }, [companyFilteredPayroll, searchTerm, filterDept, lang]);

  // Calculate KPI statistics
  const stats = useMemo(() => {
    const totalSalary = filteredPayroll.reduce((sum, p) => sum + (p.salary || 0), 0);
    const avgPerPerson = filteredPayroll.length > 0 ? Math.round(totalSalary / filteredPayroll.length) : 0;
    const totalPvdEmployee = filteredPayroll.reduce((sum, p) => sum + (p.pvd_employee || 0), 0);
    const totalPvdEmployer = filteredPayroll.reduce((sum, p) => sum + (p.pvd_employer || 0), 0);
    const totalDeductions = filteredPayroll.reduce((sum, p) => sum + ((p.sso || 0) + (p.tax || 0) + (p.pvd_employee || 0)), 0);
    const totalOT = filteredPayroll.reduce((sum, p) => sum + (p.ot || 0), 0);
    const totalNet = filteredPayroll.reduce((sum, p) => sum + (p.net || 0), 0);

    return {
      totalSalary,
      avgPerPerson,
      totalPvdEmployee,
      totalPvdEmployer,
      totalDeductions,
      totalOT,
      totalNet,
    };
  }, [filteredPayroll]);

  // Prepare department breakdown data for pie chart
  const deptBreakdown = useMemo(() => {
    const breakdown = {};
    filteredPayroll.forEach(item => {
      const deptName = item.department_name || T(lang, 'ไม่ระบุ', 'N/A');
      if (!breakdown[deptName]) {
        breakdown[deptName] = 0;
      }
      breakdown[deptName] += item.salary || 0;
    });

    return Object.entries(breakdown).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [filteredPayroll, lang]);

  const DEPT_COLOR = '#8b5cf6';

  // Export columns definition for Excel
  const exportColumns = [
    { header: T(lang, 'ลำดับ', 'No.'), accessor: (_, i) => i + 1, width: 8 },
    { header: T(lang, 'รหัสพนักงาน', 'Employee Code'), accessor: 'employee_code', width: 15 },
    { header: T(lang, 'ชื่อ-นามสกุล', 'Name'), accessor: (row) => lang === 'th' ? row.employee_name_th : row.employee_name_en, width: 20 },
    { header: T(lang, 'ตำแหน่ง', 'Position'), accessor: 'position', width: 18 },
    { header: T(lang, 'แผนก', 'Department'), accessor: 'department_name', width: 18 },
    { header: T(lang, 'อายุงาน (ปี)', 'Years'), accessor: (row) => Math.floor(row.years_of_service || 0), width: 10 },
    { header: T(lang, 'เงินเดือน', 'Salary'), accessor: 'salary', width: 14 },
    { header: T(lang, 'ประกันสังคม', 'SSO'), accessor: 'sso', width: 12 },
    { header: T(lang, 'กองทุนฯ อัตรา%', 'PVD Rate'), accessor: (row) => ((row.pvd_rate || 0) * 100).toFixed(0) + '%', width: 10 },
    { header: T(lang, 'กองทุนฯ พนง.', 'PVD Emp'), accessor: 'pvd_employee', width: 12 },
    { header: T(lang, 'กองทุนฯ นจ.', 'PVD ER'), accessor: 'pvd_employer', width: 12 },
    { header: T(lang, 'Vesting%', 'Vesting%'), accessor: (row) => (row.vesting_pct || 0) + '%', width: 10 },
    { header: T(lang, 'ภาษี', 'Tax'), accessor: 'tax', width: 12 },
    { header: T(lang, 'OT', 'OT'), accessor: 'ot', width: 12 },
    { header: T(lang, 'สุทธิ', 'Net'), accessor: 'net', width: 12 },
  ];

  // Import columns definition
  const importColumns = [
    {
      header: T(lang, 'รหัสพนักงาน', 'Employee Code'),
      accessor: 'employee_code',
      dbField: 'employee_code',
      example: 'EMP001',
      width: 15,
    },
    {
      header: T(lang, 'เงินเดือน', 'Salary'),
      accessor: 'salary',
      dbField: 'base_salary',
      example: '25000',
      transform: (v) => parseFloat(v) || 0,
      width: 14,
    },
    {
      header: T(lang, 'ประกันสังคม', 'SSO'),
      accessor: 'sso',
      dbField: 'sso_employee',
      example: '750',
      transform: (v) => parseFloat(v) || 0,
      width: 12,
    },
    {
      header: T(lang, 'ภาษี', 'Tax'),
      accessor: 'tax',
      dbField: 'withholding_tax',
      example: '0',
      transform: (v) => parseFloat(v) || 0,
      width: 12,
    },
    {
      header: T(lang, 'OT', 'OT'),
      accessor: 'ot',
      dbField: 'overtime_pay',
      example: '5000',
      transform: (v) => parseFloat(v) || 0,
      width: 12,
    },
    {
      header: T(lang, 'สุทธิ', 'Net'),
      accessor: 'net',
      dbField: 'net_pay',
      example: '29250',
      transform: (v) => parseFloat(v) || 0,
      width: 12,
    },
  ];

  // Handle export to Excel
  const handleExport = () => {
    const filename = `Payroll_${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    exportToExcel({
      data: filteredPayroll.map((item, i) => ({ ...item, index: i + 1 })),
      columns: exportColumns,
      filename,
      sheetName: T(lang, 'เงินเดือน', 'Payroll'),
    });
  };

  // Handle import from Excel
  const handleImport = async (mappedData) => {
    try {
      const payPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

      // Map employee codes to employee IDs
      const empMap = {};
      employees.forEach(emp => {
        empMap[emp.employee_code] = emp.id;
      });

      // Prepare records for insertion
      const records = mappedData.map(row => {
        const employeeId = empMap[row.employee_code];
        if (!employeeId) {
          throw new Error(`Employee code ${row.employee_code} not found`);
        }

        return {
          employee_id: employeeId,
          pay_period: payPeriod,
          base_salary: row.base_salary || 0,
          sso_employee: row.sso_employee || 0,
          withholding_tax: row.withholding_tax || 0,
          overtime_pay: row.overtime_pay || 0,
          net_pay: row.net_pay || 0,
          status: 'calculated',
        };
      }).filter(r => r.employee_id);

      if (records.length === 0) {
        throw new Error(T(lang, 'ไม่พบข้อมูลพนักงาน', 'No employee records found'));
      }

      // Upsert into database
      const { error } = await supabase
        .from('hr_payroll')
        .upsert(records, { onConflict: 'employee_id,pay_period' });

      if (error) throw error;

      // Refresh payroll data
      const newPayPeriod = payPeriod;
      const { data: updatedPayData } = await supabase
        .from('hr_payroll')
        .select('*')
        .eq('pay_period', newPayPeriod);

      if (updatedPayData) {
        const empMap2 = {};
        employees.forEach(e => { empMap2[e.id] = e; });
        const merged = updatedPayData.map(p => {
          const emp = empMap2[p.employee_id] || {};
          return {
            id: p.employee_id,
            employee_id: p.employee_id,
            employee_code: emp.employee_code || '',
            employee_name_th: `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim(),
            employee_name_en: `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim(),
            position: emp.position_th || '',
            department_id: emp.department_id,
            department_name: emp.department_name || '',
            salary: Number(p.base_salary) || 0,
            sso: Number(p.sso_employee) || 0,
            tax: Number(p.withholding_tax) || 0,
            ot: Number(p.overtime_pay) || 0,
            net: Number(p.net_pay) || 0,
            status: p.status || 'calculated',
            pay_period: newPayPeriod,
          };
        });
        setPayrollData(merged);
      }

      setShowImport(false);
      return records.length;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">{T(lang, 'กำลังโหลด...', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader title={T(lang, 'เงินเดือน', 'Payroll')} lang={lang} />

      {/* Sub-tabs */}
      <TabPills
        tabs={[
          { key: 'individual', label: T(lang, 'รายบุคคล', 'Individual') },
          { key: 'summary', label: T(lang, 'สรุปรวม', 'Summary') },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-32">
          <label className="text-xs text-gray-600 font-medium mb-1 block">{T(lang, 'เดือน', 'Month')}</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-32">
          <label className="text-xs text-gray-600 font-medium mb-1 block">{T(lang, 'ปี', 'Year')}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div className="flex-1 min-w-32">
          <label className="text-xs text-gray-600 font-medium mb-1 block">{T(lang, 'แผนก', 'Department')}</label>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">{T(lang, 'ทั้งหมด', 'All')}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {lang === 'th' ? d.name_th : d.name_en}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-40">
          <label className="text-xs text-gray-600 font-medium mb-1 block">{T(lang, 'ค้นหา', 'Search')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={T(lang, 'ชื่อหรือรหัสพนักงาน', 'Name or code')}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {T(lang, 'สร้างรายการเงินเดือน', 'Generate Payroll')}
        </button>

        <ImportExportButtons
          onExport={handleExport}
          onImportClick={() => setShowImport(true)}
          lang={lang}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          icon={Wallet}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={T(lang, 'เงินเดือนรวม', 'Total Salary')}
          value={formatNumber(stats.totalSalary)}
        />
        <KPICard
          icon={Calculator}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label={T(lang, 'เฉลี่ย/คน', 'Avg per Person')}
          value={formatCurrency(stats.avgPerPerson)}
        />
        <KPICard
          icon={Shield}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label={T(lang, 'กองทุนฯ (พนง+นจ)', 'PVD (Emp+ER)')}
          value={formatNumber(stats.totalPvdEmployee + stats.totalPvdEmployer)}
        />
        <KPICard
          icon={MinusCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label={T(lang, 'หักรวม', 'Total Deductions')}
          value={formatNumber(stats.totalDeductions)}
        />
        <KPICard
          icon={Clock}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label={T(lang, 'OT รวม', 'Total OT')}
          value={formatNumber(stats.totalOT)}
        />
        <KPICard
          icon={Banknote}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={T(lang, 'สุทธิรวม', 'Total Net')}
          value={formatNumber(stats.totalNet)}
        />
      </div>

      {/* Main Content: 65% left + 35% right */}
      <div className="flex gap-5">
        {/* Left Panel (~65%) */}
        <div className="flex-1 space-y-4">
          {/* Summary Section */}
          <Section title={T(lang, 'สรุปการจ่ายเงินเดือน', 'Payroll Summary')}>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">{T(lang, 'จำนวนพนักงาน', 'Total Employees')}</p>
                <p className="text-2xl font-bold text-gray-900">{filteredPayroll.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{T(lang, 'ระหว่าง', 'Period')}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{T(lang, 'สถานะ', 'Status')}</p>
                <p className="text-sm font-semibold text-blue-600">{T(lang, 'คำนวณแล้ว', 'Calculated')}</p>
              </div>
            </div>
          </Section>

          {/* Payroll Details Table */}
          <Section title={T(lang, 'รายละเอียดเงินเดือน', 'Payroll Details')}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">{T(lang, 'ลำดับ', '#')}</th>
                    <th className="text-left px-2 py-2 font-semibold text-gray-700">{T(lang, 'ชื่อ-นามสกุล', 'Name')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'อายุงาน', 'Yrs')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'เงินเดือน', 'Salary')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'ประกันสังคม', 'SSO')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-purple-700">
                      <div className="flex items-center justify-end gap-1">
                        <Shield className="w-3 h-3" />
                        {T(lang, 'กองทุนฯ', 'PVD')}
                      </div>
                    </th>
                    <th className="text-right px-2 py-2 font-semibold text-purple-500 text-[11px]">{T(lang, 'นจ.สมทบ', 'ER')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'ภาษี', 'Tax')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'OT', 'OT')}</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-700">{T(lang, 'สุทธิ', 'Net')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayroll.map((item, idx) => {
                    const empName = lang === 'th' ? item.employee_name_th : item.employee_name_en;
                    const yrs = Math.floor(item.years_of_service || 0);
                    const pvdPct = ((item.pvd_rate || 0) * 100).toFixed(0);
                    return (
                      <tr key={item.employee_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-2 text-gray-600">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={empName} size="sm" />
                            <div>
                              <span className="text-gray-900 font-medium text-xs">{empName}</span>
                              <p className="text-[10px] text-gray-400">{item.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right text-gray-500 text-xs">{yrs} {T(lang, 'ปี', 'y')}</td>
                        <td className="px-2 py-2 text-right text-gray-900 font-medium">{formatCurrency(item.salary)}</td>
                        <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(item.sso)}</td>
                        <td className="px-2 py-2 text-right text-purple-700 font-medium">
                          <span>{formatCurrency(item.pvd_employee)}</span>
                          <span className="text-[10px] text-purple-400 ml-0.5">({pvdPct}%)</span>
                        </td>
                        <td className="px-2 py-2 text-right text-purple-400 text-xs">{formatCurrency(item.pvd_employer)}</td>
                        <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(item.tax)}</td>
                        <td className="px-2 py-2 text-right text-orange-600 font-medium">{formatCurrency(item.ot)}</td>
                        <td className="px-2 py-2 text-right text-green-600 font-bold">{formatCurrency(item.net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* Right Panel (~35%) */}
        <DetailPanel>
          {/* Department Distribution Chart */}
          <Section title={T(lang, 'การกระจายเงินเดือนตามแผนก', 'Salary by Department')}>
            {deptBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, deptBreakdown.sort((a, b) => b.value - a.value).slice(0, 10).length * 32 + 20)}>
                <BarChart
                  data={deptBreakdown.sort((a, b) => b.value - a.value).slice(0, 10).map(d => ({
                    ...d,
                    name: d.name.length > 16 ? d.name.slice(0, 16) + '…' : d.name,
                    fullName: d.name,
                    displayValue: Math.round(d.value / 1000)
                  }))}
                  layout="vertical"
                  barSize={18}
                  margin={{ left: 5, right: 45, top: 5, bottom: 5 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#ddd" tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + 'M' : v + 'K'} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#ddd" width={120} />
                  <Tooltip formatter={(value, _, p) => [formatCurrency(p.payload.value || value), p.payload.fullName || p.payload.name]} />
                  <Bar dataKey="displayValue" fill={DEPT_COLOR} radius={[0, 5, 5, 0]}
                    label={{ position: 'right', fontSize: 9, fill: '#6d28d9', formatter: (v) => v >= 1000 ? (v / 1000).toFixed(1) + 'M' : v + 'K' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">{T(lang, 'ไม่มีข้อมูล', 'No data')}</p>
            )}
          </Section>

          {/* PVD Summary */}
          <Section title={T(lang, 'กองทุนสำรองเลี้ยงชีพ (PVD)', 'Provident Fund (PVD)')}>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'เงินสะสม (พนักงาน)', 'Employee Savings')}</span>
                <span className="font-bold text-purple-700">{formatNumber(stats.totalPvdEmployee)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'เงินสมทบ (นายจ้าง)', 'Employer Match')}</span>
                <span className="font-bold text-purple-500">{formatNumber(stats.totalPvdEmployer)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-purple-100 rounded-lg border border-purple-200">
                <span className="text-xs font-bold text-purple-800">{T(lang, 'รวมนำส่งกองทุนฯ', 'Total to Fund')}</span>
                <span className="font-bold text-purple-800">{formatNumber(stats.totalPvdEmployee + stats.totalPvdEmployer)}</span>
              </div>
              {/* Tier breakdown */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">{T(lang, 'อัตราสมทบตามอายุสมาชิกภาพ', 'Contribution Rate Tiers')}</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '< 4 ปี', '< 4 yrs')}</span><span className="font-medium">3%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '4-6 ปี', '4-6 yrs')}</span><span className="font-medium">4%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '6-8 ปี', '6-8 yrs')}</span><span className="font-medium">5%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '8+ ปี', '8+ yrs')}</span><span className="font-medium">6%</span></div>
                </div>
              </div>
              {/* Vesting schedule */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">{T(lang, 'สิทธิ์รับเงินสมทบนายจ้าง (Vesting)', 'Employer Vesting Schedule')}</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '< 3 ปี', '< 3 yrs')}</span><span className="font-medium text-red-500">0%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '3-5 ปี', '3-5 yrs')}</span><span className="font-medium text-orange-500">25%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '5-7 ปี', '5-7 yrs')}</span><span className="font-medium text-yellow-600">50%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '7-9 ปี', '7-9 yrs')}</span><span className="font-medium text-blue-500">75%</span></div>
                  <div className="flex justify-between text-gray-600"><span>{T(lang, '9+ ปี', '9+ yrs')}</span><span className="font-medium text-green-600">100%</span></div>
                </div>
              </div>
            </div>
          </Section>

          {/* Personnel Expense Summary */}
          <Section title={T(lang, 'สรุปค่าใช้จ่ายด้านบุคลากร', 'Personnel Expense Summary')}>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'เงินเดือนรวม', 'Total Salary')}</span>
                <span className="font-bold text-blue-600">{formatNumber(stats.totalSalary)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'กองทุนฯ นายจ้าง', 'PVD Employer')}</span>
                <span className="font-bold text-purple-600">{formatNumber(stats.totalPvdEmployer)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'หักรวม (สส.+ภาษี+กองทุนฯ)', 'Deductions (SSO+Tax+PVD)')}</span>
                <span className="font-bold text-red-600">{formatNumber(stats.totalDeductions)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'OT รวม', 'Total OT')}</span>
                <span className="font-bold text-orange-600">{formatNumber(stats.totalOT)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="text-xs font-medium text-gray-600">{T(lang, 'สุทธิรวม', 'Total Net')}</span>
                <span className="font-bold text-green-600">{formatNumber(stats.totalNet)}</span>
              </div>
            </div>
          </Section>
        </DetailPanel>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        columns={importColumns}
        tableName={T(lang, 'เงินเดือน', 'Payroll')}
        lang={lang}
      />
    </div>
  );
}

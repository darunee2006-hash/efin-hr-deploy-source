import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { Download, TrendingDown, Users, BookOpen, Briefcase, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader, KPICard, Section, DetailPanel, TabPills } from '../components/PageUI';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Reports({ lang }) {
  const { filterByCompany } = useCompanyFilter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('headcount');
  const [filterType, setFilterType] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('12m');

  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recruitment, setRecruitment] = useState([]);
  const [training, setTraining] = useState([]);

  const t = {
    th: {
      title: 'รายงาน',
      filter: 'ตัวกรอง',
      type: 'ประเภท',
      department: 'แผนก',
      period: 'ช่วงเวลา',
      export: 'ส่งออก',
      employees: 'พนักงานปัจจุบัน',
      turnover: 'อัตราลาออก',
      peopleCost: 'ค่าใช้จ่ายบุคลากร',
      training: 'ชม.ฝึกอบรม',
      openPositions: 'ตำแหน่งเปิดรับ',
      headcountTrend: 'สถิติจำนวนพนักงาน (Headcount Trend)',
      departmentStructure: 'โครงสร้างตามแผนก',
      peopleCostChart: 'ค่าใช้จ่ายบุคลากร People Cost (ล้านบาท)',
      gradeDistribution: 'สถิติจำนวนพนักงานตามระดับ (Job Grade)',
      popularReports: 'สรุปรายงาน',
      downloadCount: 'ดาวน์โหลด',
      headcount: 'Headcount',
      headcountTab: 'Headcount',
      turnoverTab: 'Turnover',
      trainingTab: 'Training',
      recruitmentTab: 'Recruitment'
    },
    en: {
      title: 'Reports',
      filter: 'Filter',
      type: 'Type',
      department: 'Department',
      period: 'Period',
      export: 'Export',
      employees: 'Current Employees',
      turnover: 'Turnover Rate',
      peopleCost: 'People Cost',
      training: 'Training Hours',
      openPositions: 'Open Positions',
      headcountTrend: 'Headcount Trend',
      departmentStructure: 'Department Structure',
      peopleCostChart: 'People Cost (M Baht)',
      gradeDistribution: 'Grade Distribution (Job Grade)',
      popularReports: 'Report Summary',
      downloadCount: 'Downloads',
      headcount: 'Headcount',
      headcountTab: 'Headcount',
      turnoverTab: 'Turnover',
      trainingTab: 'Training',
      recruitmentTab: 'Recruitment'
    }
  };

  const labels = t[lang] || t.en;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [empRes, deptRes, recRes, trainRes] = await Promise.all([
          supabase.from('hr_employees').select('*'),
          supabase.from('hr_departments').select('*'),
          supabase.from('hr_recruitment').select('id,status'),
          supabase.from('hr_training').select('id,hours,participants_count')
        ]);

        setAllEmployees(empRes.data || []);
        setDepartments(deptRes.data || []);
        setRecruitment(recRes.data || []);
        setTraining(trainRes.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [lang]);

  // Company-filtered employees
  const companyFilteredEmployees = useMemo(() => filterByCompany(allEmployees), [allEmployees, filterByCompany]);

  // Active employees only
  const activeEmployees = useMemo(() => companyFilteredEmployees.filter(e => e.status === 'active'), [companyFilteredEmployees]);

  // --- Computed KPIs from real data ---
  const now = new Date();
  const cy = now.getFullYear();

  const kpis = useMemo(() => {
    const active = activeEmployees.length;
    const resignedThisYear = companyFilteredEmployees.filter(e => {
      const d = e.resignation_date ? new Date(e.resignation_date) : null;
      return d && d.getFullYear() === cy;
    }).length;
    const newHiresThisYear = companyFilteredEmployees.filter(e => {
      const d = e.hire_date ? new Date(e.hire_date) : null;
      return d && d.getFullYear() === cy;
    }).length;
    const beginOfYear = active - newHiresThisYear + resignedThisYear;
    const avgHead = (beginOfYear + active) / 2;
    const turnoverRate = avgHead > 0 ? Math.round((resignedThisYear / avgHead) * 1000) / 10 : 0;

    const totalSalary = activeEmployees.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0);
    const peopleCostM = totalSalary > 0 ? (totalSalary / 1000000).toFixed(1) : '0';

    const totalTrainingHours = (training || []).reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
    const openPositions = (recruitment || []).filter(r => r.status === 'open' || r.status === 'screening' || r.status === 'interviewing').length;

    return { active, turnoverRate, peopleCostM, totalSalary, totalTrainingHours, openPositions, resignedThisYear, newHiresThisYear, beginOfYear };
  }, [activeEmployees, companyFilteredEmployees, cy, training, recruitment]);

  // --- Headcount Trend (computed from hire/resignation dates) ---
  const monthlyHeadcount = useMemo(() => {
    const monthNames = lang === 'th'
      ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const currentMonth = now.getMonth(); // 0-indexed
    const result = [];

    for (let m = 0; m <= currentMonth; m++) {
      const endOfMonth = new Date(cy, m + 1, 0); // last day of month m
      let count = 0;
      companyFilteredEmployees.forEach(e => {
        const hd = e.hire_date ? new Date(e.hire_date) : null;
        const rd = e.resignation_date ? new Date(e.resignation_date) : null;
        if (!hd || hd > endOfMonth) return; // not yet hired
        if (rd && rd < new Date(cy, m, 1)) return; // already resigned before this month started
        count++;
      });
      result.push({ name: monthNames[m], headcount: count });
    }
    return result;
  }, [companyFilteredEmployees, lang, cy]);

  // --- People Cost chart (salary per month = total base_salary for active at that month) ---
  const monthlyPeopleCost = useMemo(() => {
    const monthNames = lang === 'th'
      ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const currentMonth = now.getMonth();
    const result = [];
    for (let m = 0; m <= currentMonth; m++) {
      const endOfMonth = new Date(cy, m + 1, 0);
      let totalSal = 0;
      companyFilteredEmployees.forEach(e => {
        const hd = e.hire_date ? new Date(e.hire_date) : null;
        const rd = e.resignation_date ? new Date(e.resignation_date) : null;
        if (!hd || hd > endOfMonth) return;
        if (rd && rd < new Date(cy, m, 1)) return;
        totalSal += Number(e.base_salary) || 0;
      });
      result.push({ name: monthNames[m], cost: Math.round(totalSal / 100000) / 10 }); // in millions with 1 decimal
    }
    return result;
  }, [companyFilteredEmployees, lang, cy]);

  // Department distribution from filtered employees (using name_th)
  const computedDepartmentDist = useMemo(() => {
    const deptMap = {};
    departments.forEach(d => { deptMap[d.id] = lang === 'th' ? (d.name_th || d.name_en || d.name || d.code) : (d.name_en || d.name_th || d.name || d.code); });
    const dist = {};
    activeEmployees.forEach(e => {
      const deptName = deptMap[e.department_id] || 'อื่นๆ';
      dist[deptName] = (dist[deptName] || 0) + 1;
    });
    const result = Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, fullName: name, value }));
    return result.length > 0 ? result : [{ name: 'N/A', value: 0 }];
  }, [activeEmployees, departments, lang]);

  // Grade distribution from filtered employees
  const computedGradeDist = useMemo(() => {
    const dist = {};
    activeEmployees.forEach(e => {
      const grade = e.job_grade || e.level || 'ไม่ระบุ';
      dist[grade] = (dist[grade] || 0) + 1;
    });
    const result = Object.entries(dist).sort((a, b) => {
      // Sort grades naturally: G3, G4, ... G9, then others
      const ga = a[0].replace(/\D/g, ''); const gb = b[0].replace(/\D/g, '');
      if (ga && gb) return Number(ga) - Number(gb);
      return a[0].localeCompare(b[0]);
    }).map(([name, value]) => ({ name, value }));
    return result.length > 0 ? result : [{ name: 'N/A', value: 0 }];
  }, [activeEmployees]);

  // Y-axis domain for headcount
  const headcountDomain = useMemo(() => {
    if (monthlyHeadcount.length === 0) return [0, 10];
    const values = monthlyHeadcount.map(d => d.headcount);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.max(0, min - 10), max + 10];
  }, [monthlyHeadcount]);

  // Report summary items (real data-based)
  const reportSummary = useMemo(() => [
    { id: 1, label: lang === 'th' ? 'พนักงานปัจจุบัน' : 'Active Employees', value: kpis.active, type: 'Headcount' },
    { id: 2, label: lang === 'th' ? 'เข้าใหม่ปีนี้' : 'New Hires (YTD)', value: kpis.newHiresThisYear, type: 'Headcount' },
    { id: 3, label: lang === 'th' ? 'ลาออกปีนี้' : 'Resigned (YTD)', value: kpis.resignedThisYear, type: 'Turnover' },
    { id: 4, label: lang === 'th' ? 'ตำแหน่งเปิดรับ' : 'Open Positions', value: kpis.openPositions, type: 'Recruitment' },
    { id: 5, label: lang === 'th' ? 'แผนกทั้งหมด' : 'Total Departments', value: computedDepartmentDist.filter(d => d.name !== 'N/A').length, type: 'Structure' },
  ], [kpis, lang, computedDepartmentDist]);

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [{
      'Active Employees': kpis.active,
      'Turnover Rate (%)': kpis.turnoverRate,
      'People Cost (M)': kpis.peopleCostM,
      'Training Hours': kpis.totalTrainingHours,
      'Open Positions': kpis.openPositions
    }];
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Reports');
    XLSX.writeFile(workbook, `HR_Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="px-6 pt-6">
        <PageHeader title={labels.title} lang={lang} />
      </div>

      <div className="px-6 pb-6 space-y-6">
        {/* Filters */}
        <Section className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-2">{labels.type}</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">{lang === 'th' ? 'ทั้งหมด' : 'All Types'}</option>
              <option value="fulltime">{lang === 'th' ? 'พนักงานประจำ' : 'Full Time'}</option>
              <option value="contract">{lang === 'th' ? 'สัญญาจ้าง' : 'Contract'}</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-2">{labels.department}</label>
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">{lang === 'th' ? 'ทุกแผนก' : 'All Departments'}</option>
              {departments.map(d => <option key={d.id} value={d.id}>{lang === 'th' ? (d.name_th || d.name_en || d.code) : (d.name_en || d.name_th || d.code)}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-2">{labels.period}</label>
            <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="3m">{lang === 'th' ? '3 เดือนล่าสุด' : 'Last 3 months'}</option>
              <option value="6m">{lang === 'th' ? '6 เดือนล่าสุด' : 'Last 6 months'}</option>
              <option value="12m">{lang === 'th' ? '12 เดือนล่าสุด' : 'Last 12 months'}</option>
            </select>
          </div>
          <button onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors">
            <Download size={16} />
            {labels.export}
          </button>
        </Section>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <KPICard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600"
            label={labels.employees} value={kpis.active} />
          <KPICard icon={TrendingDown} iconBg="bg-red-100" iconColor="text-red-600"
            label={labels.turnover} value={`${kpis.turnoverRate}%`} />
          <KPICard icon={DollarSign} iconBg="bg-green-100" iconColor="text-green-600"
            label={labels.peopleCost} value={`${kpis.peopleCostM}M`} />
          <KPICard icon={BookOpen} iconBg="bg-orange-100" iconColor="text-orange-600"
            label={labels.training} value={kpis.totalTrainingHours} />
          <KPICard icon={Briefcase} iconBg="bg-purple-100" iconColor="text-purple-600"
            label={labels.openPositions} value={kpis.openPositions} />
        </div>

        {/* Tab Pills */}
        <div>
          <TabPills
            tabs={[
              { key: 'headcount', label: labels.headcountTab },
              { key: 'turnover', label: labels.turnoverTab },
              { key: 'training', label: labels.trainingTab },
              { key: 'recruitment', label: labels.recruitmentTab }
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Charts Grid - Top Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Headcount Trend */}
          <Section title={labels.headcountTrend}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyHeadcount}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={headcountDomain} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="headcount" stroke="#3b82f6" dot={{ fill: '#3b82f6', r: 4 }} name="Headcount" />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          {/* Department Distribution */}
          <Section title={labels.departmentStructure}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={computedDepartmentDist}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {computedDepartmentDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n, p) => [v + ' คน', p.payload.fullName || p.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
          </Section>

          {/* People Cost */}
          <Section title={labels.peopleCostChart}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyPeopleCost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value.toFixed(1)}M`, lang === 'th' ? 'ค่าใช้จ่าย' : 'Cost']} />
                <Bar dataKey="cost" fill="#10b981" name={lang === 'th' ? 'ค่าใช้จ่าย (ล้าน)' : 'Cost (M)'} />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Grade Distribution */}
          <div className="col-span-2">
            <Section title={labels.gradeDistribution}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={computedGradeDist} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" label={{ position: 'right', fontSize: 11, fill: '#92400e' }} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* Report Summary */}
          <DetailPanel>
            <Section title={labels.popularReports} className="h-full">
              <div className="space-y-3">
                {reportSummary.map((item) => (
                  <div key={item.id} className="pb-3 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-xs font-medium text-gray-800 flex-1">{item.label}</h4>
                      <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.value}</span>
                    </div>
                    <span className="text-xs text-gray-400">{item.type}</span>
                  </div>
                ))}
              </div>
            </Section>
          </DetailPanel>
        </div>
      </div>
    </div>
  );
}

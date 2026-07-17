import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { PageHeader, KPICard, Section, DetailPanel, ProgressBar, StatusBadge as UIStatusBadge } from '../components/PageUI';
import { exportToExcel, ImportModal, ImportExportButtons } from '../components/ImportExport';
import {
  BookOpen,
  CheckCircle,
  Users,
  Clock,
  Wallet,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const LABELS = {
  en: {
    title: 'Training',
    schedule: 'Training Schedule for the Year',
    popular: 'Popular Courses',
    skillGap: 'CP & Skill Gap Summary',
    registrationTracking: 'Registration Tracking (Overview)',
    deepStats: 'Training Deep Statistics',
    achievement: 'Individual Achievement (IDT)',
  },
  th: {
    title: 'ฝึกอบรม',
    schedule: 'ปฏิทินการฝึกอบรมประจำปี',
    popular: 'เนตร์หลักสูตรยอดนิยม',
    skillGap: 'สรุป CP & Skill Gap',
    registrationTracking: 'การติดตามการลงทะเบียน (ภาพรวม)',
    deepStats: 'สถิติการฝึกอบรมเชิงลึก',
    achievement: 'ผลสัมฤทธิ์รายบุคคล (IDT)',
  },
};

const getLabel = (key, lang) => LABELS[lang]?.[key] || LABELS.en[key];

// Mock data: 48 courses across categories
const mockCourses = [
  // Technical Skills
  { id: 1, name: 'Python Programming Fundamentals', nameEn: 'Python Programming Fundamentals', category: 'Technical', dateStart: '2026-01-10', dateEnd: '2026-01-24', status: 'completed', participants: 42, hours: 16, budget: 150000 },
  { id: 2, name: 'Data Analytics for Business', nameEn: 'Data Analytics for Business', category: 'Technical', dateStart: '2026-02-01', dateEnd: '2026-02-19', status: 'ongoing', participants: 38, hours: 20, budget: 180000 },
  { id: 3, name: 'Cloud Computing with AWS', nameEn: 'Cloud Computing with AWS', category: 'Technical', dateStart: '2026-03-05', dateEnd: '2026-03-26', status: 'ongoing', participants: 25, hours: 24, budget: 250000 },
  { id: 4, name: 'Power BI Dashboard Development', nameEn: 'Power BI Dashboard Development', category: 'Technical', dateStart: '2026-01-20', dateEnd: '2026-02-03', status: 'completed', participants: 35, hours: 16, budget: 160000 },
  { id: 5, name: 'Advanced SQL & Database Design', nameEn: 'Advanced SQL & Database Design', category: 'Technical', dateStart: '2026-04-01', dateEnd: '2026-04-22', status: 'registering', participants: 28, hours: 20, budget: 170000 },
  { id: 6, name: 'Machine Learning Essentials', nameEn: 'Machine Learning Essentials', category: 'Technical', dateStart: '2026-05-10', dateEnd: '2026-06-07', status: 'registering', participants: 18, hours: 28, budget: 220000 },

  // Soft Skills
  { id: 7, name: 'Effective Communication Skills', nameEn: 'Effective Communication Skills', category: 'Soft Skills', dateStart: '2026-01-12', dateEnd: '2026-01-26', status: 'completed', participants: 89, hours: 8, budget: 120000 },
  { id: 8, name: 'Emotional Intelligence in Workplace', nameEn: 'Emotional Intelligence in Workplace', category: 'Soft Skills', dateStart: '2026-02-10', dateEnd: '2026-02-24', status: 'completed', participants: 76, hours: 8, budget: 110000 },
  { id: 9, name: 'Conflict Resolution & Negotiation', nameEn: 'Conflict Resolution & Negotiation', category: 'Soft Skills', dateStart: '2026-03-15', dateEnd: '2026-03-29', status: 'ongoing', participants: 54, hours: 8, budget: 95000 },
  { id: 10, name: 'Time Management & Productivity', nameEn: 'Time Management & Productivity', category: 'Soft Skills', dateStart: '2026-04-05', dateEnd: '2026-04-12', status: 'registering', participants: 42, hours: 4, budget: 60000 },
  { id: 11, name: 'Customer Service Excellence', nameEn: 'Customer Service Excellence', category: 'Soft Skills', dateStart: '2026-05-01', dateEnd: '2026-05-15', status: 'registering', participants: 65, hours: 8, budget: 100000 },
  { id: 12, name: 'Public Speaking & Presentation', nameEn: 'Public Speaking & Presentation', category: 'Soft Skills', dateStart: '2026-06-10', dateEnd: '2026-06-24', status: 'registering', participants: 38, hours: 8, budget: 85000 },

  // Leadership
  { id: 13, name: 'Leadership Fundamentals', nameEn: 'Leadership Fundamentals', category: 'Leadership', dateStart: '2026-01-15', dateEnd: '2026-02-05', status: 'completed', participants: 45, hours: 16, budget: 200000 },
  { id: 14, name: 'Strategic Planning & Vision', nameEn: 'Strategic Planning & Vision', category: 'Leadership', dateStart: '2026-02-20', dateEnd: '2026-03-13', status: 'completed', participants: 32, hours: 12, budget: 150000 },
  { id: 15, name: 'Team Building & Culture', nameEn: 'Team Building & Culture', category: 'Leadership', dateStart: '2026-03-20', dateEnd: '2026-04-10', status: 'ongoing', participants: 28, hours: 12, budget: 140000 },
  { id: 16, name: 'Change Management Masterclass', nameEn: 'Change Management Masterclass', category: 'Leadership', dateStart: '2026-04-25', dateEnd: '2026-05-16', status: 'registering', participants: 22, hours: 12, budget: 130000 },
  { id: 17, name: 'Executive Coaching Program', nameEn: 'Executive Coaching Program', category: 'Leadership', dateStart: '2026-05-20', dateEnd: '2026-07-10', status: 'registering', participants: 15, hours: 20, budget: 300000 },
  { id: 18, name: 'Mentoring & Coaching Skills', nameEn: 'Mentoring & Coaching Skills', category: 'Leadership', dateStart: '2026-06-15', dateEnd: '2026-07-06', status: 'registering', participants: 35, hours: 12, budget: 120000 },

  // Compliance
  { id: 19, name: 'Occupational Safety & Health (OSH)', nameEn: 'Occupational Safety & Health (OSH)', category: 'Compliance', dateStart: '2026-01-05', dateEnd: '2026-01-09', status: 'completed', participants: 127, hours: 4, budget: 50000 },
  { id: 20, name: 'Labor Law Compliance Update', nameEn: 'Labor Law Compliance Update', category: 'Compliance', dateStart: '2026-02-02', dateEnd: '2026-02-06', status: 'completed', participants: 98, hours: 4, budget: 45000 },
  { id: 21, name: 'Data Privacy & GDPR', nameEn: 'Data Privacy & GDPR', category: 'Compliance', dateStart: '2026-03-10', dateEnd: '2026-03-14', status: 'ongoing', participants: 72, hours: 4, budget: 55000 },
  { id: 22, name: 'Anti-Corruption & Fraud Prevention', nameEn: 'Anti-Corruption & Fraud Prevention', category: 'Compliance', dateStart: '2026-04-08', dateEnd: '2026-04-12', status: 'registering', participants: 85, hours: 4, budget: 60000 },
  { id: 23, name: 'ISO Standards Awareness', nameEn: 'ISO Standards Awareness', category: 'Compliance', dateStart: '2026-05-05', dateEnd: '2026-05-09', status: 'registering', participants: 64, hours: 4, budget: 50000 },
  { id: 24, name: 'Environmental Management', nameEn: 'Environmental Management', category: 'Compliance', dateStart: '2026-06-20', dateEnd: '2026-06-24', status: 'registering', participants: 43, hours: 4, budget: 48000 },

  // Digital Transformation
  { id: 25, name: 'Digital Transformation Strategy', nameEn: 'Digital Transformation Strategy', category: 'Digital', dateStart: '2026-01-18', dateEnd: '2026-02-08', status: 'completed', participants: 62, hours: 12, budget: 140000 },
  { id: 26, name: 'RPA & Process Automation', nameEn: 'RPA & Process Automation', category: 'Digital', dateStart: '2026-02-15', dateEnd: '2026-03-08', status: 'completed', participants: 29, hours: 16, budget: 180000 },
  { id: 27, name: 'Business Process Improvement', nameEn: 'Business Process Improvement', category: 'Digital', dateStart: '2026-03-22', dateEnd: '2026-04-12', status: 'ongoing', participants: 44, hours: 12, budget: 130000 },
  { id: 28, name: 'Artificial Intelligence Basics', nameEn: 'Artificial Intelligence Basics', category: 'Digital', dateStart: '2026-04-20', dateEnd: '2026-05-11', status: 'registering', participants: 31, hours: 12, budget: 150000 },
  { id: 29, name: 'Cybersecurity Awareness', nameEn: 'Cybersecurity Awareness', category: 'Digital', dateStart: '2026-05-25', dateEnd: '2026-06-08', status: 'registering', participants: 103, hours: 6, budget: 70000 },
  { id: 30, name: 'Digital Marketing Strategy', nameEn: 'Digital Marketing Strategy', category: 'Digital', dateStart: '2026-06-25', dateEnd: '2026-07-16', status: 'registering', participants: 37, hours: 12, budget: 120000 },

  // Additional courses to reach 48
  { id: 31, name: 'Project Management Professional', nameEn: 'Project Management Professional', category: 'Technical', dateStart: '2026-02-20', dateEnd: '2026-03-13', status: 'completed', participants: 33, hours: 20, budget: 200000 },
  { id: 32, name: 'Agile Development Methodology', nameEn: 'Agile Development Methodology', category: 'Technical', dateStart: '2026-03-25', dateEnd: '2026-04-15', status: 'ongoing', participants: 26, hours: 16, budget: 170000 },
  { id: 33, name: 'JavaScript & Web Development', nameEn: 'JavaScript & Web Development', category: 'Technical', dateStart: '2026-05-15', dateEnd: '2026-06-12', status: 'registering', participants: 22, hours: 24, budget: 210000 },
  { id: 34, name: 'API Development & Integration', nameEn: 'API Development & Integration', category: 'Technical', dateStart: '2026-06-10', dateEnd: '2026-07-01', status: 'registering', participants: 17, hours: 16, budget: 160000 },
  { id: 35, name: 'Assertiveness Training', nameEn: 'Assertiveness Training', category: 'Soft Skills', dateStart: '2026-01-25', dateEnd: '2026-02-08', status: 'completed', participants: 51, hours: 6, budget: 80000 },
  { id: 36, name: 'Critical Thinking Workshop', nameEn: 'Critical Thinking Workshop', category: 'Soft Skills', dateStart: '2026-04-15', dateEnd: '2026-04-22', status: 'registering', participants: 39, hours: 6, budget: 75000 },
  { id: 37, name: 'Innovation & Creativity', nameEn: 'Innovation & Creativity', category: 'Soft Skills', dateStart: '2026-05-20', dateEnd: '2026-06-03', status: 'registering', participants: 47, hours: 8, budget: 105000 },
  { id: 38, name: 'Decision Making Skills', nameEn: 'Decision Making Skills', category: 'Soft Skills', dateStart: '2026-07-01', dateEnd: '2026-07-08', status: 'registering', participants: 34, hours: 6, budget: 70000 },
  { id: 39, name: 'Senior Leadership Program', nameEn: 'Senior Leadership Program', category: 'Leadership', dateStart: '2026-03-02', dateEnd: '2026-04-20', status: 'ongoing', participants: 12, hours: 24, budget: 350000 },
  { id: 40, name: 'Performance Management', nameEn: 'Performance Management', category: 'Leadership', dateStart: '2026-06-01', dateEnd: '2026-06-22', status: 'registering', participants: 18, hours: 10, budget: 125000 },
  { id: 41, name: 'Quality Management System', nameEn: 'Quality Management System', category: 'Compliance', dateStart: '2026-01-20', dateEnd: '2026-01-24', status: 'completed', participants: 55, hours: 4, budget: 52000 },
  { id: 42, name: 'Regulatory Compliance Workshop', nameEn: 'Regulatory Compliance Workshop', category: 'Compliance', dateStart: '2026-02-23', dateEnd: '2026-02-27', status: 'completed', participants: 67, hours: 4, budget: 58000 },
  { id: 43, name: 'Internal Audit Training', nameEn: 'Internal Audit Training', category: 'Compliance', dateStart: '2026-05-18', dateEnd: '2026-05-22', status: 'registering', participants: 21, hours: 4, budget: 60000 },
  { id: 44, name: 'Risk Management Framework', nameEn: 'Risk Management Framework', category: 'Compliance', dateStart: '2026-07-08', dateEnd: '2026-07-12', status: 'registering', participants: 16, hours: 4, budget: 65000 },
  { id: 45, name: 'Cloud Security Best Practices', nameEn: 'Cloud Security Best Practices', category: 'Digital', dateStart: '2026-01-28', dateEnd: '2026-02-11', status: 'completed', participants: 24, hours: 12, budget: 160000 },
  { id: 46, name: 'IoT & Smart Technology', nameEn: 'IoT & Smart Technology', category: 'Digital', dateStart: '2026-07-15', dateEnd: '2026-08-05', status: 'registering', participants: 19, hours: 16, budget: 180000 },
  { id: 47, name: 'Blockchain Fundamentals', nameEn: 'Blockchain Fundamentals', category: 'Digital', dateStart: '2026-07-20', dateEnd: '2026-08-10', status: 'registering', participants: 14, hours: 16, budget: 200000 },
  { id: 48, name: 'Enterprise Architecture', nameEn: 'Enterprise Architecture', category: 'Digital', dateStart: '2026-08-01', dateEnd: '2026-08-22', status: 'registering', participants: 11, hours: 12, budget: 140000 },
];

// Popular courses with completion tracking
const popularCourses = [
  { name: 'Data Analytics for Business', completed: 78, participants: 38 },
  { name: 'Effective Communication Skills', completed: 85, participants: 89 },
  { name: 'Project Management Professional', completed: 82, participants: 33 },
  { name: 'Leadership Fundamentals', completed: 88, participants: 45 },
  { name: 'Power BI Dashboard Development', completed: 91, participants: 35 },
];

// Skill gap data
const skillGaps = [
  { skill: 'Technical Skills', gap: 75 },
  { skill: 'Communication', gap: 82 },
  { skill: 'Leadership', gap: 68 },
  { skill: 'Digital', gap: 71 },
];

// Monthly training hours
const monthlyData = [
  { month: 'Jan', hours: 245 },
  { month: 'Feb', hours: 398 },
  { month: 'Mar', hours: 521 },
  { month: 'Apr', hours: 487 },
  { month: 'May', hours: 629 },
  { month: 'Jun', hours: 445 },
];

const courseStatusColor = (status) => {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'ongoing') return 'bg-blue-100 text-blue-700';
  return 'bg-yellow-100 text-yellow-700'; // registering
};

const courseStatusLabel = (status, lang) => {
  if (status === 'completed') return lang === 'th' ? 'เสร็จสิ้น' : 'Completed';
  if (status === 'ongoing') return lang === 'th' ? 'กำลังดำเนินการ' : 'Ongoing';
  return lang === 'th' ? 'เปิดรับสมัคร' : 'Registering';
};

export default function Training({ lang = 'en' }) {
  const { filterByCompany, filterByEmployeeCompany } = useCompanyFilter();
  const [showImport, setShowImport] = useState(false);

  // Calculate stats
  const stats = {
    totalCourses: 48,
    completed: mockCourses.filter(c => c.status === 'completed').length,
    participants: mockCourses.reduce((sum, c) => sum + c.participants, 0),
    totalHours: mockCourses.reduce((sum, c) => sum + c.hours, 0),
    totalBudget: mockCourses.reduce((sum, c) => sum + c.budget, 0),
  };

  // Column definitions for export with Thai headers
  const exportColumns = [
    { header: lang === 'th' ? 'ชื่อหลักสูตร' : 'Course Name', accessor: (r) => lang === 'th' ? r.name : r.nameEn, width: 20 },
    { header: lang === 'th' ? 'ประเภท' : 'Category', accessor: 'category', width: 15 },
    { header: lang === 'th' ? 'วันเริ่มต้น' : 'Start Date', accessor: 'dateStart', width: 12 },
    { header: lang === 'th' ? 'วันสิ้นสุด' : 'End Date', accessor: 'dateEnd', width: 12 },
    { header: lang === 'th' ? 'สถานะ' : 'Status', accessor: (r) => courseStatusLabel(r.status, lang), width: 12 },
    { header: lang === 'th' ? 'ผู้เข้าร่วม' : 'Participants', accessor: 'participants', width: 10 },
    { header: lang === 'th' ? 'ชั่วโมง' : 'Hours', accessor: 'hours', width: 8 },
    { header: lang === 'th' ? 'งบประมาณ' : 'Budget', accessor: 'budget', width: 12 },
  ];

  // Column definitions for import with Thai headers
  const importColumns = [
    {
      header: lang === 'th' ? 'ชื่อหลักสูตร' : 'Course Name',
      headerEn: 'Course Name',
      accessor: 'name',
      dbField: 'name',
      example: 'Python Programming Fundamentals',
      width: 20,
    },
    {
      header: lang === 'th' ? 'ประเภท' : 'Category',
      headerEn: 'Category',
      accessor: 'category',
      dbField: 'category',
      example: 'Technical',
      width: 15,
    },
    {
      header: lang === 'th' ? 'วันเริ่มต้น' : 'Start Date',
      headerEn: 'Start Date',
      accessor: 'dateStart',
      dbField: 'dateStart',
      example: '2026-01-10',
      width: 12,
    },
    {
      header: lang === 'th' ? 'วันสิ้นสุด' : 'End Date',
      headerEn: 'End Date',
      accessor: 'dateEnd',
      dbField: 'dateEnd',
      example: '2026-01-24',
      width: 12,
    },
    {
      header: lang === 'th' ? 'สถานะ' : 'Status',
      headerEn: 'Status',
      accessor: 'status',
      dbField: 'status',
      example: 'completed',
      width: 12,
    },
    {
      header: lang === 'th' ? 'ผู้เข้าร่วม' : 'Participants',
      headerEn: 'Participants',
      accessor: 'participants',
      dbField: 'participants',
      example: '42',
      width: 10,
      transform: (v) => parseInt(v) || 0,
    },
    {
      header: lang === 'th' ? 'ชั่วโมง' : 'Hours',
      headerEn: 'Hours',
      accessor: 'hours',
      dbField: 'hours',
      example: '16',
      width: 8,
      transform: (v) => parseInt(v) || 0,
    },
    {
      header: lang === 'th' ? 'งบประมาณ' : 'Budget',
      headerEn: 'Budget',
      accessor: 'budget',
      dbField: 'budget',
      example: '150000',
      width: 12,
      transform: (v) => parseInt(v) || 0,
    },
  ];

  // Export handler
  const handleExport = () => {
    exportToExcel({
      data: mockCourses,
      columns: exportColumns,
      filename: 'Training-Courses',
      sheetName: lang === 'th' ? 'หลักสูตรฝึกอบรม' : 'Training Courses',
    });
  };

  // Import handler
  const handleImport = async (mappedData) => {
    try {
      // Insert into supabase hr_training_courses table
      const { data, error } = await supabase
        .from('hr_training_courses')
        .insert(mappedData)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data?.length || mappedData.length;
    } catch (err) {
      console.error('Import error:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <PageHeader title={getLabel('title', lang)} lang={lang} />
        <ImportExportButtons
          onExport={handleExport}
          onImportClick={() => setShowImport(true)}
          lang={lang}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard icon={BookOpen} iconBg="bg-blue-100" iconColor="text-blue-600" label={lang === 'th' ? 'หลักสูตรทั้งหมด' : 'Total Courses'} value={stats.totalCourses} />
        <KPICard icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" label={lang === 'th' ? 'เสร็จสิ้น' : 'Completed'} value={`${stats.completed}`} sub={lang === 'th' ? 'หลักสูตร' : 'courses'} />
        <KPICard icon={Users} iconBg="bg-purple-100" iconColor="text-purple-600" label={lang === 'th' ? 'ผู้เข้าร่วม' : 'Participants'} value={stats.participants} sub={lang === 'th' ? 'คน' : 'people'} />
        <KPICard icon={Clock} iconBg="bg-orange-100" iconColor="text-orange-600" label={lang === 'th' ? 'ชั่วโมงฝึกอบรม' : 'Training Hours'} value={stats.totalHours} sub={lang === 'th' ? 'ชม.' : 'hrs'} />
        <KPICard icon={Wallet} iconBg="bg-green-100" iconColor="text-green-600" label={lang === 'th' ? 'งบประมาณ' : 'Budget'} value={`${(stats.totalBudget / 1000000).toFixed(2)}M`} sub={lang === 'th' ? 'บาท' : 'THB'} />
      </div>

      {/* Filters */}
      <Section className="border-none shadow-none bg-transparent">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">{lang === 'th' ? 'ประเภท' : 'Type'}</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option>{lang === 'th' ? 'ทั้งหมด' : 'All'}</option>
              <option>Technical</option>
              <option>Soft Skills</option>
              <option>Leadership</option>
              <option>Compliance</option>
              <option>Digital</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">{lang === 'th' ? 'สถานะ' : 'Status'}</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option>{lang === 'th' ? 'ทั้งหมด' : 'All'}</option>
              <option>completed</option>
              <option>ongoing</option>
              <option>registering</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">{lang === 'th' ? 'ปี' : 'Year'}</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option>2026</option>
              <option>2025</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Course Schedule ~35% */}
        <div className="col-span-12 lg:col-span-4">
          <Section title={getLabel('schedule', lang)} className="h-full">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {[...mockCourses].sort((a, b) => new Date(b.dateStart) - new Date(a.dateStart)).slice(0, 10).map((course) => (
                <div key={course.id} className="pb-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{lang === 'th' ? course.name : course.nameEn}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${courseStatusColor(course.status)}`}>
                      {courseStatusLabel(course.status, lang)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{course.dateStart} - {course.dateEnd}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3 h-3" />
                    <span>{course.participants} {lang === 'th' ? 'คน' : 'people'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Center: Popular Courses ~35% */}
        <div className="col-span-12 lg:col-span-4">
          <Section title={getLabel('popular', lang)} className="h-full">
            <div className="space-y-4">
              {popularCourses.map((course, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900">{course.name}</p>
                    <span className="text-xs text-gray-500">{course.completed}%</span>
                  </div>
                  <ProgressBar value={course.completed} color="bg-blue-500" />
                  <p className="text-xs text-gray-500 mt-1">{course.participants} {lang === 'th' ? 'คน' : 'participants'}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right: Skill Gap & Images ~30% */}
        <div className="col-span-12 lg:col-span-4">
          <DetailPanel>
            <Section title={getLabel('skillGap', lang)}>
              <div className="space-y-3">
                {skillGaps.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{item.skill}</span>
                      <span className="text-xs text-gray-500">{item.gap}%</span>
                    </div>
                    <ProgressBar value={item.gap} color="bg-orange-500" />
                  </div>
                ))}
              </div>
            </Section>

            {/* Course Images */}
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg h-24 flex items-center justify-center border border-blue-200">
                  <BookOpen className="w-8 h-8 text-blue-400" />
                </div>
              ))}
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Registration Tracking */}
        <div className="col-span-12 lg:col-span-6">
          <Section title={getLabel('registrationTracking', lang)}>
            <div className="space-y-3">
              {[
                { name: lang === 'th' ? 'เทคนิค' : 'Technical', count: 48 },
                { name: lang === 'th' ? 'ทักษะปรับตัว' : 'Soft Skills', count: 98 },
                { name: lang === 'th' ? 'ภาวะผู้นำ' : 'Leadership', count: 64 },
                { name: lang === 'th' ? 'สอบถาม' : 'Compliance', count: 112 },
                { name: lang === 'th' ? 'ดิจิทัล' : 'Digital', count: 190 },
              ].map((cat, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat.count}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.min((cat.count / 200) * 100, 100)}%` }}>
                      <span className="text-xs text-white font-medium">{Math.round((cat.count / 512) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Deep Stats & Achievement */}
        <div className="col-span-12 lg:col-span-6">
          <Section title={getLabel('deepStats', lang)}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 text-center mt-2">{getLabel('achievement', lang)}</p>
          </Section>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
        columns={importColumns}
        tableName={lang === 'th' ? 'หลักสูตรฝึกอบรม' : 'Training Courses'}
        lang={lang}
      />
    </div>
  );
}

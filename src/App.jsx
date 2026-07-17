import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { CompanyFilterProvider } from './lib/CompanyFilterContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Leave from './pages/Leave'
import Payroll from './pages/Payroll'
import CostAnalysis from './pages/CostAnalysis'
import TimeAttendance from './pages/TimeAttendance'
import Performance from './pages/Performance'
import Assets from './pages/Assets'
import UserManagement from './pages/UserManagement'
import OrgChart from './pages/OrgChart'
import Recruitment from './pages/Recruitment'
import Training from './pages/Training'
import Welfare from './pages/Welfare'
import Documents from './pages/Documents'
import Reports from './pages/Reports'
import Onboarding from './pages/Onboarding'
import Offboarding from './pages/Offboarding'
import Announcements from './pages/Announcements'
import Expenses from './pages/Expenses'
import EmployeeRelations from './pages/EmployeeRelations'
import MyDocuments from './pages/MyDocuments'
import CompanyManagement from './pages/CompanyManagement'
import HolidayManagement from './pages/HolidayManagement'
import OTCalculation from './pages/OTCalculation'
import Workforce from './pages/Workforce'

// Pages by role level
const ROLE_PAGES = {
  admin: {
    dashboard: Dashboard,
    workforce: Workforce,
    employees: Employees,
    orgChart: OrgChart,
    leave: Leave,
    payroll: Payroll,
    costAnalysis: CostAnalysis,
    timeAttendance: TimeAttendance,
    recruitment: Recruitment,
    performance: Performance,
    training: Training,
    welfare: Welfare,
    documents: Documents,
    reports: Reports,
    assets: Assets,
    userManagement: UserManagement,
    companyManagement: CompanyManagement,
    holidayManagement: HolidayManagement,
    onboarding: Onboarding,
    offboarding: Offboarding,
    announcements: Announcements,
    expenses: Expenses,
    employeeRelations: EmployeeRelations,
    myDocuments: MyDocuments,
    otCalculation: OTCalculation,
  },
  manager: {
    dashboard: Dashboard,
    workforce: Workforce,
    employees: Employees,
    orgChart: OrgChart,
    leave: Leave,
    payroll: Payroll,
    timeAttendance: TimeAttendance,
    recruitment: Recruitment,
    performance: Performance,
    training: Training,
    welfare: Welfare,
    documents: Documents,
    reports: Reports,
    assets: Assets,
    onboarding: Onboarding,
    offboarding: Offboarding,
    announcements: Announcements,
    expenses: Expenses,
    employeeRelations: EmployeeRelations,
    myDocuments: MyDocuments,
    otCalculation: OTCalculation,
  },
  employee: {
    dashboard: Dashboard,
    leave: Leave,
    timeAttendance: TimeAttendance,
    performance: Performance,
    training: Training,
    welfare: Welfare,
    documents: Documents,
    announcements: Announcements,
    expenses: Expenses,
    myDocuments: MyDocuments,
  },
}

function AppContent() {
  const [page, setPage] = useState('dashboard')
  const [lang, setLang] = useState('th')
  const [refreshKey, setRefreshKey] = useState(0)
  const { user, profile, loading, role } = useAuth()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#c6e8a3] border-t-[#78c045] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Login lang={lang} />
  }

  // Determine available pages based on role (admin > manager > employee)
  const pages = ROLE_PAGES[role] || (role === 'superuser' ? ROLE_PAGES.admin : ROLE_PAGES.employee)

  // If current page not available for role, redirect to dashboard
  const currentPage = pages[page] ? page : 'dashboard'
  const PageComponent = pages[currentPage]

  return (
    <Layout page={currentPage} setPage={setPage} lang={lang} setLang={setLang} onRefresh={() => setRefreshKey(k => k + 1)}>
      <ErrorBoundary key={`${currentPage}-${refreshKey}`}>
        <PageComponent lang={lang} />
      </ErrorBoundary>
    </Layout>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyFilterProvider>
          <AppContent />
        </CompanyFilterProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

import { useState } from 'react'
import { Users, Calendar, DollarSign, Clock, Award, Home, Globe, Menu, ChevronRight, LogOut, Shield, Network, UserSearch, GraduationCap, Heart, FileText, BarChart3, ChevronLeft, UserPlus, UserMinus, Megaphone, Receipt, Scale, FileDown, RefreshCw, Settings, Building2, Key, Eye, EyeOff, X, Check, Calculator, CalendarDays, Timer, TrendingUp } from 'lucide-react'
import { t } from '../lib/translations'
import { useAuth } from '../lib/AuthContext'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import logoLight from '../assets/efin(light).png'

// minRole: 'employee' = all, 'manager' = manager+admin, 'admin' = admin only
const NAV = [
  { key: 'dashboard', icon: Home, minRole: 'employee' },
  { key: 'workforce', icon: TrendingUp, minRole: 'manager' },
  { key: 'employees', icon: Users, minRole: 'manager' },
  { key: 'orgChart', icon: Network, minRole: 'manager' },
  { key: 'timeAttendance', icon: Clock, minRole: 'employee' },
  { key: 'leave', icon: Calendar, minRole: 'employee' },
  { key: 'payroll', icon: DollarSign, minRole: 'superuser' },
  { key: 'costAnalysis', icon: Calculator, minRole: 'superuser' },
  { key: 'recruitment', icon: UserSearch, minRole: 'manager' },
  { key: 'performance', icon: Award, minRole: 'employee' },
  { key: 'training', icon: GraduationCap, minRole: 'employee' },
  { key: 'welfare', icon: Heart, minRole: 'employee' },
  { key: 'documents', icon: FileText, minRole: 'employee' },
  { key: 'reports', icon: BarChart3, minRole: 'manager' },
  { key: 'onboarding', icon: UserPlus, minRole: 'manager' },
  { key: 'offboarding', icon: UserMinus, minRole: 'manager' },
  { key: 'announcements', icon: Megaphone, minRole: 'employee' },
  { key: 'expenses', icon: Receipt, minRole: 'employee' },
  { key: 'employeeRelations', icon: Scale, minRole: 'manager' },
  { key: 'myDocuments', icon: FileDown, minRole: 'employee' },
  { key: 'otCalculation', icon: Timer, minRole: 'manager' },
]

// Admin-only section — displayed separately with distinct styling
const ADMIN_NAV = [
  { key: 'userManagement', icon: Settings, minRole: 'admin' },
  { key: 'companyManagement', icon: Building2, minRole: 'admin' },
  { key: 'holidayManagement', icon: CalendarDays, minRole: 'admin' },
]

const ROLE_LEVEL = { employee: 0, manager: 1, admin: 2, superuser: 3 }

// Labels for pages not in translations
const extraLabels = {
  orgChart: { th: 'โครงสร้างองค์กร', en: 'Org Chart' },
  recruitment: { th: 'สรรหา', en: 'Recruitment' },
  training: { th: 'ฝึกอบรม', en: 'Training' },
  welfare: { th: 'สวัสดิการ', en: 'Welfare' },
  documents: { th: 'เอกสาร', en: 'Documents' },
  reports: { th: 'รายงาน', en: 'Reports' },
  userManagement: { th: 'จัดการผู้ใช้', en: 'Users' },
  companyManagement: { th: 'จัดการบริษัท', en: 'Companies' },
  holidayManagement: { th: 'จัดการวันหยุดประจำปี', en: 'Holidays' },
  onboarding: { th: 'ต้อนรับพนักงานใหม่', en: 'Onboarding' },
  offboarding: { th: 'พ้นสภาพ', en: 'Offboarding' },
  announcements: { th: 'ประกาศ', en: 'Announcements' },
  expenses: { th: 'เบิกค่าใช้จ่าย', en: 'Expenses' },
  employeeRelations: { th: 'แรงงานสัมพันธ์', en: 'Employee Relations' },
  myDocuments: { th: 'เอกสารของฉัน', en: 'My Documents' },
  costAnalysis: { th: 'วิเคราะห์ต้นทุน', en: 'Cost Analysis' },
  otCalculation: { th: 'คำนวณ OT', en: 'OT Calculation' },
  workforce: { th: 'Workforce', en: 'Workforce' },
}

function label(key, lang) {
  if (extraLabels[key]) return extraLabels[key][lang] || extraLabels[key].en
  return t(key, lang)
}

export default function Layout({ page, setPage, lang, setLang, children, onRefresh }) {
  const [sideOpen, setSideOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwShow, setPwShow] = useState({ current: false, newPw: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const { profile, isAdmin, role, signOut, changePassword, signIn, user } = useAuth()
  const { activeCompanies, selectedCompany, setSelectedCompany } = useCompanyFilter()
  const userLevel = ROLE_LEVEL[role] ?? 0

  const visibleNav = NAV.filter(item => userLevel >= ROLE_LEVEL[item.minRole])
  const visibleAdminNav = ADMIN_NAV.filter(item => userLevel >= ROLE_LEVEL[item.minRole])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r transition-all duration-300
        ${sideOpen ? 'w-60' : 'w-16'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a2a' }}>
          {sideOpen ? (
            <img src={logoLight} alt="efinanceThai" className="h-6 object-contain object-left" />
          ) : (
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 48 48" className="w-7 h-7">
                <rect x="2" y="2" width="44" height="44" rx="9" fill="#78c045"/>
                <polygon fill="white" points="40,8 40,40 28,28 22,34 14,26 20,20 8,8"/>
              </svg>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setPage(key); setMobileOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                ${page === key
                  ? 'border-r-2 font-medium'
                  : 'hover:text-white'}`}
              style={page === key
                ? { backgroundColor: 'rgba(120,192,69,0.12)', color: '#78c045', borderColor: '#78c045' }
                : { color: '#b0b0b0' }}
              onMouseEnter={e => { if (page !== key) e.currentTarget.style.backgroundColor = '#2a2a2a' }}
              onMouseLeave={e => { if (page !== key) e.currentTarget.style.backgroundColor = '' }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sideOpen && <span className="truncate">{label(key, lang)}</span>}
            </button>
          ))}

          {/* Admin section — visually separated */}
          {visibleAdminNav.length > 0 && (
            <>
              <div className="mx-3 my-2" style={{ borderTop: '1px solid #2a2a2a' }} />
              {sideOpen && (
                <div className="px-4 py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#78c045' }}>
                    {lang === 'th' ? 'ผู้ดูแลระบบ' : 'Admin'}
                  </span>
                </div>
              )}
              {visibleAdminNav.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setPage(key); setMobileOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                    ${page === key ? 'border-r-2' : ''}`}
                  style={page === key
                    ? { backgroundColor: 'rgba(120,192,69,0.12)', color: '#78c045', borderColor: '#78c045' }
                    : { color: 'rgba(120,192,69,0.75)' }}
                  onMouseEnter={e => { if (page !== key) { e.currentTarget.style.backgroundColor = '#2a2a2a'; e.currentTarget.style.color = '#78c045' } }}
                  onMouseLeave={e => { if (page !== key) { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'rgba(120,192,69,0.75)' } }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sideOpen && <span className="truncate">{label(key, lang)}</span>}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* User info + password + logout */}
        <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid #2a2a2a' }}>
          {sideOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#e0e0e0' }}>{profile?.display_name_en || profile?.display_name || profile?.email}</p>
                  <p className="text-[10px] truncate" style={{ color: '#888' }}>
                    {role === 'superuser'
                      ? 'Super User'
                      : role === 'admin'
                      ? (lang === 'th' ? 'ผู้ดูแลระบบ' : 'Admin')
                      : role === 'manager'
                      ? (lang === 'th' ? 'หัวหน้างาน' : 'Manager')
                      : (lang === 'th' ? 'พนักงาน' : 'Employee')}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setShowPwModal(true); setPwForm({ current: '', newPw: '', confirm: '' }); setPwError(null); setPwSuccess(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-[10px]"
                  style={{ color: '#888' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(120,192,69,0.12)'; e.currentTarget.style.color = '#78c045' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888' }}
                  title={lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}>
                  <Key className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'เปลี่ยนรหัส' : 'Password'}</span>
                </button>
                <button onClick={signOut}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-[10px]"
                  style={{ color: '#888' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888' }}
                  title={lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <button onClick={() => { setShowPwModal(true); setPwForm({ current: '', newPw: '', confirm: '' }); setPwError(null); setPwSuccess(false); }}
                className="w-full flex items-center justify-center p-1.5 rounded-lg transition-colors"
                style={{ color: '#888' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(120,192,69,0.12)'; e.currentTarget.style.color = '#78c045' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888' }}
                title={lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}>
                <Key className="w-4 h-4" />
              </button>
              <button onClick={signOut}
                className="w-full flex items-center justify-center p-1.5 rounded-lg transition-colors"
                style={{ color: '#888' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#888' }}>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSideOpen(!sideOpen)}
          className="hidden lg:flex items-center justify-center gap-2 h-10 transition-colors"
          style={{ borderTop: '1px solid #2a2a2a', color: '#666' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ccc' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sideOpen ? '' : 'rotate-180'}`} />
          {sideOpen && <span className="text-xs">{lang === 'th' ? 'ย่อเมนู' : 'Collapse'}</span>}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">{label(page, lang)}</h1>
            {role === 'superuser' && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full">SUPER USER</span>
            )}
            {role === 'admin' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-semibold rounded-full">ADMIN</span>
            )}
            {role === 'manager' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">MANAGER</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Company filter dropdown */}
            {activeCompanies.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white hover:bg-gray-50 text-gray-700 focus:ring-2 focus:ring-[#78c045] outline-none cursor-pointer"
                >
                  <option value="all">{lang === 'th' ? 'ทุกบริษัท' : 'All Companies'}</option>
                  {activeCompanies.map(c => (
                    <option key={c.code} value={c.code}>
                      {lang === 'th' ? (c.name_th || c.code) : (c.name_en || c.code)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => {
                setRefreshing(true)
                if (onRefresh) onRefresh()
                else window.location.reload()
                setTimeout(() => setRefreshing(false), 1000)
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#5a9030] transition-colors"
              title={lang === 'th' ? 'รีเฟรชหน้า' : 'Refresh page'}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Password Change Modal */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPwModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: '#78c045' }} />
                {lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}
              </h3>
              <button onClick={() => setShowPwModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault(); setPwError(null); setPwSuccess(false);
              if (pwForm.newPw.length < 6) { setPwError(lang === 'th' ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' : 'New password must be at least 6 characters'); return; }
              if (pwForm.newPw !== pwForm.confirm) { setPwError(lang === 'th' ? 'รหัสผ่านใหม่ไม่ตรงกัน' : 'New passwords do not match'); return; }
              setPwSaving(true);
              try {
                await changePassword(pwForm.newPw);
                setPwSuccess(true); setPwForm({ current: '', newPw: '', confirm: '' });
                setTimeout(() => setShowPwModal(false), 1500);
              } catch (err) {
                // Translate common Supabase auth errors to Thai
                const msg = err.message || '';
                const thErrors = {
                  'New password should be different from the old password': 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม',
                  'Password should be at least 6 characters': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
                  'Auth session missing': 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
                  'JWT expired': 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
                  'Invalid login credentials': 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',
                };
                if (lang === 'th') {
                  const matched = Object.entries(thErrors).find(([en]) => msg.toLowerCase().includes(en.toLowerCase()));
                  setPwError(matched ? matched[1] : `เกิดข้อผิดพลาด: ${msg}`);
                } else {
                  setPwError(msg);
                }
              }
              finally { setPwSaving(false); }
            }} className="p-5 space-y-4">
              {pwError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {lang === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ!' : 'Password changed successfully!'}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'th' ? 'รหัสผ่านใหม่' : 'New Password'}</label>
                <div className="relative">
                  <input type={pwShow.newPw ? 'text' : 'password'} value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none pr-9" placeholder="••••••" />
                  <button type="button" onClick={() => setPwShow({ ...pwShow, newPw: !pwShow.newPw })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {pwShow.newPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}</label>
                <div className="relative">
                  <input type={pwShow.confirm ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#78c045] outline-none pr-9" placeholder="••••••" />
                  <button type="button" onClick={() => setPwShow({ ...pwShow, confirm: !pwShow.confirm })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {pwShow.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={pwSaving}
                className="w-full text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#78c045' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#6aad3c' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#78c045' }}
              >
                {pwSaving ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />{lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</>
                ) : (
                  <><Key className="w-4 h-4" />{lang === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

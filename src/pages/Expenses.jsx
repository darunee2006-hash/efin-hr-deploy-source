import { useState, useEffect, useMemo } from 'react'
import {
  Receipt, Wallet, CheckCircle, XCircle, Clock, FileText,
  Eye, Download, MessageSquare, ChevronRight, X, MapPin, Calendar, Tag
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import { PageHeader, KPICard, Section, DetailPanel, Avatar, StatusBadge, TabPills } from '../components/PageUI'
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport'

// Bilingual text helper
const T = (lang, th, en) => lang === 'th' ? th : en

// Format currency with Thai Baht symbol and commas
const formatBaht = (num) => {
  if (!num) return '฿0'
  return '฿' + num.toLocaleString('th-TH')
}

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Expense type labels and icons
const EXPENSE_TYPES = {
  travel: { th: 'การเดินทาง', en: 'Travel', icon: '✈️', color: 'bg-blue-100 text-blue-700' },
  meal: { th: 'อาหารและเครื่องดื่ม', en: 'Meals & Drinks', icon: '🍽️', color: 'bg-orange-100 text-orange-700' },
  transport: { th: 'ค่าเดินทาง', en: 'Transport', icon: '🚗', color: 'bg-green-100 text-green-700' },
  accommodation: { th: 'ที่พัก', en: 'Accommodation', icon: '🏨', color: 'bg-purple-100 text-purple-700' },
  training: { th: 'ฝึกอบรม', en: 'Training', icon: '📚', color: 'bg-[#e2f4d3] text-[#5a9030]' },
  medical: { th: 'การแพทย์', en: 'Medical', icon: '⚕️', color: 'bg-red-100 text-red-700' },
  equipment: { th: 'อุปกรณ์', en: 'Equipment', icon: '🛠️', color: 'bg-yellow-100 text-yellow-700' },
  other: { th: 'อื่นๆ', en: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-700' },
}

const STATUS_LABELS = {
  draft: { th: 'ร่าง', en: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending: { th: 'รอจนท.', en: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  approved: { th: 'อนุมัติ', en: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { th: 'ปฏิเสธ', en: 'Rejected', color: 'bg-red-100 text-red-700' },
  paid: { th: 'จ่ายแล้ว', en: 'Paid', color: 'bg-blue-100 text-blue-700' },
  cancelled: { th: 'ยกเลิก', en: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
}

export default function Expenses({ lang }) {
  const { filterByCompany } = useCompanyFilter()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState([])
  const [employees, setEmployees] = useState({})
  const [error, setError] = useState(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Detail view
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [approvalNotes, setApprovalNotes] = useState('')

  // Import/Export
  const [showImport, setShowImport] = useState(false)

  // Fetch expenses data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Get current user's employee record via user profile
        let employeeId = null
        if (!profile?.role || profile.role === 'employee') {
          const { data: profileData } = await supabase
            .from('hr_user_profiles')
            .select('employee_id')
            .eq('id', user?.id)
            .single()
          employeeId = profileData?.employee_id
        }

        // Fetch expenses based on role
        let query = supabase
          .from('hr_expenses')
          .select(`
            id,
            employee_id,
            expense_type,
            description,
            amount,
            receipt_date,
            receipt_url,
            project_code,
            cost_center,
            status,
            approved_by,
            approved_at,
            paid_date,
            reject_reason,
            notes,
            created_at,
            hr_employees!hr_expenses_employee_id_fkey(
              id,
              employee_code,
              first_name_th,
              last_name_th,
              first_name_en,
              last_name_en,
              company_entity
            )
          `)

        // Apply role-based filtering
        if (profile?.role === 'employee') {
          query = query.eq('employee_id', employeeId)
        } else if (profile?.role === 'manager') {
          // Manager sees own team (simplified - in production, would check reporting structure)
          query = query.in('status', ['pending', 'approved', 'rejected', 'paid'])
        }
        // Admin sees all (no filter)

        const { data, error: fetchError } = await query
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setExpenses(data || [])

        // Build employee map for quick lookup
        const empMap = {}
        ;(data || []).forEach(exp => {
          if (exp.hr_employees) {
            empMap[exp.employee_id] = exp.hr_employees
          }
        })
        setEmployees(empMap)
      } catch (err) {
        console.error('Expense data fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, profile])

  // Company-filtered expenses
  const companyFilteredExpenses = useMemo(() => {
    const empArray = expenses.filter(e => e.hr_employees).map(e => e.hr_employees)
    const filteredEmpIds = new Set(filterByCompany(empArray).map(e => e.id))
    return expenses.filter(exp => exp.hr_employees && filteredEmpIds.has(exp.hr_employees.id))
  }, [expenses, filterByCompany])

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return companyFilteredExpenses.filter(exp => {
      const statusMatch = statusFilter === 'all' || exp.status === statusFilter
      const typeMatch = typeFilter === 'all' || exp.expense_type === typeFilter
      const empName = lang === 'th'
        ? (`${exp.hr_employees?.first_name_th || ''} ${exp.hr_employees?.last_name_th || ''}`.trim() + (exp.hr_employees?.nickname ? ` (${exp.hr_employees.nickname})` : ''))
        : `${exp.hr_employees?.first_name_en || ''} ${exp.hr_employees?.last_name_en || ''}`.trim()
      const searchMatch = !searchQuery ||
        empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.hr_employees?.employee_code?.includes(searchQuery) ||
        exp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const dateMatch = (!dateFrom || exp.receipt_date >= dateFrom) &&
        (!dateTo || exp.receipt_date <= dateTo)
      return statusMatch && typeMatch && searchMatch && dateMatch
    }).sort((a, b) => (b.amount || 0) - (a.amount || 0))
  }, [companyFilteredExpenses, statusFilter, typeFilter, searchQuery, dateFrom, dateTo, lang])

  // Calculate KPI stats
  const stats = useMemo(() => {
    const allExpenses = companyFilteredExpenses
    const totalAmount = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    const pending = allExpenses.filter(e => e.status === 'pending')
    const pendingCount = pending.length
    const pendingAmount = pending.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    const approved = allExpenses.filter(e => e.status === 'approved' || e.status === 'paid')
    const approvedAmount = approved.reduce((sum, e) => sum + (e.amount || 0), 0)
    
    const rejected = allExpenses.filter(e => e.status === 'rejected')
    const rejectedCount = rejected.length

    return {
      totalAmount,
      pendingCount,
      pendingAmount,
      approvedAmount,
      rejectedCount,
    }
  }, [companyFilteredExpenses])

  // Get employee name
  const getEmployeeName = (emp) => {
    if (!emp) return '-'
    let n = lang === 'th'
      ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()
      : `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim()
    if (emp.nickname) n += ` (${emp.nickname})`
    return n
  }

  // Approve expense
  const handleApprove = async (expenseId) => {
    try {
      const { error } = await supabase
        .from('hr_expenses')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: approvalNotes
        })
        .eq('id', expenseId)
      
      if (error) throw error
      
      setExpenses(expenses.map(e =>
        e.id === expenseId
          ? {
              ...e,
              status: 'approved',
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
              notes: approvalNotes
            }
          : e
      ))
      setSelectedExpense(null)
      setApprovalNotes('')
    } catch (err) {
      console.error('Approval error:', err)
      alert(T(lang, 'เกิดข้อผิดพลาด', 'Error occurred'))
    }
  }

  // Reject expense
  const handleReject = async (expenseId, rejectReason) => {
    try {
      const { error } = await supabase
        .from('hr_expenses')
        .update({
          status: 'rejected',
          reject_reason: rejectReason,
          notes: approvalNotes
        })
        .eq('id', expenseId)
      
      if (error) throw error
      
      setExpenses(expenses.map(e =>
        e.id === expenseId
          ? {
              ...e,
              status: 'rejected',
              reject_reason: rejectReason,
              notes: approvalNotes
            }
          : e
      ))
      setSelectedExpense(null)
      setApprovalNotes('')
    } catch (err) {
      console.error('Rejection error:', err)
      alert(T(lang, 'เกิดข้อผิดพลาด', 'Error occurred'))
    }
  }

  const isManager = profile?.role === 'manager' || profile?.role === 'admin'

  // Export expenses to Excel
  const handleExport = () => {
    const columns = [
      {
        header: lang === 'th' ? 'พนักงาน' : 'Employee',
        accessor: (row) => {
          const emp = row.hr_employees
          return lang === 'th'
            ? `${emp?.first_name_th || ''} ${emp?.last_name_th || ''}`.trim()
            : `${emp?.first_name_en || ''} ${emp?.last_name_en || ''}`.trim()
        },
        width: 18
      },
      {
        header: lang === 'th' ? 'รหัสพนักงาน' : 'Employee Code',
        accessor: (row) => row.hr_employees?.employee_code || '-',
        width: 14
      },
      {
        header: lang === 'th' ? 'ประเภทค่าใช้จ่าย' : 'Expense Type',
        accessor: (row) => EXPENSE_TYPES[row.expense_type]?.[lang] || '-',
        width: 16
      },
      {
        header: lang === 'th' ? 'รายละเอียด' : 'Description',
        accessor: 'description',
        width: 25
      },
      {
        header: lang === 'th' ? 'จำนวน' : 'Amount',
        accessor: (row) => row.amount || 0,
        width: 12
      },
      {
        header: lang === 'th' ? 'วันที่เรียกเก็บ' : 'Receipt Date',
        accessor: (row) => formatDate(row.receipt_date),
        width: 14
      },
      {
        header: lang === 'th' ? 'สถานะ' : 'Status',
        accessor: (row) => STATUS_LABELS[row.status]?.[lang] || '-',
        width: 12
      },
      {
        header: lang === 'th' ? 'รหัสโปรเจค' : 'Project Code',
        accessor: 'project_code',
        width: 12
      },
      {
        header: lang === 'th' ? 'ศูนย์ต้นทุน' : 'Cost Center',
        accessor: 'cost_center',
        width: 12
      },
      {
        header: lang === 'th' ? 'วันสร้าง' : 'Created Date',
        accessor: (row) => formatDate(row.created_at),
        width: 14
      }
    ]

    exportToExcel({
      data: filteredExpenses,
      columns,
      filename: 'Expenses',
      sheetName: lang === 'th' ? 'ค่าใช้จ่าย' : 'Expenses'
    })
  }

  // Import column definitions with Thai headers
  const importColumns = [
    {
      header: lang === 'th' ? 'พนักงาน' : 'Employee',
      headerEn: 'Employee',
      accessor: 'employee_name',
      dbField: null, // Will be mapped to employee_id
      example: lang === 'th' ? 'สมชาย ใจดี' : 'John Doe'
    },
    {
      header: lang === 'th' ? 'ประเภทค่าใช้จ่าย' : 'Expense Type',
      headerEn: 'Expense Type',
      accessor: 'expense_type',
      dbField: 'expense_type',
      example: lang === 'th' ? 'การเดินทาง' : 'travel'
    },
    {
      header: lang === 'th' ? 'รายละเอียด' : 'Description',
      headerEn: 'Description',
      accessor: 'description',
      dbField: 'description',
      example: lang === 'th' ? 'ตั๋วเครื่องบิน' : 'Flight ticket'
    },
    {
      header: lang === 'th' ? 'จำนวน' : 'Amount',
      headerEn: 'Amount',
      accessor: 'amount',
      dbField: 'amount',
      example: '5000',
      transform: (val) => parseFloat(val) || 0
    },
    {
      header: lang === 'th' ? 'วันที่เรียกเก็บ' : 'Receipt Date',
      headerEn: 'Receipt Date',
      accessor: 'receipt_date',
      dbField: 'receipt_date',
      example: '2026-05-07',
      transform: (val) => val ? val.toString().split('T')[0] : new Date().toISOString().split('T')[0]
    },
    {
      header: lang === 'th' ? 'รหัสโปรเจค' : 'Project Code',
      headerEn: 'Project Code',
      accessor: 'project_code',
      dbField: 'project_code',
      example: 'PRJ-001'
    },
    {
      header: lang === 'th' ? 'ศูนย์ต้นทุน' : 'Cost Center',
      headerEn: 'Cost Center',
      accessor: 'cost_center',
      dbField: 'cost_center',
      example: 'CC-001'
    }
  ]

  // Import handler
  const handleImportData = async (mappedData) => {
    try {
      if (!mappedData || mappedData.length === 0) {
        throw new Error(lang === 'th' ? 'ไม่มีข้อมูลที่จะนำเข้า' : 'No data to import')
      }

      // Get current user's employee ID for employees importing their own data
      let employeeId = null
      if (profile?.role === 'employee') {
        const { data: profileData } = await supabase
          .from('hr_user_profiles')
          .select('employee_id')
          .eq('id', user?.id)
          .single()
        employeeId = profileData?.employee_id
      }

      // Process each row
      const recordsToInsert = await Promise.all(
        mappedData.map(async (row) => {
          // Determine employee ID
          let empId = employeeId
          if (!empId && row.employee_name) {
            // Try to find employee by name
            const [firstName, lastName] = row.employee_name.split(' ')
            const { data: emp } = await supabase
              .from('hr_employees')
              .select('id')
              .or(
                `and(first_name_th.eq.${firstName},last_name_th.eq.${lastName}),and(first_name_en.eq.${firstName},last_name_en.eq.${lastName})`
              )
              .single()
            empId = emp?.id || employeeId
          }

          return {
            employee_id: empId,
            expense_type: row.expense_type || 'other',
            description: row.description || '',
            amount: row.amount || 0,
            receipt_date: row.receipt_date || new Date().toISOString().split('T')[0],
            project_code: row.project_code || null,
            cost_center: row.cost_center || null,
            status: 'draft',
            created_at: new Date().toISOString()
          }
        })
      )

      // Insert records
      const { data, error } = await supabase
        .from('hr_expenses')
        .insert(recordsToInsert)
        .select()

      if (error) throw error

      // Update local state
      setExpenses([...expenses, ...(data || [])])

      return data?.length || recordsToInsert.length
    } catch (err) {
      console.error('Import error:', err)
      throw new Error(err.message || (lang === 'th' ? 'นำเข้าไม่สำเร็จ' : 'Import failed'))
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title={T(lang, 'ค่าใช้จ่าย', 'Expenses')}
          subtitle={T(lang, 'จัดการและติดตามค่าใช้จ่ายของพนักงาน', 'Track and manage employee expenses')}
          lang={lang}
        />
        <ImportExportButtons
          onExport={handleExport}
          onImportClick={() => setShowImport(true)}
          lang={lang}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Wallet}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label={T(lang, 'ค่าใช้จ่ายรวม', 'Total Expenses')}
          value={formatBaht(stats.totalAmount)}
        />
        <KPICard
          icon={Clock}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          label={T(lang, 'รอจนท.', 'Pending Approval')}
          value={stats.pendingCount}
          sub={formatBaht(stats.pendingAmount)}
        />
        <KPICard
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label={T(lang, 'อนุมัติแล้ว', 'Approved')}
          value={formatBaht(stats.approvedAmount)}
        />
        <KPICard
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label={T(lang, 'ปฏิเสธ', 'Rejected')}
          value={stats.rejectedCount}
        />
      </div>

      {/* Filters Section */}
      <Section
        title={T(lang, 'ตัวกรอง', 'Filters')}
        noPad={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
          <input
            type="text"
            placeholder={T(lang, 'ค้นหา...', 'Search...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">{T(lang, 'สถานะทั้งหมด', 'All Status')}</option>
            {Object.entries(STATUS_LABELS).map(([key, val]) => (
              <option key={key} value={key}>{val[lang]}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">{T(lang, 'ประเภททั้งหมด', 'All Types')}</option>
            {Object.entries(EXPENSE_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val[lang]}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            placeholder={T(lang, 'จากวันที่', 'From Date')}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            placeholder={T(lang, 'ถึงวันที่', 'To Date')}
          />
        </div>
      </Section>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses Table */}
        <div className="lg:col-span-2">
          <Section title={T(lang, `ค่าใช้จ่าย (${filteredExpenses.length})`, `Expenses (${filteredExpenses.length})`)} noPad={true}>
            {loading ? (
              <div className="p-8 text-center text-gray-500">{T(lang, 'กำลังโหลด...', 'Loading...')}</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">{T(lang, 'ไม่มีข้อมูล', 'No data')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">{T(lang, 'พนักงาน', 'Employee')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">{T(lang, 'ประเภท', 'Type')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">{T(lang, 'รายละเอียด', 'Description')}</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">{T(lang, 'จำนวน', 'Amount')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">{T(lang, 'วันที่', 'Date')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">{T(lang, 'สถานะ', 'Status')}</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">{T(lang, 'จัดการ', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => {
                      const empInfo = exp.hr_employees
                      const typeInfo = EXPENSE_TYPES[exp.expense_type] || EXPENSE_TYPES.other
                      const statusInfo = STATUS_LABELS[exp.status] || STATUS_LABELS.draft
                      return (
                        <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={getEmployeeName(empInfo)} size="sm" />
                              <div className="text-xs">
                                <div className="font-medium text-gray-900">{getEmployeeName(empInfo)}</div>
                                <div className="text-gray-500">{empInfo?.employee_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.icon} {typeInfo[lang]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{exp.description || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBaht(exp.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatDate(exp.receipt_date)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo[lang]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedExpense(exp)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors"
                              title={T(lang, 'ดูรายละเอียด', 'View Details')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        {/* Right Panel - Summary Stats */}
        <DetailPanel>
          <Section title={T(lang, 'สรุป', 'Summary')}>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-600">{T(lang, 'ทั้งหมด', 'Total')}</span>
                <span className="font-bold text-gray-900">{filteredExpenses.length}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-600">{T(lang, 'จำนวนรวม', 'Total Amount')}</span>
                <span className="font-bold text-gray-900">
                  {formatBaht(filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
                </span>
              </div>
              <hr className="my-3" />
              {Object.entries(STATUS_LABELS).map(([status, info]) => {
                const count = filteredExpenses.filter(e => e.status === status).length
                if (count === 0) return null
                return (
                  <div key={status} className="flex justify-between">
                    <span className="text-gray-600">{info[lang]}</span>
                    <span className="font-medium text-gray-800">{count}</span>
                  </div>
                )
              })}
            </div>
          </Section>

          {isManager && (
            <Section title={T(lang, 'ผู้อนุมัติ', 'Approver Info')}>
              <div className="space-y-2 text-xs text-gray-600">
                <p>{T(lang, 'ท่านสามารถอนุมัติหรือปฏิเสธค่าใช้จ่ายที่รออนุมัติได้', 'You can approve or reject pending expenses')}</p>
              </div>
            </Section>
          )}
        </DetailPanel>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportData}
        columns={importColumns}
        tableName="hr_expenses"
        lang={lang}
      />

      {/* Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {T(lang, 'รายละเอียดค่าใช้จ่าย', 'Expense Details')}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">ID: {selectedExpense.id}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedExpense(null)
                    setApprovalNotes('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Employee */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'พนักงาน', 'Employee')}</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {getEmployeeName(selectedExpense.hr_employees)}
                    </p>
                    <p className="text-xs text-gray-500">{selectedExpense.hr_employees?.employee_code}</p>
                  </div>

                  {/* Expense Type */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'ประเภท', 'Type')}</p>
                    <p className="text-sm mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${EXPENSE_TYPES[selectedExpense.expense_type]?.color || EXPENSE_TYPES.other.color}`}>
                        {EXPENSE_TYPES[selectedExpense.expense_type]?.icon} {EXPENSE_TYPES[selectedExpense.expense_type]?.[lang] || '-'}
                      </span>
                    </p>
                  </div>

                  {/* Amount */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'จำนวน', 'Amount')}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{formatBaht(selectedExpense.amount)}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'สถานะ', 'Status')}</p>
                    <p className="text-sm mt-1">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${STATUS_LABELS[selectedExpense.status]?.color || STATUS_LABELS.draft.color}`}>
                        {STATUS_LABELS[selectedExpense.status]?.[lang] || '-'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Receipt Date */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {T(lang, 'วันที่เรียกเก็บ', 'Receipt Date')}
                    </p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedExpense.receipt_date)}</p>
                  </div>

                  {/* Project Code */}
                  {selectedExpense.project_code && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {T(lang, 'รหัสโปรเจค', 'Project Code')}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedExpense.project_code}</p>
                    </div>
                  )}

                  {/* Cost Center */}
                  {selectedExpense.cost_center && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {T(lang, 'ศูนย์ต้นทุน', 'Cost Center')}
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedExpense.cost_center}</p>
                    </div>
                  )}

                  {/* Created Date */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'วันสร้าง', 'Created Date')}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(selectedExpense.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedExpense.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{T(lang, 'รายละเอียด', 'Description')}</p>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded">{selectedExpense.description}</p>
                </div>
              )}

              {/* Receipt Image */}
              {selectedExpense.receipt_url && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{T(lang, 'ใบเสร็จ', 'Receipt')}</p>
                  <a
                    href={selectedExpense.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {T(lang, 'ดูใบเสร็จ', 'View Receipt')}
                  </a>
                </div>
              )}

              {/* Approval Info */}
              {(selectedExpense.status === 'approved' || selectedExpense.status === 'rejected') && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  {selectedExpense.status === 'approved' && (
                    <>
                      <p className="text-xs font-semibold text-blue-700 uppercase">{T(lang, 'อนุมัติโดย', 'Approved By')}</p>
                      <p className="text-sm text-gray-700">{selectedExpense.approved_by || '-'}</p>
                      {selectedExpense.approved_at && (
                        <p className="text-xs text-gray-600">
                          {T(lang, 'เมื่อ', 'At')}: {formatDate(selectedExpense.approved_at)}
                        </p>
                      )}
                    </>
                  )}
                  {selectedExpense.status === 'rejected' && selectedExpense.reject_reason && (
                    <>
                      <p className="text-xs font-semibold text-red-700 uppercase">{T(lang, 'เหตุผลการปฏิเสธ', 'Rejection Reason')}</p>
                      <p className="text-sm text-gray-700">{selectedExpense.reject_reason}</p>
                    </>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedExpense.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {T(lang, 'หมายเหตุ', 'Notes')}
                  </p>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded">{selectedExpense.notes}</p>
                </div>
              )}

              {/* Approval Actions (for managers/admins) */}
              {isManager && selectedExpense.status === 'pending' && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <label className="block">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{T(lang, 'หมายเหตุ', 'Notes')}</p>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder={T(lang, 'เพิ่มหมายเหตุ...', 'Add notes...')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none h-20"
                    />
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedExpense.id)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {T(lang, 'อนุมัติ', 'Approve')}
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt(T(lang, 'ระบุเหตุผลการปฏิเสธ', 'Enter rejection reason'))
                        if (reason) {
                          handleReject(selectedExpense.id, reason)
                        }
                      }}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      {T(lang, 'ปฏิเสธ', 'Reject')}
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedExpense(null)
                    setApprovalNotes('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {T(lang, 'ปิด', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

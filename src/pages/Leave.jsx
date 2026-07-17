import { useState, useEffect, useMemo } from 'react'
import { Plus, Check, X, Calendar, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import { StatCard, Card, Badge, Button, Modal, SearchInput, Select, Input, Table, LoadingSpinner, Tabs } from '../components/UI'
import { t, T } from '../lib/translations'
import { fmt, fmtDate, insertRow, updateRow } from '../lib/hooks'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport'

const CHART_COLORS = ['#78c045', '#1692dc', '#00afab', '#f59e0b', '#ff5252', '#8b5cf6', '#ec4899', '#06b6d4']

export default function Leave({ lang }) {
  const { filterByCompany, filterByEmployeeCompany } = useCompanyFilter()
  const [loading, setLoading] = useState(true)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('requests')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  })

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch leave requests with employee and leave type joins
        const { data: requests, error: reqError } = await supabase
          .from('hr_leave_requests')
          .select(`
            id,
            employee_id,
            leave_type_id,
            start_date,
            end_date,
            days,
            reason,
            status,
            created_at,
            hr_employees!hr_leave_requests_employee_id_fkey(id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code),
            hr_leave_types!hr_leave_requests_leave_type_id_fkey(id, name_th, name_en)
          `)
          .order('created_at', { ascending: false })

        if (reqError) throw reqError
        // Map 'days' column to 'total_days' for frontend compatibility
        setLeaveRequests((requests || []).map(r => ({ ...r, total_days: r.days })))

        // Fetch employees
        const { data: empData, error: empError } = await supabase
          .from('hr_employees')
          .select('id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code, department_id, company_entity')
          .eq('status', 'active')

        if (empError) throw empError
        setEmployees(empData || [])

        // Fetch leave types
        const { data: typesData, error: typesError } = await supabase
          .from('hr_leave_types')
          .select('id, name_th, name_en')

        if (typesError) throw typesError
        setLeaveTypes(typesData || [])

        // Fetch leave balances
        const { data: balancesData, error: balancesError } = await supabase
          .from('hr_leave_balances')
          .select(`
            id,
            employee_id,
            leave_type_id,
            entitled_days,
            used_days,
            remaining_days,
            year,
            hr_employees(id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code),
            hr_leave_types(id, name_th, name_en)
          `)

        if (balancesError) throw balancesError
        setLeaveBalances(balancesData || [])
      } catch (err) {
        console.error('Leave data fetch error:', err)
        setError(err.message || err.details || JSON.stringify(err))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end - start
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return Math.max(0, diffDays)
  }

  // Handle form submission
  const handleCreateRequest = async () => {
    if (!formData.employee_id || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      alert(t('Please fill all required fields', lang))
      return
    }

    try {
      const totalDays = calculateDays(formData.start_date, formData.end_date)
      const newRequest = await insertRow('hr_leave_requests', {
        employee_id: formData.employee_id,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days: totalDays,
        reason: formData.reason,
        status: 'pending',
      })

      // Fetch the full record with joins
      const { data: fullRequest } = await supabase
        .from('hr_leave_requests')
        .select(`
          id,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          days,
          reason,
          status,
          created_at,
          hr_employees(id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code),
          hr_leave_types(id, name_th, name_en)
        `)
        .eq('id', newRequest.id)
        .single()

      setLeaveRequests([{ ...fullRequest, total_days: fullRequest?.days }, ...leaveRequests])
      setShowModal(false)
      setFormData({
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: '',
      })
    } catch (err) {
      console.error('Create request error:', err)
      alert(err.message)
    }
  }

  // Handle approve/reject
  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const updated = await updateRow('hr_leave_requests', requestId, { status: newStatus })
      setLeaveRequests(leaveRequests.map(r => r.id === requestId ? { ...r, status: newStatus } : r))
    } catch (err) {
      console.error('Status update error:', err)
      alert(err.message)
    }
  }

  // Export handler
  const handleExport = () => {
    const exportData = leaveRequests.map(req => ({
      'ชื่อพนักงาน': getEmpDisplayName(req.hr_employees),
      'รหัสพนักงาน': req.hr_employees?.employee_code || '-',
      'ประเภทการลา': getLeaveTypeName(req.hr_leave_types),
      'วันที่เริ่มต้น': fmtDate(req.start_date, lang),
      'วันที่สิ้นสุด': fmtDate(req.end_date, lang),
      'จำนวนวัน': req.total_days,
      'สถานะ': t(req.status, lang),
      'เหตุผล': req.reason || '-',
      'วันที่สร้าง': fmtDate(req.created_at, lang),
    }))

    const columns = [
      { header: 'ชื่อพนักงาน', accessor: 'ชื่อพนักงาน', width: 18 },
      { header: 'รหัสพนักงาน', accessor: 'รหัสพนักงาน', width: 14 },
      { header: 'ประเภทการลา', accessor: 'ประเภทการลา', width: 16 },
      { header: 'วันที่เริ่มต้น', accessor: 'วันที่เริ่มต้น', width: 14 },
      { header: 'วันที่สิ้นสุด', accessor: 'วันที่สิ้นสุด', width: 14 },
      { header: 'จำนวนวัน', accessor: 'จำนวนวัน', width: 10 },
      { header: 'สถานะ', accessor: 'สถานะ', width: 12 },
      { header: 'เหตุผล', accessor: 'เหตุผล', width: 20 },
      { header: 'วันที่สร้าง', accessor: 'วันที่สร้าง', width: 14 },
    ]

    exportToExcel({
      data: exportData,
      columns,
      filename: 'ข้อมูลการลา',
      sheetName: 'Leave Requests'
    })
  }

  // Import handler - insert leave requests
  const handleImportSubmit = async (mappedData) => {
    try {
      let insertedCount = 0

      for (const row of mappedData) {
        // Calculate days if start and end dates are provided
        let totalDays = row.total_days
        if (!totalDays && row.start_date && row.end_date) {
          totalDays = calculateDays(row.start_date, row.end_date)
        }

        // Ensure required fields exist
        if (!row.employee_id || !row.leave_type_id) {
          console.warn('Skipping row - missing required fields:', row)
          continue
        }

        const insertData = {
          employee_id: row.employee_id,
          leave_type_id: row.leave_type_id,
          start_date: row.start_date,
          end_date: row.end_date,
          days: totalDays || 0,
          reason: row.reason || '',
          status: row.status || 'pending',
        }

        const newRequest = await insertRow('hr_leave_requests', insertData)

        // Fetch the full record with joins
        const { data: fullRequest } = await supabase
          .from('hr_leave_requests')
          .select(`
            id,
            employee_id,
            leave_type_id,
            start_date,
            end_date,
            days,
            reason,
            status,
            created_at,
            hr_employees!hr_leave_requests_employee_id_fkey(id, first_name_th, last_name_th, first_name_en, last_name_en, nickname, employee_code),
            hr_leave_types!hr_leave_requests_leave_type_id_fkey(id, name_th, name_en)
          `)
          .eq('id', newRequest.id)
          .single()

        setLeaveRequests([{ ...fullRequest, total_days: fullRequest?.days }, ...leaveRequests])
        insertedCount++
      }

      setShowImport(false)
      return insertedCount
    } catch (err) {
      console.error('Import error:', err)
      throw new Error(err.message)
    }
  }

  // Import column definitions
  const importColumns = [
    {
      header: 'ชื่อพนักงาน / Employee Name',
      headerEn: 'Employee Name',
      dbField: 'employee_id',
      accessor: 'employee_id',
      example: 'John Doe / John Doe',
      transform: (val) => {
        // Find employee by name or code
        const emp = employees.find(e =>
          `${e.first_name_en || ''} ${e.last_name_en || ''}`.toLowerCase().includes(val.toLowerCase()) ||
          `${e.first_name_th || ''} ${e.last_name_th || ''}`.toLowerCase().includes(val.toLowerCase()) ||
          e.employee_code === val
        )
        return emp?.id || val
      }
    },
    {
      header: 'ประเภทการลา / Leave Type',
      headerEn: 'Leave Type',
      dbField: 'leave_type_id',
      accessor: 'leave_type_id',
      example: 'ลาป่วย / Sick Leave',
      transform: (val) => {
        // Find leave type by name
        const lt = leaveTypes.find(l =>
          l.name_en?.toLowerCase().includes(val.toLowerCase()) ||
          l.name_th?.toLowerCase().includes(val.toLowerCase())
        )
        return lt?.id || val
      }
    },
    {
      header: 'วันที่เริ่มต้น / Start Date',
      headerEn: 'Start Date',
      dbField: 'start_date',
      accessor: 'start_date',
      example: '2024-01-15 / 01/15/2024',
      transform: (val) => {
        // Handle various date formats
        if (!val) return null
        const date = new Date(val)
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
      }
    },
    {
      header: 'วันที่สิ้นสุด / End Date',
      headerEn: 'End Date',
      dbField: 'end_date',
      accessor: 'end_date',
      example: '2024-01-17 / 01/17/2024',
      transform: (val) => {
        // Handle various date formats
        if (!val) return null
        const date = new Date(val)
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
      }
    },
    {
      header: 'จำนวนวัน / Days',
      headerEn: 'Days',
      dbField: 'days',
      accessor: 'total_days',
      example: '3',
      transform: (val) => parseInt(val) || 0
    },
    {
      header: 'สถานะ / Status',
      headerEn: 'Status',
      dbField: 'status',
      accessor: 'status',
      example: 'pending / approved / rejected',
      transform: (val) => {
        const status = val.toLowerCase().trim()
        if (status.includes('ลุ่ม') || status === 'pending') return 'pending'
        if (status.includes('อนุ') || status === 'approved') return 'approved'
        if (status.includes('ปฏิเสธ') || status === 'rejected') return 'rejected'
        return 'pending'
      }
    },
    {
      header: 'เหตุผล / Reason',
      headerEn: 'Reason',
      dbField: 'reason',
      accessor: 'reason',
      example: 'ป่วย / Sick',
    }
  ]

  // Company-filtered data
  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany])
  const companyFilteredRequests = useMemo(() => filterByEmployeeCompany(leaveRequests, employees), [leaveRequests, employees, filterByEmployeeCompany])
  const companyFilteredBalances = useMemo(() => filterByEmployeeCompany(leaveBalances, employees), [leaveBalances, employees, filterByEmployeeCompany])

  // Filter and search
  const filteredRequests = useMemo(() => {
    return companyFilteredRequests.filter(req => {
      const statusMatch = statusFilter === 'all' || req.status === statusFilter
      const empName = req.hr_employees ? `${req.hr_employees.first_name_en || ''} ${req.hr_employees.last_name_en || ''}` : ''
      const typeName = req.hr_leave_types ? (req.hr_leave_types.name_en || req.hr_leave_types.name_th || '') : ''
      const searchMatch = !searchQuery ||
        empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        typeName.toLowerCase().includes(searchQuery.toLowerCase())
      return statusMatch && searchMatch
    })
  }, [companyFilteredRequests, statusFilter, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    const pending = companyFilteredRequests.filter(r => r.status === 'pending').length
    const approvedThisMonth = companyFilteredRequests.filter(r => {
      if (r.status !== 'approved') return false
      const created = new Date(r.created_at)
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear
    }).length

    const totalDaysUsed = companyFilteredRequests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + (r.total_days || 0), 0)

    const avgBalance = companyFilteredBalances.length > 0
      ? companyFilteredBalances.reduce((sum, b) => sum + (b.remaining_days || 0), 0) / companyFilteredBalances.length
      : 0

    return { pending, approvedThisMonth, totalDaysUsed, avgBalance }
  }, [companyFilteredRequests, companyFilteredBalances])

  // Prepare leave distribution chart data
  const leaveDistribution = useMemo(() => {
    const distribution = {}
    companyFilteredRequests
      .filter(r => r.status === 'approved')
      .forEach(r => {
        const typeId = r.leave_type_id
        const typeName = r.hr_leave_types ? (lang === 'th' ? r.hr_leave_types.name_th : r.hr_leave_types.name_en) : `Type ${typeId}`
        distribution[typeName] = (distribution[typeName] || 0) + (r.total_days || 0)
      })

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }))
  }, [companyFilteredRequests])

  // Employee options for dropdown
  const employeeOptions = companyFilteredEmployees.map(e => ({
    label: `${e.employee_code} - ${lang === 'th' ? `${e.first_name_th} ${e.last_name_th}` : `${e.first_name_en} ${e.last_name_en}`}${e.nickname ? ' (' + e.nickname + ')' : ''}`,
    value: e.id,
  }))

  // Leave type options for dropdown
  const leaveTypeOptions = leaveTypes.map(lt => ({
    label: lang === 'th' ? lt.name_th : lt.name_en,
    value: lt.id,
  }))

  // Badge color mapping
  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      cancelled: 'gray',
    }
    return colors[status] || 'gray'
  }

  // Table columns for leave requests
  const getEmpDisplayName = (emp) => {
    if (!emp) return '-'
    return (lang === 'th' ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}` : `${emp.first_name_en || ''} ${emp.last_name_en || ''}`) + (emp.nickname ? ` (${emp.nickname})` : '')
  }
  const getLeaveTypeName = (lt) => {
    if (!lt) return '-'
    return lang === 'th' ? (lt.name_th || lt.name_en || '-') : (lt.name_en || lt.name_th || '-')
  }

  const requestColumns = [
    {
      header: t('name', lang),
      render: (row) => getEmpDisplayName(row.hr_employees),
    },
    {
      header: t('leaveType', lang),
      render: (row) => getLeaveTypeName(row.hr_leave_types),
    },
    {
      header: t('startDate', lang),
      render: (row) => fmtDate(row.start_date, lang),
    },
    {
      header: t('endDate', lang),
      render: (row) => fmtDate(row.end_date, lang),
    },
    {
      header: t('days', lang),
      render: (row) => row.total_days,
    },
    {
      header: t('status', lang),
      render: (row) => <Badge color={getStatusBadgeColor(row.status)}>{t(row.status, lang)}</Badge>,
    },
    {
      header: t('actions', lang),
      render: (row) => (
        <div className="flex gap-2">
          {row.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusChange(row.id, 'approved')}
                className="text-green-600 hover:bg-green-50"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusChange(row.id, 'rejected')}
                className="text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  // Table columns for leave balances
  const balanceColumns = [
    {
      header: t('name', lang),
      render: (row) => getEmpDisplayName(row.hr_employees),
    },
    {
      header: t('leaveType', lang),
      render: (row) => getLeaveTypeName(row.hr_leave_types),
    },
    {
      header: t('balance', lang),
      render: (row) => row.remaining_days || 0,
    },
    {
      header: t('used', lang),
      render: (row) => row.used_days || 0,
    },
    {
      header: t('total', lang),
      render: (row) => row.entitled_days || 0,
    },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('leave', lang)}</h1>
        <div className="flex gap-2">
          <ImportExportButtons
            onExport={handleExport}
            onImportClick={() => setShowImport(true)}
            lang={lang}
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            {t('add', lang)}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label={t('pending', lang)}
          value={stats.pending}
          color="yellow"
        />
        <StatCard
          icon={Check}
          label={lang === 'th' ? 'อนุมัติเดือนนี้' : 'Approved This Month'}
          value={stats.approvedThisMonth}
          color="green"
        />
        <StatCard
          icon={Calendar}
          label={lang === 'th' ? 'วันลาทั้งหมด' : 'Total Days Used'}
          value={stats.totalDaysUsed}
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label={lang === 'th' ? 'วันลาคงเหลือ' : 'Avg Leave Balance'}
          value={Math.round(stats.avgBalance)}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'requests', label: t('leave', lang) },
          { key: 'balances', label: lang === 'th' ? 'คงเหลือ' : 'Balances' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Leave Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('search', lang)}
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: t('all', lang), value: 'all' },
                { label: t('pending', lang), value: 'pending' },
                { label: t('approved', lang), value: 'approved' },
                { label: t('rejected', lang), value: 'rejected' },
              ]}
            />
          </div>

          {/* Requests Table */}
          <Card>
            <Table columns={requestColumns} data={filteredRequests} emptyText={t('noData', lang)} />
          </Card>

          {/* Leave Distribution Chart */}
          {leaveDistribution.length > 0 && (
            <Card title={lang === 'th' ? 'การกระจายการลา' : 'Leave Distribution'}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaveDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Leave Balances Tab */}
      {activeTab === 'balances' && (
        <Card>
          <Table columns={balanceColumns} data={companyFilteredBalances} emptyText={t('noData', lang)} />
        </Card>
      )}

      {/* Create Leave Request Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={lang === 'th' ? 'สร้างคำขอลา' : 'Create Leave Request'}
      >
        <div className="space-y-4">
          <Select
            placeholder={t('name', lang)}
            value={formData.employee_id}
            onChange={(val) => setFormData({ ...formData, employee_id: val })}
            options={employeeOptions}
          />
          <Select
            placeholder={t('leaveType', lang)}
            value={formData.leave_type_id}
            onChange={(val) => setFormData({ ...formData, leave_type_id: val })}
            options={leaveTypeOptions}
          />
          <Input
            label={t('startDate', lang)}
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
          <Input
            label={t('endDate', lang)}
            type="date"
            value={formData.end_date}
            onChange={(e) => {
              const newFormData = { ...formData, end_date: e.target.value }
              setFormData(newFormData)
            }}
          />
          {formData.start_date && formData.end_date && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              {lang === 'th' ? 'จำนวนวัน: ' : 'Days: '}{calculateDays(formData.start_date, formData.end_date)}
            </div>
          )}
          <Input
            label={t('reason', lang)}
            placeholder={t('reason', lang)}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('cancel', lang)}
            </Button>
            <Button onClick={handleCreateRequest}>
              {t('save', lang)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportSubmit}
        columns={importColumns}
        tableName={lang === 'th' ? 'ข้อมูลการลา' : 'Leave Requests'}
        lang={lang}
      />
    </div>
  )
}

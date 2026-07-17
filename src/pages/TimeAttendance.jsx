import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Users, CheckCircle, Clock, XCircle, Calendar, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import { PageHeader, KPICard, Section, DetailPanel, Avatar, StatusBadge } from '../components/PageUI'
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport'

// Parse notes field: "ขาด:0 | ป่วย:1 | กิจ:0.5 | พักร้อน:3 | อื่นๆ:0 | รวมลา:3.5 | สาย:12 | กลับก่อน:1"
function parseNotes(notes) {
  if (!notes) return {}
  const result = {}
  notes.split(' | ').forEach(part => {
    const [key, val] = part.split(':')
    if (key && val !== undefined) result[key.trim()] = parseFloat(val) || 0
  })
  return result
}

const monthLabels = { '2026-01': 'ม.ค. 69', '2026-02': 'ก.พ. 69', '2026-03': 'มี.ค. 69' }

export default function TimeAttendance({ lang }) {
  const { filterByCompany } = useCompanyFilter()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch employees
        const { data: empData } = await supabase
          .from('hr_employees')
          .select('id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, company_entity, hr_departments(name_th, name_en)')
          .eq('status', 'active')

        const enriched = (empData || []).map(emp => {
          let n = lang === 'th'
            ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()
            : `${emp.first_name_en || ''} ${emp.last_name_en || ''}`.trim()
          if (emp.nickname) n += ` (${emp.nickname})`
          return {
            id: emp.id,
            employee_code: emp.employee_code,
            full_name: n,
            company_entity: emp.company_entity,
            department: lang === 'th' ? emp.hr_departments?.name_th : emp.hr_departments?.name_en,
          }
        })
        setEmployees(enriched)

        // Fetch attendance records
        const { data: attData } = await supabase
          .from('hr_time_attendance')
          .select('*')
          .eq('source', 'excel_import')
          .order('date', { ascending: true })

        setAttendanceData(attData || [])
      } catch (err) {
        console.error('Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lang])

  // Build employee map
  const empMap = useMemo(() => {
    const m = {}
    employees.forEach(e => { m[e.id] = e })
    return m
  }, [employees])

  // Company-filtered employees
  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany])
  const filteredEmpIds = useMemo(() => new Set(companyFilteredEmployees.map(e => e.id)), [companyFilteredEmployees])

  // Enrich attendance with employee info and parsed notes
  const enrichedAttendance = useMemo(() => {
    return attendanceData
      .filter(a => filteredEmpIds.has(a.employee_id))
      .map(a => {
        const emp = empMap[a.employee_id] || {}
        const parsed = parseNotes(a.notes)
        const month = a.date ? a.date.substring(0, 7) : ''
        return { ...a, ...parsed, emp, month }
      })
  }, [attendanceData, filteredEmpIds, empMap])

  // Filter by selected month
  const filteredData = useMemo(() => {
    let data = enrichedAttendance
    if (selectedMonth !== 'all') data = data.filter(a => a.month === selectedMonth)
    if (searchText) {
      const q = searchText.toLowerCase()
      data = data.filter(a => a.emp.full_name?.toLowerCase().includes(q) || a.emp.employee_code?.toLowerCase().includes(q))
    }
    // เรียงตามรวมลา+ขาด+สาย จากมากไปน้อย
    return data.sort((a, b) => {
      const totalA = (Number(a['รวมลา']) || 0) + (Number(a['ขาด']) || 0) + (Number(a['สาย']) || 0)
      const totalB = (Number(b['รวมลา']) || 0) + (Number(b['ขาด']) || 0) + (Number(b['สาย']) || 0)
      return totalB - totalA
    })
  }, [enrichedAttendance, selectedMonth, searchText])

  // KPI totals from filtered data
  const kpis = useMemo(() => {
    const uniqueEmps = new Set(filteredData.map(a => a.employee_id)).size
    let totalAbsent = 0, totalSick = 0, totalPersonal = 0, totalAnnual = 0, totalOther = 0
    let totalLeave = 0, totalLate = 0, totalEarlyLeave = 0

    filteredData.forEach(a => {
      totalAbsent += a['ขาด'] || 0
      totalSick += a['ป่วย'] || 0
      totalPersonal += a['กิจ'] || 0
      totalAnnual += a['พักร้อน'] || 0
      totalOther += a['อื่นๆ'] || 0
      totalLeave += a['รวมลา'] || 0
      totalLate += a['สาย'] || 0
      totalEarlyLeave += a['กลับก่อน'] || 0
    })

    return { uniqueEmps, totalAbsent, totalSick, totalPersonal, totalAnnual, totalOther, totalLeave, totalLate, totalEarlyLeave }
  }, [filteredData])

  // Monthly bar chart
  const monthlyChart = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03']
    return months.map(m => {
      const mData = enrichedAttendance.filter(a => a.month === m)
      let sick = 0, personal = 0, annual = 0, late = 0, absent = 0
      mData.forEach(a => {
        sick += a['ป่วย'] || 0
        personal += a['กิจ'] || 0
        annual += a['พักร้อน'] || 0
        late += a['สาย'] || 0
        absent += a['ขาด'] || 0
      })
      return { month: monthLabels[m] || m, 'ลาป่วย': sick, 'ลากิจ': personal, 'ลาพักร้อน': annual, 'มาสาย': late, 'ขาด': absent }
    })
  }, [enrichedAttendance])

  // Pie chart - leave type breakdown
  const pieData = useMemo(() => {
    return [
      { name: 'ลาป่วย', value: Math.round(kpis.totalSick * 10) / 10 },
      { name: 'ลากิจ', value: Math.round(kpis.totalPersonal * 10) / 10 },
      { name: 'ลาพักร้อน', value: Math.round(kpis.totalAnnual * 10) / 10 },
      { name: 'ลาอื่นๆ', value: Math.round(kpis.totalOther * 10) / 10 },
    ].filter(d => d.value > 0)
  }, [kpis])

  const pieColors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

  // Export
  const handleExport = () => {
    const exportData = filteredData.map((a, i) => ({
      'ลำดับ': i + 1,
      'รหัส': a.emp.employee_code || '',
      'ชื่อ-นามสกุล': a.emp.full_name || '',
      'เดือน': monthLabels[a.month] || a.month,
      'ขาด': a['ขาด'] || 0,
      'ลาป่วย': a['ป่วย'] || 0,
      'ลากิจ': a['กิจ'] || 0,
      'ลาพักร้อน': a['พักร้อน'] || 0,
      'ลาอื่นๆ': a['อื่นๆ'] || 0,
      'รวมลา': a['รวมลา'] || 0,
      'มาสาย': a['สาย'] || 0,
      'กลับก่อน': a['กลับก่อน'] || 0,
    }))
    const columns = [
      { header: 'ลำดับ', accessor: 'ลำดับ', width: 8 },
      { header: 'รหัส', accessor: 'รหัส', width: 14 },
      { header: 'ชื่อ-นามสกุล', accessor: 'ชื่อ-นามสกุล', width: 25 },
      { header: 'เดือน', accessor: 'เดือน', width: 10 },
      { header: 'ขาด', accessor: 'ขาด', width: 8 },
      { header: 'ลาป่วย', accessor: 'ลาป่วย', width: 8 },
      { header: 'ลากิจ', accessor: 'ลากิจ', width: 8 },
      { header: 'ลาพักร้อน', accessor: 'ลาพักร้อน', width: 10 },
      { header: 'ลาอื่นๆ', accessor: 'ลาอื่นๆ', width: 8 },
      { header: 'รวมลา', accessor: 'รวมลา', width: 8 },
      { header: 'มาสาย', accessor: 'มาสาย', width: 8 },
      { header: 'กลับก่อน', accessor: 'กลับก่อน', width: 10 },
    ]
    exportToExcel({ data: exportData, columns, filename: 'ข้อมูลลา-มาสาย-ขาด', sheetName: 'Attendance' })
  }

  // Import
  const handleImportData = async (mappedData) => {
    try {
      let count = 0
      for (const row of mappedData) {
        if (!row.employee_code) continue
        const { error } = await supabase.from('hr_time_attendance').insert([{
          employee_id: row.employee_id || null,
          date: row.date || new Date().toISOString().split('T')[0],
          status: row.status || 'present',
          notes: row.notes || '',
          source: 'excel_import',
        }])
        if (!error) count++
      }
      setShowImport(false)
      // Refresh
      const { data } = await supabase.from('hr_time_attendance').select('*').eq('source', 'excel_import').order('date')
      if (data) setAttendanceData(data)
      return count
    } catch (err) { throw err }
  }

  const importColumns = [
    { header: 'รหัสพนักงาน', headerEn: 'Employee Code', accessor: 'employee_code', dbField: 'employee_code', example: 'OA10120270' },
    { header: 'วันที่', headerEn: 'Date', accessor: 'date', dbField: 'date', example: '2026-01-01' },
    { header: 'สถานะ', headerEn: 'Status', accessor: 'status', dbField: 'status', example: 'present' },
    { header: 'หมายเหตุ', headerEn: 'Notes', accessor: 'notes', dbField: 'notes', example: 'ขาด:0 | ป่วย:1 | ...' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="เวลาทำงาน" lang={lang} />
        <ImportExportButtons onExport={handleExport} onImportClick={() => setShowImport(true)} lang={lang} />
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-4 flex-wrap">
        <div>
          <label className="text-xs text-gray-500 block mb-1">เดือน</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-44"
          >
            <option value="all">ทั้งหมด (ม.ค.-มี.ค. 69)</option>
            <option value="2026-01">มกราคม 2569</option>
            <option value="2026-02">กุมภาพันธ์ 2569</option>
            <option value="2026-03">มีนาคม 2569</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">ค้นหา</label>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="ชื่อพนักงาน / รหัส..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64"
          />
        </div>
        <div className="text-sm text-gray-500 self-end pb-2">
          แสดง {filteredData.length} รายการ จาก {enrichedAttendance.length} ทั้งหมด
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
        <KPICard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label="พนักงาน" value={kpis.uniqueEmps} />
        <KPICard icon={XCircle} iconBg="bg-red-100" iconColor="text-red-600" label="วันขาดงาน" value={kpis.totalAbsent} />
        <KPICard icon={Calendar} iconBg="bg-orange-100" iconColor="text-orange-600" label="วันลารวม" value={Math.round(kpis.totalLeave * 10) / 10} />
        <KPICard icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" label="ลาป่วย" value={Math.round(kpis.totalSick * 10) / 10} />
        <KPICard icon={Clock} iconBg="bg-yellow-100" iconColor="text-yellow-600" label="ครั้งมาสาย" value={Math.round(kpis.totalLate)} />
        <KPICard icon={AlertTriangle} iconBg="bg-purple-100" iconColor="text-purple-600" label="ครั้งกลับก่อน" value={Math.round(kpis.totalEarlyLeave * 10) / 10} />
      </div>

      {/* Main Content */}
      <div className="flex gap-5">
        {/* Left Column */}
        <div className="flex-1 space-y-5">
          {/* Data Table */}
          <Section title={`ข้อมูลลา / มาสาย / ขาด ${selectedMonth === 'all' ? '(ม.ค.-มี.ค. 69)' : monthLabels[selectedMonth] || ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">ชื่อ-นามสกุล</th>
                    {selectedMonth === 'all' && <th className="text-left py-2 px-2 font-semibold text-gray-700">เดือน</th>}
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">ขาด</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">ป่วย</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">กิจ</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">พักร้อน</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">รวมลา</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">สาย</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">กลับก่อน</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 100).map((a, idx) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-500 text-xs">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={a.emp.full_name || ''} size="sm" />
                          <div>
                            <span className="font-medium text-gray-900 text-xs">{a.emp.full_name || '-'}</span>
                            <span className="text-gray-400 text-[10px] ml-1">{a.emp.employee_code}</span>
                          </div>
                        </div>
                      </td>
                      {selectedMonth === 'all' && (
                        <td className="py-2 px-2 text-xs text-gray-600">{monthLabels[a.month] || a.month}</td>
                      )}
                      <td className={`py-2 px-2 text-center text-xs font-medium ${(a['ขาด'] || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {a['ขาด'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs ${(a['ป่วย'] || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {a['ป่วย'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs ${(a['กิจ'] || 0) > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {a['กิจ'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs ${(a['พักร้อน'] || 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {a['พักร้อน'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs font-semibold ${(a['รวมลา'] || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {a['รวมลา'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs ${(a['สาย'] || 0) > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                        {a['สาย'] || 0}
                      </td>
                      <td className={`py-2 px-2 text-center text-xs ${(a['กลับก่อน'] || 0) > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {a['กลับก่อน'] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length > 100 && (
                <div className="text-center py-2 text-xs text-gray-400">แสดง 100 จาก {filteredData.length} รายการ</div>
              )}
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-gray-400">ไม่มีข้อมูล</div>
              )}
            </div>
          </Section>

          {/* Monthly Bar Chart */}
          <Section title="สถิติรายเดือน (ม.ค. - มี.ค. 2569)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#999" style={{ fontSize: '12px' }} />
                <YAxis stroke="#999" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="ลาป่วย" fill="#ef4444" />
                <Bar dataKey="ลากิจ" fill="#f59e0b" />
                <Bar dataKey="ลาพักร้อน" fill="#3b82f6" />
                <Bar dataKey="มาสาย" fill="#fb923c" />
                <Bar dataKey="ขาด" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Right Panel */}
        <DetailPanel>
          {/* Pie Chart - Leave breakdown */}
          <Section title="สัดส่วนการลา">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} วัน`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2 text-xs">
                  {pieData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieColors[idx] }} />
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{entry.value} วัน</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">ไม่มีข้อมูลการลา</div>
            )}
          </Section>

          {/* Summary Stats */}
          <Section title="สรุปภาพรวม">
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">จำนวนวันขาดรวม</p>
                <p className="text-xl font-bold text-red-600">{kpis.totalAbsent}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">จำนวนวันลารวม</p>
                <p className="text-xl font-bold text-orange-600">{Math.round(kpis.totalLeave * 10) / 10}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">จำนวนครั้งมาสายรวม</p>
                <p className="text-xl font-bold text-amber-600">{Math.round(kpis.totalLate)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">เฉลี่ยลาต่อคน/เดือน</p>
                <p className="text-xl font-bold text-blue-600">
                  {kpis.uniqueEmps > 0 ? (kpis.totalLeave / kpis.uniqueEmps).toFixed(1) : 0} วัน
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">เฉลี่ยมาสายต่อคน/เดือน</p>
                <p className="text-xl font-bold text-purple-600">
                  {kpis.uniqueEmps > 0 ? (kpis.totalLate / kpis.uniqueEmps).toFixed(1) : 0} ครั้ง
                </p>
              </div>
            </div>
          </Section>
        </DetailPanel>
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportData}
        columns={importColumns}
        tableName="เวลาทำงาน"
        lang={lang}
      />
    </div>
  )
}

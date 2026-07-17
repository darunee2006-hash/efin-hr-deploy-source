import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Clock, CheckCircle2, FileCheck, Receipt, Building2, Stamp, Upload, Save, Trash2, Eye } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useCompanyFilter } from '../lib/CompanyFilterContext'

const T = (lang, th, en) => lang === 'th' ? th : en

const DOC_TYPES = [
  { key: 'employment_cert', icon: FileCheck, color: 'bg-blue-500', label_th: 'หนังสือรับรองการทำงาน', label_en: 'Employment Certificate', desc_th: 'ยืนยันสถานะการเป็นพนักงานของบริษัท', desc_en: 'Confirm employment status' },
  { key: 'salary_cert', icon: Building2, color: 'bg-emerald-500', label_th: 'หนังสือรับรองเงินเดือน', label_en: 'Salary Certificate', desc_th: 'ยืนยันอัตราเงินเดือนปัจจุบัน', desc_en: 'Confirm current salary rate' },
  { key: 'payslip', icon: Receipt, color: 'bg-violet-500', label_th: 'สลิปเงินเดือน', label_en: 'Payslip', desc_th: 'รายละเอียดการจ่ายเงินเดือนประจำเดือน', desc_en: 'Monthly payment details' },
  { key: 'withholding_tax', icon: Stamp, color: 'bg-amber-500', label_th: 'หนังสือรับรองภาษี (50 ทวิ)', label_en: 'Withholding Tax Certificate', desc_th: 'หนังสือรับรองการหักภาษี ณ ที่จ่าย', desc_en: 'Tax withholding certificate' },
]

// ============================================================
// PDF Document Generator (opens printable HTML)
// ============================================================
function generateDocument(type, employee, settings, lang) {
  const today = new Date()
  const thaiDate = today.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
  const engDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const docDate = lang === 'th' ? thaiDate : engDate

  // Use employee's actual company from hr_companies (via _company), fallback to settings
  const empCompany = employee._company || {}
  const companyName = empCompany.name_th || settings.company_name_th || '-'
  const companyNameEn = empCompany.name_en || settings.company_name_en || '-'
  const companyAddr = (lang === 'th' ? empCompany.address_th : (empCompany.address_en || empCompany.address_th)) || settings.company_address || '-'
  const signerName = settings.hr_signer_name || 'ดรุณี ศรีสุข'
  const signerPos = settings.hr_signer_position || 'ผู้อำนวยการฝ่ายทรัพยากรบุคคล'
  const sigImage = settings.hr_signature_image || ''

  const empName = `${employee.first_name_th || ''} ${employee.last_name_th || ''}`.trim() + (employee.nickname ? ` (${employee.nickname})` : '')
  const empNameEn = `${employee.first_name_en || ''} ${employee.last_name_en || ''}`.trim()
  const empCode = employee.employee_code || ''
  const empPosition = employee.position_th || employee.position_en || ''
  const empDept = employee.department_name || ''
  const empSalary = Number(employee.base_salary || 0).toLocaleString('th-TH')
  const hireDate = employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'

  const sigBlock = `
    <div style="margin-top:60px; text-align:center; width:250px; margin-left:auto;">
      ${sigImage ? `<img src="${sigImage}" style="height:60px; margin:0 auto 5px; display:block;" />` : '<div style="height:60px;"></div>'}
      <div style="border-top:1px solid #333; padding-top:5px;">
        <p style="margin:0; font-weight:bold;">${signerName}</p>
        <p style="margin:0; font-size:13px; color:#555;">${signerPos}</p>
      </div>
    </div>
  `

  const headerBlock = `
    <div style="text-align:center; margin-bottom:30px; border-bottom:2px solid #1e40af; padding-bottom:15px;">
      <h2 style="margin:0; color:#1e40af; font-size:20px;">${companyName}</h2>
      <p style="margin:2px 0; font-size:13px; color:#555;">${companyNameEn}</p>
      <p style="margin:2px 0; font-size:12px; color:#777;">${companyAddr}</p>
    </div>
  `

  let title = ''
  let body = ''

  if (type === 'employment_cert') {
    title = 'หนังสือรับรองการทำงาน'
    body = `
      <p style="text-align:right; margin-bottom:20px;">วันที่ ${docDate}</p>
      <h3 style="text-align:center; margin:30px 0;">หนังสือรับรองการทำงาน</h3>
      <p style="text-indent:40px; line-height:2;">
        หนังสือฉบับนี้ออกให้เพื่อรับรองว่า <strong>${empName}</strong> ${empNameEn ? `(${empNameEn})` : ''}
        รหัสพนักงาน <strong>${empCode}</strong> ปัจจุบันดำรงตำแหน่ง <strong>${empPosition}</strong>
        สังกัด<strong>${empDept}</strong> โดยเริ่มปฏิบัติงานตั้งแต่วันที่ ${hireDate} จนถึงปัจจุบัน
      </p>
      <p style="text-indent:40px; line-height:2;">
        จึงออกหนังสือฉบับนี้ให้ไว้เพื่อเป็นหลักฐาน
      </p>
      ${sigBlock}
    `
  } else if (type === 'salary_cert') {
    title = 'หนังสือรับรองเงินเดือน'
    body = `
      <p style="text-align:right; margin-bottom:20px;">วันที่ ${docDate}</p>
      <h3 style="text-align:center; margin:30px 0;">หนังสือรับรองเงินเดือน</h3>
      <p style="text-indent:40px; line-height:2;">
        หนังสือฉบับนี้ออกให้เพื่อรับรองว่า <strong>${empName}</strong> ${empNameEn ? `(${empNameEn})` : ''}
        รหัสพนักงาน <strong>${empCode}</strong> ปัจจุบันดำรงตำแหน่ง <strong>${empPosition}</strong>
        สังกัด<strong>${empDept}</strong> โดยได้รับเงินเดือนในอัตรา <strong>${empSalary} บาท</strong> ต่อเดือน
      </p>
      <p style="text-indent:40px; line-height:2;">
        จึงออกหนังสือฉบับนี้ให้ไว้เพื่อเป็นหลักฐาน
      </p>
      ${sigBlock}
    `
  } else if (type === 'payslip') {
    const salary = Number(employee.base_salary || 0)
    const sso = Math.min(salary * 0.05, 750)
    const tax = salary > 50000 ? (salary - 50000) * 0.05 : 0
    const net = salary - sso - tax
    const monthName = today.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })

    title = 'สลิปเงินเดือน'
    body = `
      <h3 style="text-align:center; margin:20px 0;">ใบแจ้งรายละเอียดเงินเดือน</h3>
      <p style="text-align:center; color:#555;">ประจำเดือน ${monthName}</p>

      <table style="width:100%; margin:20px 0; border-collapse:collapse;">
        <tr style="background:#f0f4ff;">
          <td style="padding:8px; border:1px solid #ddd; width:30%; font-weight:bold;">ชื่อ-นามสกุล</td>
          <td style="padding:8px; border:1px solid #ddd;">${empName}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">รหัสพนักงาน</td>
          <td style="padding:8px; border:1px solid #ddd;">${empCode}</td>
        </tr>
        <tr style="background:#f0f4ff;">
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">ตำแหน่ง</td>
          <td style="padding:8px; border:1px solid #ddd;">${empPosition}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">แผนก</td>
          <td style="padding:8px; border:1px solid #ddd;">${empDept}</td>
        </tr>
      </table>

      <table style="width:100%; margin:20px 0; border-collapse:collapse;">
        <thead>
          <tr style="background:#1e40af; color:white;">
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">รายการ</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:right; width:150px;">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px; border:1px solid #ddd;">เงินเดือน</td><td style="padding:8px; border:1px solid #ddd; text-align:right;">${salary.toLocaleString('th-TH', {minimumFractionDigits:2})}</td></tr>
          <tr style="background:#fff5f5;"><td style="padding:8px; border:1px solid #ddd;">หัก ประกันสังคม</td><td style="padding:8px; border:1px solid #ddd; text-align:right; color:red;">-${sso.toLocaleString('th-TH', {minimumFractionDigits:2})}</td></tr>
          <tr style="background:#fff5f5;"><td style="padding:8px; border:1px solid #ddd;">หัก ภาษี ณ ที่จ่าย</td><td style="padding:8px; border:1px solid #ddd; text-align:right; color:red;">-${tax.toLocaleString('th-TH', {minimumFractionDigits:2})}</td></tr>
          <tr style="background:#f0fdf4; font-weight:bold; font-size:16px;"><td style="padding:10px; border:1px solid #ddd;">เงินได้สุทธิ</td><td style="padding:10px; border:1px solid #ddd; text-align:right; color:#16a34a;">${net.toLocaleString('th-TH', {minimumFractionDigits:2})}</td></tr>
        </tbody>
      </table>
      ${sigBlock}
    `
  } else if (type === 'withholding_tax') {
    const salary = Number(employee.base_salary || 0)
    const annualSalary = salary * 12
    const annualTax = salary > 50000 ? (salary - 50000) * 0.05 * 12 : 0

    title = 'หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)'
    body = `
      <p style="text-align:right; margin-bottom:20px;">วันที่ ${docDate}</p>
      <h3 style="text-align:center; margin:20px 0;">หนังสือรับรองการหักภาษี ณ ที่จ่าย</h3>
      <p style="text-align:center; color:#555; margin-bottom:20px;">ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร</p>

      <table style="width:100%; margin:20px 0; border-collapse:collapse;">
        <tr style="background:#f0f4ff;">
          <td style="padding:8px; border:1px solid #ddd; width:35%; font-weight:bold;">ผู้มีเงินได้</td>
          <td style="padding:8px; border:1px solid #ddd;">${empName} ${empNameEn ? `(${empNameEn})` : ''}</td>
        </tr>
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">รหัสพนักงาน</td>
          <td style="padding:8px; border:1px solid #ddd;">${empCode}</td>
        </tr>
        <tr style="background:#f0f4ff;">
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">ผู้จ่ายเงินได้</td>
          <td style="padding:8px; border:1px solid #ddd;">${companyName}</td>
        </tr>
      </table>

      <table style="width:100%; margin:20px 0; border-collapse:collapse;">
        <thead>
          <tr style="background:#1e40af; color:white;">
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">ประเภทเงินได้</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:right;">จำนวนเงินที่จ่าย</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:right;">ภาษีที่หัก</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:8px; border:1px solid #ddd;">เงินเดือน ค่าจ้าง (ม.40(1))</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:right;">${annualSalary.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:right;">${annualTax.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
          </tr>
          <tr style="font-weight:bold; background:#f0f4ff;">
            <td style="padding:8px; border:1px solid #ddd;">รวมทั้งสิ้น</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:right;">${annualSalary.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
            <td style="padding:8px; border:1px solid #ddd; text-align:right;">${annualTax.toLocaleString('th-TH', {minimumFractionDigits:2})}</td>
          </tr>
        </tbody>
      </table>
      ${sigBlock}
    `
  }

  // Open printable HTML in new window
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${empName}</title>
  <style>
    @media print { body { margin: 0; } @page { margin: 20mm; } .no-print { display: none !important; } }
    body { font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; max-width: 700px; margin: 30px auto; padding: 0 20px; color: #333; font-size: 15px; line-height: 1.6; }
    .no-print { text-align: center; margin-bottom: 20px; }
    .no-print button { padding: 10px 30px; background: #1e40af; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; }
    .no-print button:hover { background: #1e3a8a; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">พิมพ์ / บันทึกเป็น PDF</button>
  </div>
  ${headerBlock}
  ${body}
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

// ============================================================
// Admin Signature Settings Panel
// ============================================================
function AdminSignaturePanel({ settings, onUpdate, lang }) {
  const [signerName, setSignerName] = useState(settings.hr_signer_name || '')
  const [signerPos, setSignerPos] = useState(settings.hr_signer_position || '')
  const [sigImage, setSigImage] = useState(settings.hr_signature_image || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSigImage(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = [
        { setting_key: 'hr_signer_name', setting_value: signerName },
        { setting_key: 'hr_signer_position', setting_value: signerPos },
        { setting_key: 'hr_signature_image', setting_value: sigImage },
      ]
      for (const u of updates) {
        const { error } = await supabase.from('hr_settings').update({ setting_value: u.setting_value, updated_at: new Date().toISOString() }).eq('setting_key', u.setting_key)
        if (error) throw error
      }
      onUpdate({ ...settings, hr_signer_name: signerName, hr_signer_position: signerPos, hr_signature_image: sigImage })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save settings error:', err)
      alert('บันทึกไม่สำเร็จ: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Stamp className="w-5 h-5 text-blue-600" />
        <h3 className="text-base font-bold text-gray-900">{T(lang, 'ตั้งค่าลายเซ็น HR', 'HR Signature Settings')}</h3>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-full">ADMIN</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{T(lang, 'ชื่อผู้ลงนาม', 'Signer Name')}</label>
          <input value={signerName} onChange={e => setSignerName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{T(lang, 'ตำแหน่งผู้ลงนาม', 'Signer Position')}</label>
          <input value={signerPos} onChange={e => setSignerPos(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">{T(lang, 'รูปลายเซ็น', 'Signature Image')}</label>
        <div className="flex items-center gap-4">
          {sigImage ? (
            <div className="relative border rounded-lg p-2 bg-gray-50">
              <img src={sigImage} alt="Signature" className="h-16 object-contain" />
              <button onClick={() => { setSigImage(''); if (fileRef.current) fileRef.current.value = '' }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center w-48 h-16 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400">
              {T(lang, 'ยังไม่มีรูปลายเซ็น', 'No signature uploaded')}
            </div>
          )}
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            {T(lang, 'อัปโหลดรูป', 'Upload')}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{T(lang, 'แนะนำ: ไฟล์ PNG พื้นหลังโปร่งใส ขนาดไม่เกิน 300x100 px', 'Recommended: PNG with transparent background, max 300x100px')}</p>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          <Save className="w-4 h-4" />
          {saving ? T(lang, 'กำลังบันทึก...', 'Saving...') : T(lang, 'บันทึก', 'Save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" /> {T(lang, 'บันทึกแล้ว', 'Saved')}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================
export default function MyDocuments({ lang }) {
  const { filterByCompany, filterByEmployeeCompany } = useCompanyFilter()
  const { user, profile, role } = useAuth()
  const [employee, setEmployee] = useState(null)
  const [settings, setSettings] = useState({})
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [purpose, setPurpose] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch employee data + company info
        if (profile?.employee_id) {
          const { data: emp } = await supabase
            .from('hr_employees')
            .select('*, hr_departments(name_th, name_en)')
            .eq('id', profile.employee_id)
            .single()
          if (emp) {
            // Fetch company info from hr_companies based on employee's company_entity
            let companyInfo = null
            if (emp.company_entity) {
              const { data: comp } = await supabase
                .from('hr_companies')
                .select('*')
                .eq('code', emp.company_entity)
                .single()
              companyInfo = comp
            }
            setEmployee({
              ...emp,
              department_name: emp.hr_departments ? (lang === 'th' ? emp.hr_departments.name_th : emp.hr_departments.name_en) : '',
              _company: companyInfo
            })
          }
        }

        // Fetch settings
        const { data: settingsData } = await supabase.from('hr_settings').select('*')
        const settingsMap = {}
        ;(settingsData || []).forEach(s => { settingsMap[s.setting_key] = s.setting_value })
        setSettings(settingsMap)

        // Fetch my requests
        const { data: reqData } = await supabase
          .from('hr_document_requests')
          .select('*')
          .order('requested_at', { ascending: false })
          .limit(20)
        setRequests(reqData || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [profile, lang])

  const handleRequest = async (docType) => {
    if (!employee) {
      alert(T(lang, 'ไม่พบข้อมูลพนักงาน กรุณาติดต่อ HR', 'Employee data not found. Please contact HR.'))
      return
    }
    setGenerating(docType)
    try {
      // 1. Log request to DB
      await supabase.from('hr_document_requests').insert({
        employee_id: employee.id,
        user_id: user.id,
        document_type: docType,
        status: 'completed',
        purpose: purpose || null,
        completed_at: new Date().toISOString(),
      })

      // 2. Send email notification to HR via Edge Function or log
      const notifyEmail = settings.hr_notification_email || 'hr@efinancethai.com'
      const docLabel = DOC_TYPES.find(d => d.key === docType)?.label_th || docType
      const empName = `${employee.first_name_th || ''} ${employee.last_name_th || ''}`.trim() + (employee.nickname ? ` (${employee.nickname})` : '')

      // Try to send notification via Supabase Edge Function
      try {
        await supabase.functions.invoke('notify-hr', {
          body: {
            to: notifyEmail,
            subject: `[HR System] คำขอเอกสาร: ${docLabel}`,
            body: `พนักงาน ${empName} (${employee.employee_code}) ได้ขอ${docLabel}\nวันที่: ${new Date().toLocaleString('th-TH')}\nวัตถุประสงค์: ${purpose || '-'}`
          }
        })
      } catch {
        // Edge function may not exist yet — still continue
        console.log(`Notification would be sent to ${notifyEmail}: ${empName} requested ${docLabel}`)
      }

      // 3. Generate PDF
      generateDocument(docType, employee, settings, lang)

      // 4. Refresh request list
      const { data: reqData } = await supabase
        .from('hr_document_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(20)
      setRequests(reqData || [])
      setPurpose('')
    } catch (err) {
      alert(T(lang, 'เกิดข้อผิดพลาด: ', 'Error: ') + err.message)
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const docTypeLabel = (key) => {
    const d = DOC_TYPES.find(t => t.key === key)
    return d ? T(lang, d.label_th, d.label_en) : key
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{T(lang, 'เอกสารของฉัน', 'My Documents')}</h1>
        <p className="text-sm text-gray-500">{T(lang, 'ขอและดาวน์โหลดเอกสารรับรองต่างๆ', 'Request and download certificates')}</p>
      </div>

      {/* Employee info */}
      {employee && (
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">
            {(employee.first_name_th || '?')[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{employee.first_name_th} {employee.last_name_th}{employee.nickname ? ` (${employee.nickname})` : ''}</p>
            <p className="text-xs text-gray-500">{employee.employee_code} | {employee.position_th} | {employee.department_name}</p>
          </div>
        </div>
      )}

      {/* Purpose input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{T(lang, 'วัตถุประสงค์ (ถ้ามี)', 'Purpose (optional)')}</label>
        <input value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder={T(lang, 'เช่น ยื่นขอสินเชื่อธนาคาร, ยื่นวีซ่า...', 'e.g. bank loan, visa application...')}
          className="w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
      </div>

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOC_TYPES.map(doc => (
          <div key={doc.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl ${doc.color} flex items-center justify-center flex-shrink-0`}>
                <doc.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{T(lang, doc.label_th, doc.label_en)}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{T(lang, doc.desc_th, doc.desc_en)}</p>
              </div>
            </div>
            <button
              onClick={() => handleRequest(doc.key)}
              disabled={generating === doc.key || !employee}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {generating === doc.key ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {T(lang, 'กำลังสร้าง...', 'Generating...')}</>
              ) : (
                <><Download className="w-4 h-4" /> {T(lang, 'ขอเอกสาร & ดาวน์โหลด PDF', 'Request & Download PDF')}</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            {T(lang, 'ประวัติการขอเอกสาร', 'Request History')}
          </h3>
          <div className="space-y-2">
            {requests.slice(0, 10).map((req, i) => (
              <div key={req.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">{docTypeLabel(req.document_type)}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(req.requested_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium">{T(lang, 'หมายเหตุ', 'Note')}:</p>
        <p>{T(lang,
          `ทุกครั้งที่มีการขอเอกสาร ระบบจะแจ้งเตือนไปที่ ${settings.hr_notification_email || 'hr@efinancethai.com'} โดยอัตโนมัติ`,
          `Every document request will automatically notify ${settings.hr_notification_email || 'hr@efinancethai.com'}`
        )}</p>
      </div>

      {/* Admin: Signature Settings */}
      {role === 'admin' && (
        <AdminSignaturePanel settings={settings} onUpdate={setSettings} lang={lang} />
      )}
    </div>
  )
}

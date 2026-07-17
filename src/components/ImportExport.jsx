import { useState, useRef } from 'react'
import { Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import * as XLSX from 'xlsx'

// ============================================================
// Shared Export utility
// ============================================================
export function exportToExcel({ data, columns, filename, sheetName = 'Sheet1' }) {
  if (!data || data.length === 0) {
    alert('ไม่มีข้อมูลที่จะส่งออก')
    return
  }

  const exportRows = data.map(row => {
    const obj = {}
    columns.forEach(col => {
      const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]
      obj[col.header] = val ?? ''
    })
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(exportRows)
  ws['!cols'] = columns.map(c => ({ wch: Math.max((c.header || '').length * 2, c.width || 14) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ============================================================
// Shared Import parser
// ============================================================
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' })
        resolve(jsonData)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ============================================================
// Import Modal component
// ============================================================
export function ImportModal({ open, onClose, onImport, columns, tableName, lang = 'th' }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const T = (th, en) => lang === 'th' ? th : en

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setResult(null)
    try {
      const rows = await parseExcelFile(f)
      if (rows.length === 0) {
        setError(T('ไฟล์ไม่มีข้อมูล', 'File contains no data'))
        return
      }
      setPreview(rows.slice(0, 5))
    } catch (err) {
      setError(T('อ่านไฟล์ไม่สำเร็จ: ', 'Failed to read file: ') + err.message)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setError(null)
    try {
      const allRows = await parseExcelFile(file)
      // Map columns from Thai headers to DB columns
      const mapped = allRows.map(row => {
        const obj = {}
        columns.forEach(col => {
          // Try matching by header name
          const val = row[col.header] ?? row[col.headerEn] ?? row[col.accessor] ?? undefined
          if (val !== undefined && val !== '' && col.dbField) {
            obj[col.dbField] = col.transform ? col.transform(val) : val
          }
        })
        return obj
      }).filter(obj => Object.keys(obj).length > 0)

      if (mapped.length === 0) {
        setError(T('ไม่พบข้อมูลที่ตรงกับรูปแบบ กรุณาตรวจสอบหัวคอลัมน์', 'No matching data found. Please check column headers.'))
        setImporting(false)
        return
      }

      const count = await onImport(mapped)
      setResult(T(`นำเข้าสำเร็จ ${count} รายการ`, `Successfully imported ${count} records`))
      setPreview([])
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(T('นำเข้าไม่สำเร็จ: ', 'Import failed: ') + err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const headers = columns.filter(c => c.dbField).map(c => c.header)
    const example = columns.filter(c => c.dbField).map(c => c.example || '')
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    ws['!cols'] = columns.filter(c => c.dbField).map(c => ({ wch: Math.max((c.header || '').length * 2, c.width || 14) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tableName || 'Template')
    XLSX.writeFile(wb, `Template-${tableName || 'import'}.xlsx`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900">{T('นำเข้าข้อมูล', 'Import Data')}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template download */}
          <button onClick={handleDownloadTemplate}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 transition">
            <Download className="w-4 h-4" />
            {T('ดาวน์โหลด Template', 'Download Template')}
          </button>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{T('เลือกไฟล์ (.xlsx, .csv)', 'Choose file (.xlsx, .csv)')}</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:font-medium hover:file:bg-blue-100 cursor-pointer" />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{T(`ตัวอย่าง ${preview.length} แถวแรก`, `Preview first ${preview.length} rows`)}</p>
              <div className="border rounded-lg overflow-auto max-h-40 text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).slice(0, 5).map(k => (
                        <th key={k} className="px-2 py-1 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                      {Object.keys(preview[0]).length > 5 && <th className="px-2 py-1 text-gray-400">...</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).slice(0, 5).map((v, j) => (
                          <td key={j} className="px-2 py-1 whitespace-nowrap text-gray-700">{String(v).substring(0, 20)}</td>
                        ))}
                        {Object.keys(row).length > 5 && <td className="px-2 py-1 text-gray-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{result}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition">
              {T('ปิด', 'Close')}
            </button>
            <button onClick={handleImport} disabled={!file || importing || !!result}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
              {importing ? T('กำลังนำเข้า...', 'Importing...') : T('นำเข้าข้อมูล', 'Import')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Import/Export button bar component
// ============================================================
export function ImportExportButtons({ onExport, onImportClick, lang = 'th' }) {
  const T = (th, en) => lang === 'th' ? th : en
  return (
    <div className="flex gap-2">
      {onImportClick && (
        <button onClick={onImportClick}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">
          <Upload size={14} /> {T('นำเข้า', 'Import')}
        </button>
      )}
      {onExport && (
        <button onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition">
          <Download size={14} /> {T('ส่งออก', 'Export')}
        </button>
      )}
    </div>
  )
}

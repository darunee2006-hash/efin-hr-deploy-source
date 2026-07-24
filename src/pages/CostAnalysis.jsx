import { useState, useEffect, useMemo, useRef } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Users, Building2, BarChart3, PieChart, Calendar, Clock, ChevronDown, ChevronRight, Layers, LayoutDashboard, Table2, Search, UserCheck, Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, Bell, Target, Activity } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useCompanyFilter } from '../lib/CompanyFilterContext'
import * as XLSX from 'xlsx'

const MONTH_ORDER = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// Department → Cost Type mapping
const DEPT_COST_TYPE = {
  'ฝ่ายกลยุทธ์และพัฒนาธุรกิจ': 'service',
  'ฝ่ายข่าวและดิจิทัล คอนเทนต์': 'service',
  'ฝ่ายนวัตกรรมและเทคโนโลยีสารสนเทศ': 'service',
  'ฝ่ายนวัตกรรมและเทคโนโลยีสารสนเทศ-Green': 'service',
  'ฝ่ายปฏิบัติการไอทีและความมั่นคงปลอดภัยทางไซเบอร์': 'service',
  'ฝ่ายพัฒนาความสัมพันธ์และการมีส่วนร่วมของชุมชน': 'service',
  'ฝ่ายพัฒนาซอฟต์แวร์': 'service',
  'ฝ่ายพัฒนาซอฟต์แวร์ระบบซื้อขายหลักทรัพย์': 'service',
  'ฝ่ายวิจัยและพัฒนา': 'service',
  'ฝ่ายสนับสนุนระบบ': 'service',
  'ฝ่ายออกแบบสร้างสรรค์และผลิตสื่อมัลติมีเดีย': 'service',
  'ฝ่ายการตลาดและการสื่อสาร': 'sales',
  'ฝ่ายขาย': 'sales',
  'ฝ่ายนักลงทุนสัมพันธ์และการสื่อสารองค์กร': 'sales',
  'ฝ่ายจัดซื้อ': 'admin',
  'ฝ่ายบริหารองค์กรและทรัพยากรบุคคล': 'admin',
  'ฝ่ายบัญชีและการเงิน': 'admin',
  'ฝ่ายบัญชีและทรัพยากรบุคคล': 'admin',
}
const COST_TYPE_LABELS = { service: 'ต้นทุนบริการ', sales: 'ต้นทุนขาย', admin: 'ต้นทุนบริหาร' }
const COST_TYPE_COLORS = { service: '#78c045', sales: '#1692dc', admin: '#f59e0b' }
const COST_TYPE_BG = { service: 'bg-[#f0f9e8] text-[#5a9030]', sales: 'bg-blue-100 text-blue-600', admin: 'bg-amber-100 text-amber-600' }
const BU_COLORS = {'BU efin.finance':'#78c045','BU Content':'#1692dc','BU IR Plus':'#00afab','BU IT Solution':'#f59e0b','Cost Center':'#8b5cf6','Event&Community':'#ec4899','ATESS':'#ff5252'}
const COLORS_ARR = ['#78c045','#1692dc','#00afab','#f59e0b','#ff5252','#8b5cf6','#ec4899','#f97316']

const fmt = n => n?.toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:0}) ?? '0'
const fmtM = n => { if(!n||n===0) return '0'; if(Math.abs(n)>=1e6) return (n/1e6).toFixed(2)+'M'; if(Math.abs(n)>=1e3) return (n/1e3).toFixed(0)+'K'; return fmt(n) }
const fmtPct = n => n>0 ? n.toFixed(1)+'%' : '-'
// Mask per-employee cost figures (same scheme as Payroll.jsx's maskSalary) — hides all digit
// groups except the last 3 digits, e.g. 1,213,650 → x,xxx,650. Used only for individual
// (per-employee) totals, not company/department/BU aggregates.
const maskCost = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '-'
  const parts = Math.round(num).toLocaleString('th-TH').split(',')
  return parts.map((p, i) => (i === parts.length - 1 ? p : 'x'.repeat(p.length))).join(',')
}
const mi = m => MONTH_ORDER.indexOf(m)

function Tab({tabs,active,onChange}){
  return <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
    {tabs.map(t=><button key={t.key} onClick={()=>onChange(t.key)}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${active===t.key?'bg-white shadow-sm text-[#5A9020] font-semibold':'text-gray-600 hover:text-gray-800'}`}>
      {t.icon}{t.label}
    </button>)}
  </div>
}

function KPI({icon,label,value,sub,color='indigo',onClick}){
  const c={'indigo':'bg-[#D0F0C0] text-[#7DC242]','cyan':'bg-cyan-100 text-cyan-600','green':'bg-green-100 text-green-600','red':'bg-red-100 text-red-600','purple':'bg-purple-100 text-purple-600','amber':'bg-amber-100 text-amber-600','slate':'bg-slate-100 text-slate-600','pink':'bg-pink-100 text-pink-600'}
  return <div className={`bg-white rounded-xl border border-gray-200 p-4 ${onClick?'cursor-pointer hover:shadow-md hover:border-[#C5E888] transition-all':''}`} onClick={onClick}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${c[color]} flex items-center justify-center`}>{icon}</div>
      <div className="min-w-0"><p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        {sub&&<p className="text-xs text-gray-400 truncate">{sub}</p>}</div>
    </div></div>
}

function CostDetailPopup({ title, icon: Icon, iconBg, data, columns, onClose, summary }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortAsc, setSortAsc] = useState(true)
  const filtered = useMemo(() => {
    if (!data) return []
    let list = data
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(row => columns.some(c => { const v = c.render ? c.render(row) : row[c.key]; return v && String(v).toLowerCase().includes(q) }))
    }
    if (sortCol !== null) {
      const col = columns[sortCol]
      list = [...list].sort((a, b) => {
        const av = col.sortKey ? col.sortKey(a) : (col.render ? col.render(a) : a[col.key]) || ''
        const bv = col.sortKey ? col.sortKey(b) : (col.render ? col.render(b) : b[col.key]) || ''
        if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
        return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      })
    }
    return list
  }, [data, search, sortCol, sortAsc, columns])
  const toggleSort = (idx) => { if (sortCol === idx) setSortAsc(!sortAsc); else { setSortCol(idx); setSortAsc(true) } }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 pb-8 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}><Icon className="w-5 h-5 text-white" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500">{filtered.length} รายการ</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-48" />
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>
        {summary && <div className="px-6 py-3 bg-[#E6F9F0] border-b border-[#D0F0C0] text-sm text-[#5A9020]">{summary}</div>}
        <div className="overflow-auto flex-1 px-2">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-10">#</th>
                {columns.map((col, i) => (
                  <th key={i} className={`${col.align==='right'?'text-right':'text-left'} px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap`}
                    onClick={() => toggleSort(i)}>{col.label} {sortCol === i ? (sortAsc ? '▲' : '▼') : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((row, ri) => (
                <tr key={ri} className="hover:bg-[#f0fce8]/40">
                  <td className="px-4 py-2 text-xs text-gray-400">{ri + 1}</td>
                  {columns.map((col, ci) => (
                    <td key={ci} className={`px-4 py-2 ${col.align==='right'?'text-right font-mono':''}`}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Paginated fetch helper
async function fetchAll(table, select='*', orderCol) {
  const PAGE=1000; let all=[],from=0,more=true
  while(more){
    let q=supabase.from(table).select(select).range(from,from+PAGE-1)
    if(orderCol) q=q.order(orderCol)
    const {data,error}=await q
    if(error||!data||data.length===0){more=false;break}
    all=all.concat(data); from+=PAGE
    if(data.length<PAGE) more=false
  }
  return all
}

export default function CostAnalysis(){
  const {isSuperUser}=useAuth()
  const {selectedCompany,filterByCompany,filterVersion}=useCompanyFilter()
  const [loading,setLoading]=useState(true)
  const [productMap,setProductMap]=useState([])
  const [costEmpRaw,setCostEmpRaw]=useState([])
  const [costAllocRaw,setCostAllocRaw]=useState([])
  const [hoursAllocRaw,setHoursAllocRaw]=useState([])
  const [tab,setTab]=useState('overview')
  const [filterMonth,setFilterMonth]=useState('all')
  const [filterBU,setFilterBU]=useState('all')
  const [expandedBU,setExpandedBU]=useState({})
  const [expandedCostBU,setExpandedCostBU]=useState({})
  const [filterCostType,setFilterCostType]=useState('all')
  const [search,setSearch]=useState('')
  const [hrEmployeesRaw,setHrEmployeesRaw]=useState([])
  const [departments,setDepartments]=useState([])
  const [showImport,setShowImport]=useState(false)
  const [importFile,setImportFile]=useState(null)
  const [importPreview,setImportPreview]=useState(null)
  const [importing,setImporting]=useState(false)
  const [importResult,setImportResult]=useState(null)
  const [importError,setImportError]=useState(null)
  const [importType,setImportType]=useState('cost_employee')
  const fileRef=useRef(null)
  const hoursFileRef=useRef(null)
  const [costDetailPopup,setCostDetailPopup]=useState(null)
  const [totalCompanyCost,setTotalCompanyCost]=useState(0)
  const [showCostInput,setShowCostInput]=useState(false)
  const [costInputVal,setCostInputVal]=useState('')
  // Hours Update Modal state
  const [showHoursUpdate,setShowHoursUpdate]=useState(false)
  const [hoursMonth,setHoursMonth]=useState(null)
  const [hoursFile,setHoursFile]=useState(null)
  const [hoursPreview,setHoursPreview]=useState(null)
  const [hoursImporting,setHoursImporting]=useState(false)
  const [hoursResult,setHoursResult]=useState(null)
  const [hoursError,setHoursError]=useState(null)
  // CC Allocation 2026
  const [ccAllocRaw,setCcAllocRaw]=useState([])
  const [ccAllocLoading,setCcAllocLoading]=useState(false)
  const [ccFilterMonth,setCcFilterMonth]=useState('all')
  const [ccFilterBU,setCcFilterBU]=useState('all')

  const loadData=async()=>{
    setLoading(true)
    const [pm,ce,ca,ha,hr,depts]=await Promise.all([
      fetchAll('hr_product_map','*'),
      fetchAll('hr_cost_employee','*','id'),
      fetchAll('hr_cost_allocation','id,period_month,employee_id,product_code,amount','id'),
      fetchAll('hr_hours_allocation','id,period_month,employee_id,product_code,hours','id'),
      fetchAll('hr_employees','id,employee_code,prefix_th,first_name_th,last_name_th,company_entity,bu,position_th,department_id,hire_date,employment_type,status','id'),
      fetchAll('hr_departments','id,name_th,code'),
    ])
    setProductMap(pm); setCostEmpRaw(ce); setCostAllocRaw(ca); setHoursAllocRaw(ha); setHrEmployeesRaw(hr); setDepartments(depts)
    setLoading(false)
  }

  useEffect(()=>{ loadData() },[])

  // Load CC Allocation data when tab is selected
  useEffect(()=>{
    if(tab!=='ccalloc') return
    if(ccAllocRaw.length>0) return
    setCcAllocLoading(true)
    fetchAll('hr_cc_allocation_2026','*').then(data=>{
      setCcAllocRaw(data||[])
      setCcAllocLoading(false)
    })
  },[tab])

  // Department lookup: UUID → name
  const deptLookup = useMemo(()=>{
    const m={}; departments.forEach(d=>{m[d.id]=d.name_th}); return m
  },[departments])

  // Build BU lookup from product map
  const buLookup = useMemo(()=>{
    const m={}; productMap.forEach(p=>{m[p.code]={name:p.name,bu:p.bu_name}}); return m
  },[productMap])

  // ========== Company-filtered base data ==========
  // Filter employees by company (using CompanyFilterContext, excludes EFIN)
  const hrEmployees = useMemo(()=>{
    return filterByCompany(hrEmployeesRaw, 'company_entity')
  },[hrEmployeesRaw, filterVersion])

  // Build lookup sets from filtered employees
  const validUUIDs = useMemo(()=>new Set(hrEmployees.map(e=>e.id)),[hrEmployees])
  const validCodes = useMemo(()=>new Set(hrEmployees.map(e=>e.employee_code)),[hrEmployees])

  // Filter cost data to only include employees that pass the company filter
  const costEmp = useMemo(()=>costEmpRaw.filter(r=>r.hr_employee_id && validUUIDs.has(r.hr_employee_id)),[costEmpRaw,validUUIDs])
  const costAlloc = useMemo(()=>costAllocRaw.filter(r=>validCodes.has(r.employee_id)),[costAllocRaw,validCodes])
  const hoursAlloc = useMemo(()=>hoursAllocRaw.filter(r=>validCodes.has(r.employee_id)),[hoursAllocRaw,validCodes])

  // HR lookup by UUID
  const hrById = useMemo(()=>{
    const map={}
    hrEmployees.forEach(e=>{ map[e.id]=e })
    return map
  },[hrEmployees])

  // Employee BU lookup (for BU filtering on cost_employee)
  const empBUbyUUID = useMemo(()=>{
    const m={}; hrEmployees.forEach(e=>{m[e.id]=e.bu||''}); return m
  },[hrEmployees])
  const empBUbyCode = useMemo(()=>{
    const m={}; hrEmployees.forEach(e=>{m[e.employee_code]=e.bu||''}); return m
  },[hrEmployees])

  // Available BUs from actual employee data (not product map)
  const buList = useMemo(()=>[...new Set(hrEmployees.map(e=>e.bu).filter(Boolean))].sort(),[hrEmployees])

  const availableMonths = useMemo(()=>{
    const s=new Set(costEmp.map(r=>r.period_month))
    return MONTH_ORDER.filter(m=>s.has(m))
  },[costEmp])

  // ========== Filtered data (month + BU) ==========
  const fCostEmp = useMemo(()=>{
    let d=costEmp
    if(filterMonth!=='all') d=d.filter(r=>r.period_month===filterMonth)
    if(filterBU!=='all') d=d.filter(r=>empBUbyUUID[r.hr_employee_id]===filterBU)
    return d
  },[costEmp,filterMonth,filterBU,empBUbyUUID])

  const fCostAlloc = useMemo(()=>{
    let d=costAlloc
    if(filterMonth!=='all') d=d.filter(r=>r.period_month===filterMonth)
    if(filterBU!=='all') d=d.filter(r=>empBUbyCode[r.employee_id]===filterBU)
    return d
  },[costAlloc,filterMonth,filterBU,empBUbyCode])

  const fHoursAlloc = useMemo(()=>{
    let d=hoursAlloc
    if(filterMonth!=='all') d=d.filter(r=>r.period_month===filterMonth)
    if(filterBU!=='all') d=d.filter(r=>empBUbyCode[r.employee_id]===filterBU)
    return d
  },[hoursAlloc,filterMonth,filterBU,empBUbyCode])

  // KPI calculations
  const totalCost = useMemo(()=>fCostEmp.reduce((s,r)=>s+(Number(r.total_cost)||0),0),[fCostEmp])
  const totalHours = useMemo(()=>fCostEmp.reduce((s,r)=>s+(Number(r.work_hours)||0),0),[fCostEmp])
  const uniqueEmp = useMemo(()=>new Set(fCostEmp.map(r=>r.employee_id)).size,[fCostEmp])
  const avgCostPerHour = totalHours>0 ? totalCost/totalHours : 0
  const avgCostPerHead = uniqueEmp>0 ? totalCost/uniqueEmp : 0

  // ========== BU Cost per Head ==========
  const buCostPerHead = useMemo(()=>{
    const buHC={}, buCostMap={}
    fCostEmp.forEach(r=>{
      const uid=r.hr_employee_id; if(!uid) return
      const bu=empBUbyUUID[uid]||'ไม่ระบุ'
      if(!buHC[bu]){buHC[bu]=new Set();buCostMap[bu]=0}
      buHC[bu].add(uid)
      buCostMap[bu]+=Number(r.total_cost)||0
    })
    const avg=uniqueEmp>0?totalCost/uniqueEmp:0
    const byBU={}
    Object.keys(buCostMap).forEach(bu=>{
      const hc=buHC[bu].size; const cph=hc>0?buCostMap[bu]/hc:0
      byBU[bu]={cost:buCostMap[bu],headcount:hc,costPerHead:cph,isHigh:avg>0&&cph>avg*1.2}
    })
    return {byBU, avg}
  },[fCostEmp,empBUbyUUID,uniqueEmp,totalCost])

  // ========== Central Cost Ratio ==========
  const centralData = useMemo(()=>{
    const centralBUNames=['Cost Center']
    const byCostCenter={}
    fCostAlloc.forEach(r=>{
      const buName=buLookup[r.product_code]?.bu||''
      if(!centralBUNames.includes(buName)) return
      const name=buLookup[r.product_code]?.name||r.product_code
      if(!byCostCenter[r.product_code]) byCostCenter[r.product_code]={code:r.product_code,name,cost:0}
      byCostCenter[r.product_code].cost+=Number(r.amount)||0
    })
    // Also check hr_cost_employee for employees in admin dept assigned to Cost Center BU
    const totalCentral=Object.values(byCostCenter).reduce((s,v)=>s+v.cost,0)
    const items=Object.values(byCostCenter).map(v=>({
      ...v,
      ratio:totalCentral>0?(v.cost/totalCentral*100):0,
      isHigh:totalCentral>0&&(v.cost/totalCentral*100)>30
    })).sort((a,b)=>b.cost-a.cost)
    return {items,total:totalCentral}
  },[fCostAlloc,buLookup])

  // ========== Employee Cost % of Total Company Cost ==========
  const empCostPct = totalCompanyCost>0 ? (totalCost/totalCompanyCost*100) : null

  // Monthly totals for bar chart (respects BU filter, but shows all months)
  const monthlyData = useMemo(()=>{
    let d=costEmp
    if(filterBU!=='all') d=d.filter(r=>empBUbyUUID[r.hr_employee_id]===filterBU)
    const m={}
    d.forEach(r=>{
      if(!m[r.period_month]) m[r.period_month]={cost:0,hours:0,people:new Set()}
      m[r.period_month].cost+=Number(r.total_cost)||0
      m[r.period_month].hours+=Number(r.work_hours)||0
      m[r.period_month].people.add(r.employee_id)
    })
    return MONTH_ORDER.filter(mn=>m[mn]).map(mn=>({month:mn,short:MONTH_SHORT[MONTH_ORDER.indexOf(mn)],...m[mn],count:m[mn].people.size}))
  },[costEmp,filterBU,empBUbyUUID])

  // ========== MoM Trend Alert ==========
  const trendAlert = useMemo(()=>{
    if(monthlyData.length<3) return null
    const last3=monthlyData.slice(-3)
    const rising=last3[1].cost>last3[0].cost&&last3[2].cost>last3[1].cost
    if(!rising) return null
    const growth=last3[0].cost>0?(last3[2].cost-last3[0].cost)/last3[0].cost*100:0
    return {growth:growth.toFixed(1),months:last3.map(d=>d.short||d.month)}
  },[monthlyData])

  // ========== Alert Conditions ==========
  const alertList = useMemo(()=>{
    const list=[]
    if(empCostPct!==null&&empCostPct>45)
      list.push({id:'A2',sev:'critical',label:'ต้นทุนพนักงานสูงผิดปกติ',msg:`${empCostPct.toFixed(1)}% ของต้นทุนบริษัท (เกณฑ์: > 45%)`})
    else if(empCostPct!==null&&empCostPct>40)
      list.push({id:'A1',sev:'warning',label:'ต้นทุนพนักงานสูง',msg:`${empCostPct.toFixed(1)}% ของต้นทุนบริษัท (เกณฑ์: > 40%)`})
    Object.entries(buCostPerHead.byBU).filter(([,d])=>d.isHigh).forEach(([bu,d])=>{
      list.push({id:'A3',sev:'warning',label:`${bu}: ต้นทุนต่อหัวสูง`,msg:`฿${fmt(Math.round(d.costPerHead))}/คน สูงกว่าเฉลี่ย ฿${fmt(Math.round(buCostPerHead.avg))} มากกว่า 20%`})
    })
    centralData.items.filter(d=>d.isHigh).forEach(d=>{
      list.push({id:'A4',sev:'warning',label:'ส่วนกลางบวม',msg:`${d.name}: ${d.ratio.toFixed(1)}% ของต้นทุนส่วนกลาง (เกณฑ์: > 30%)`})
    })
    if(trendAlert)
      list.push({id:'A6',sev:'critical',label:'ต้นทุนโตเร็ว',msg:`เพิ่ม 3 เดือนต่อเนื่อง (${trendAlert.months.join(' → ')}) รวม +${trendAlert.growth}%`})
    return list
  },[empCostPct,buCostPerHead,centralData,trendAlert])

  // BU summary
  const buSummary = useMemo(()=>{
    const m={}
    fCostAlloc.forEach(r=>{
      const bu=buLookup[r.product_code]?.bu||'อื่นๆ'
      if(!m[bu]) m[bu]={cost:0,products:{}}
      m[bu].cost+=Number(r.amount)||0
      const pn=buLookup[r.product_code]?.name||r.product_code
      if(!m[bu].products[r.product_code]) m[bu].products[r.product_code]={name:pn,cost:0,hours:0}
      m[bu].products[r.product_code].cost+=Number(r.amount)||0
    })
    fHoursAlloc.forEach(r=>{
      const bu=buLookup[r.product_code]?.bu||'อื่นๆ'
      if(!m[bu]) m[bu]={cost:0,products:{}}
      const pn=buLookup[r.product_code]?.name||r.product_code
      if(!m[bu].products[r.product_code]) m[bu].products[r.product_code]={name:pn,cost:0,hours:0}
      m[bu].products[r.product_code].hours+=Number(r.hours)||0
    })
    return Object.entries(m).sort((a,b)=>b[1].cost-a[1].cost)
  },[fCostAlloc,fHoursAlloc,buLookup])

  const allocTotal = buSummary.reduce((s,[,d])=>s+d.cost,0)

  // Top products
  const topProducts = useMemo(()=>{
    const m={}
    fCostAlloc.forEach(r=>{
      const k=r.product_code
      if(!m[k]) m[k]={code:k,name:buLookup[k]?.name||k,bu:buLookup[k]?.bu||'',cost:0,hours:0,people:new Set()}
      m[k].cost+=Number(r.amount)||0
      m[k].people.add(r.employee_id)
    })
    fHoursAlloc.forEach(r=>{
      const k=r.product_code
      if(!m[k]) m[k]={code:k,name:buLookup[k]?.name||k,bu:buLookup[k]?.bu||'',cost:0,hours:0,people:new Set()}
      m[k].hours+=Number(r.hours)||0
    })
    // Add all products from product_map even if no data
    productMap.forEach(pm=>{
      if(!m[pm.code]) m[pm.code]={code:pm.code,name:pm.name||pm.code,bu:pm.bu_name||'',cost:0,hours:0,people:new Set()}
    })
    return Object.values(m).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
  },[fCostAlloc,fHoursAlloc,buLookup,productMap])

  // Employee tab — aggregate cost per hr_employee_id (UUID) — uses FILTERED data
  const costByUUID = useMemo(()=>{
    const map={}
    fCostEmp.forEach(r=>{
      const uid=r.hr_employee_id; if(!uid) return
      if(!map[uid]) map[uid]={totalCost:0,totalHours:0,salary:0,transport:0,welfare:0,providentFund:0,socialSecurity:0,costPerHour:0,months:0}
      const m=map[uid]
      m.totalCost+=Number(r.total_cost)||0
      m.totalHours+=Number(r.work_hours)||0
      m.salary+=Number(r.salary)||0
      m.transport+=Number(r.transport)||0
      m.welfare+=Number(r.welfare)||0
      m.providentFund+=Number(r.provident_fund)||0
      m.socialSecurity+=Number(r.social_security)||0
      m.months++
    })
    Object.values(map).forEach(m=>{ m.costPerHour=m.totalHours>0?m.totalCost/m.totalHours:0 })
    return map
  },[fCostEmp])

  const empDetail = useMemo(()=>{
    let d=hrEmployees.filter(e=>costByUUID[e.id])
    if(search){
      const s=search.toLowerCase()
      d=d.filter(e=>{
        const fullName=`${e.prefix_th||''}${e.first_name_th||''} ${e.last_name_th||''}`.toLowerCase()
        const deptName=(deptLookup[e.department_id]||'').toLowerCase()
        return e.employee_code?.toLowerCase().includes(s)||fullName.includes(s)
          ||e.company_entity?.toLowerCase().includes(s)||e.bu?.toLowerCase().includes(s)
          ||e.position_th?.toLowerCase().includes(s)||deptName.includes(s)
          ||e.employment_type?.toLowerCase().includes(s)||e.status?.toLowerCase().includes(s)
      })
    }
    return d.sort((a,b)=>(costByUUID[b.id]?.totalCost||0)-(costByUUID[a.id]?.totalCost||0))
  },[hrEmployees,search,costByUUID,deptLookup])

  // ========== Cost Type Tab Data ==========
  // Map each employee UUID → cost type based on department
  const empCostType = useMemo(()=>{
    const m={}
    hrEmployees.forEach(e=>{
      const deptName=deptLookup[e.department_id]||''
      m[e.id]=DEPT_COST_TYPE[deptName]||'admin'
    })
    return m
  },[hrEmployees,deptLookup])

  // Aggregate cost data by cost type → company
  const costTypeData = useMemo(()=>{
    const types={service:{headcount:new Set(),salary:0,ot:0,socialSecurity:0,providentFund:0,welfare:0,totalHours:0,totalCost:0,byCompany:{},byDept:{}},
                 sales:{headcount:new Set(),salary:0,ot:0,socialSecurity:0,providentFund:0,welfare:0,totalHours:0,totalCost:0,byCompany:{},byDept:{}},
                 admin:{headcount:new Set(),salary:0,ot:0,socialSecurity:0,providentFund:0,welfare:0,totalHours:0,totalCost:0,byCompany:{},byDept:{}}}
    fCostEmp.forEach(r=>{
      const uid=r.hr_employee_id; if(!uid) return
      const ct=empCostType[uid]||'admin'
      const emp=hrById[uid]
      const company=emp?.company_entity||'ไม่ระบุ'
      const dept=deptLookup[emp?.department_id]||'ไม่ระบุ'
      const t=types[ct]
      t.headcount.add(uid)
      t.salary+=Number(r.salary)||0
      t.ot+=Number(r.transport)||0
      t.socialSecurity+=Number(r.social_security)||0
      t.providentFund+=Number(r.provident_fund)||0
      t.welfare+=Number(r.welfare)||0
      t.totalHours+=Number(r.work_hours)||0
      t.totalCost+=Number(r.total_cost)||0
      // by company
      if(!t.byCompany[company]) t.byCompany[company]={headcount:new Set(),salary:0,ot:0,socialSecurity:0,providentFund:0,welfare:0,totalHours:0,totalCost:0}
      const c=t.byCompany[company]; c.headcount.add(uid)
      c.salary+=Number(r.salary)||0; c.ot+=Number(r.transport)||0
      c.socialSecurity+=Number(r.social_security)||0; c.providentFund+=Number(r.provident_fund)||0
      c.welfare+=Number(r.welfare)||0; c.totalHours+=Number(r.work_hours)||0; c.totalCost+=Number(r.total_cost)||0
      // by dept
      if(!t.byDept[dept]) t.byDept[dept]={headcount:new Set(),salary:0,ot:0,socialSecurity:0,providentFund:0,welfare:0,totalHours:0,totalCost:0,company}
      const d=t.byDept[dept]; d.headcount.add(uid)
      d.salary+=Number(r.salary)||0; d.ot+=Number(r.transport)||0
      d.socialSecurity+=Number(r.social_security)||0; d.providentFund+=Number(r.provident_fund)||0
      d.welfare+=Number(r.welfare)||0; d.totalHours+=Number(r.work_hours)||0; d.totalCost+=Number(r.total_cost)||0
    })
    return types
  },[fCostEmp,empCostType,hrById,deptLookup])

  const grandTotal = (costTypeData.service.totalCost+costTypeData.sales.totalCost+costTypeData.admin.totalCost)||1

  // ========== Cost × BU Tab Data ==========
  // Build employee_code → UUID lookup
  const codeToUUID = useMemo(()=>{
    const m={}; hrEmployees.forEach(e=>{m[e.employee_code]=e.id}); return m
  },[hrEmployees])

  // Build per-employee total hours for proportion calculation
  const empTotalHours = useMemo(()=>{
    const m={}
    fHoursAlloc.forEach(r=>{
      m[r.employee_id]=(m[r.employee_id]||0)+(Number(r.hours)||0)
    })
    return m
  },[fHoursAlloc])

  // Allocate cost to BU/Product by hour proportion
  const costBUData = useMemo(()=>{
    // Step 1: Build per-employee, per-product hour allocation
    const empProductHours={} // { employee_code: { product_code: hours } }
    fHoursAlloc.forEach(r=>{
      if(!empProductHours[r.employee_id]) empProductHours[r.employee_id]={}
      empProductHours[r.employee_id][r.product_code]=(empProductHours[r.employee_id][r.product_code]||0)+(Number(r.hours)||0)
    })

    // Step 2: For each employee's cost, distribute to products by hour proportion
    const buAgg={} // { bu_name: { totalCost, service, sales, admin, hours, people:Set, products:{ code: {...} } } }
    const mkBU=()=>({totalCost:0,service:0,sales:0,admin:0,hours:0,people:new Set(),products:{}})
    const mkProd=()=>({totalCost:0,service:0,sales:0,admin:0,hours:0,people:new Set()})

    fCostEmp.forEach(r=>{
      const uid=r.hr_employee_id; if(!uid) return
      const emp=hrById[uid]; if(!emp) return
      const empCode=emp.employee_code
      const ct=empCostType[uid]||'admin'
      const empCost=Number(r.total_cost)||0
      const prodHours=empProductHours[empCode]
      if(!prodHours) return // skip employees without hour allocation

      const totalH=Object.values(prodHours).reduce((s,h)=>s+h,0)
      if(totalH<=0) return

      Object.entries(prodHours).forEach(([pcode,h])=>{
        const ratio=h/totalH
        const allocCost=empCost*ratio
        const buInfo=buLookup[pcode]
        const buName=buInfo?.bu||'ไม่ระบุ BU'
        if(!buAgg[buName]) buAgg[buName]=mkBU()
        const bu=buAgg[buName]
        bu.totalCost+=allocCost
        bu[ct]+=allocCost
        bu.hours+=h
        bu.people.add(uid)
        if(!bu.products[pcode]) bu.products[pcode]=mkProd()
        const p=bu.products[pcode]
        p.totalCost+=allocCost
        p[ct]+=allocCost
        p.hours+=h
        p.people.add(uid)
      })
    })

    // Step 3: Ensure ALL products from product_map appear in their BU (even with 0 data)
    productMap.forEach(pm=>{
      const buName=pm.bu_name
      if(!buAgg[buName]) buAgg[buName]=mkBU()
      if(!buAgg[buName].products[pm.code]) buAgg[buName].products[pm.code]=mkProd()
    })

    // Sort BUs by totalCost descending
    const sorted=Object.entries(buAgg).sort((a,b)=>b[1].totalCost-a[1].totalCost)
    const grandCostBU=sorted.reduce((s,[,v])=>s+v.totalCost,0)||1
    return {buList:sorted, grandTotal:grandCostBU}
  },[fCostEmp,fHoursAlloc,hrById,empCostType,buLookup,codeToUUID,productMap])

  // Import handlers
  const IMPORT_TYPES={
    cost_employee:{label:'ต้นทุนพนักงาน',table:'hr_cost_employee',
      cols:['period_month','dept_code','employee_id','department','salary','transport','welfare','provident_fund','social_security','total_cost','work_hours','cost_per_hour','overtime','perdiem']},
    cost_allocation:{label:'การจัดสรรต้นทุน',table:'hr_cost_allocation',
      cols:['period_month','employee_id','product_code','amount']},
    hours_allocation:{label:'การจัดสรรชั่วโมง',table:'hr_hours_allocation',
      cols:['period_month','employee_id','product_code','hours']},
  }

  const handleFileSelect=async(e)=>{
    const f=e.target.files?.[0]; if(!f) return
    setImportFile(f); setImportError(null); setImportResult(null)
    try{
      const data=new Uint8Array(await f.arrayBuffer())
      const wb=XLSX.read(data,{type:'array'})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const json=XLSX.utils.sheet_to_json(ws,{defval:''})
      setImportPreview(json)
    }catch(err){ setImportError('อ่านไฟล์ไม่ได้: '+err.message); setImportPreview(null) }
  }

  const handleImport=async()=>{
    if(!importPreview?.length) return
    setImporting(true); setImportError(null); setImportResult(null)
    try{
      const cfg=IMPORT_TYPES[importType]
      const rows=importPreview.map(row=>{
        const r={}
        cfg.cols.forEach(c=>{
          const val=row[c]??row[c.replace(/_/g,' ')]??''
          if(['salary','transport','welfare','provident_fund','social_security','total_cost','work_hours','cost_per_hour','overtime','perdiem','amount','hours'].includes(c)){
            r[c]=Number(val)||0
          } else { r[c]=String(val) }
        })
        return r
      })
      const BATCH=500
      let inserted=0
      for(let i=0;i<rows.length;i+=BATCH){
        const chunk=rows.slice(i,i+BATCH)
        const {error}=await supabase.from(cfg.table).insert(chunk)
        if(error) throw error
        inserted+=chunk.length
      }
      setImportResult(`นำเข้า ${inserted} รายการ สำเร็จ`)
      setShowImport(false); setImportFile(null); setImportPreview(null)
      loadData()
    }catch(err){ setImportError('นำเข้าล้มเหลว: '+err.message)
    }finally{ setImporting(false) }
  }

  const handleExport=(type)=>{
    let data,filename,cols
    if(type==='cost_employee'){
      data=costEmp; filename='cost_employee'
      cols=[{h:'period_month',k:'period_month'},{h:'dept_code',k:'dept_code'},{h:'employee_id',k:'employee_id'},{h:'department',k:'department'},{h:'salary',k:'salary'},{h:'transport',k:'transport'},{h:'welfare',k:'welfare'},{h:'provident_fund',k:'provident_fund'},{h:'social_security',k:'social_security'},{h:'total_cost',k:'total_cost'},{h:'work_hours',k:'work_hours'},{h:'cost_per_hour',k:'cost_per_hour'},{h:'overtime',k:'overtime'},{h:'perdiem',k:'perdiem'}]
    } else if(type==='cost_allocation'){
      data=costAlloc; filename='cost_allocation'
      cols=[{h:'period_month',k:'period_month'},{h:'employee_id',k:'employee_id'},{h:'product_code',k:'product_code'},{h:'amount',k:'amount'}]
    } else {
      data=hoursAlloc; filename='hours_allocation'
      cols=[{h:'period_month',k:'period_month'},{h:'employee_id',k:'employee_id'},{h:'product_code',k:'product_code'},{h:'hours',k:'hours'}]
    }
    if(!data?.length){ alert('ไม่มีข้อมูล'); return }
    const rows=data.map(r=>{const o={}; cols.forEach(c=>{o[c.h]=r[c.k]??''}); return o})
    const ws=XLSX.utils.json_to_sheet(rows)
    ws['!cols']=cols.map(c=>({wch:Math.max(c.h.length*2,14)}))
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Data')
    XLSX.writeFile(wb,`${filename}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // ===== Hours Update Handlers =====
  const hoursMonthStatus = useMemo(()=>{
    const m={}
    MONTH_ORDER.forEach(mo=>{m[mo]={hours:0,records:0,costRecords:0}})
    hoursAlloc.forEach(r=>{if(m[r.period_month]){m[r.period_month].hours+=Number(r.hours)||0; m[r.period_month].records++}})
    costAlloc.forEach(r=>{if(m[r.period_month]) m[r.period_month].costRecords++})
    return m
  },[hoursAlloc,costAlloc])

  // Build employee code lookup: numeric (no prefix) → full employee_code
  const empCodeMap=useMemo(()=>{
    const m={}
    hrEmployees.forEach(e=>{
      if(!e.employee_code) return
      m[e.employee_code]=e.employee_code // full code maps to itself
      // strip known prefixes to get numeric part
      const num=e.employee_code.replace(/^(OA|APT|EXP|SMT)/i,'')
      if(num && num!==e.employee_code) m[num]=e.employee_code
    })
    return m
  },[hrEmployees])

  const handleHoursFileSelect=async(e)=>{
    const f=e.target.files?.[0]; if(!f) return
    setHoursFile(f); setHoursError(null); setHoursResult(null)
    try{
      const data=new Uint8Array(await f.arrayBuffer())
      const wb=XLSX.read(data,{type:'array'})

      // Auto-select sheet matching the selected month, or fall back to first sheet
      let sheetName=wb.SheetNames[0]
      if(hoursMonth){
        const match=wb.SheetNames.find(s=>s.trim()===hoursMonth)
        if(match) sheetName=match
      }
      const ws=wb.Sheets[sheetName]
      if(!ws){ setHoursError('ไม่พบ sheet ในไฟล์'); setHoursPreview(null); return }

      // Detect format: PIVOT or FLAT
      // PIVOT format: row 2 has product codes like "10.01", "20.01" starting from column F (index 5)
      const range=XLSX.utils.decode_range(ws['!ref']||'A1')
      const isPivot=(()=>{
        // Check cells in row 2 (0-indexed row 1) from column F onward
        let prodCodeCount=0
        for(let c=5;c<=Math.min(range.e.c,70);c++){
          const cell=ws[XLSX.utils.encode_cell({r:1,c})]
          if(cell){
            const v=String(cell.v||'').trim()
            if(/^\d{2}\.\d{2}$/.test(v)) prodCodeCount++
          }
        }
        return prodCodeCount>=5 // at least 5 product codes found → pivot format
      })()

      if(isPivot){
        // Parse PIVOT format
        // Row 0 (row 1): BU headers
        // Row 1 (row 2): product codes
        // Row 2 (row 3): product names
        // Row 3+ (row 4+): employee data — col B=รหัสพนักงาน, col F+=hours

        // Extract product codes from row 2
        const productCodes=[]
        for(let c=5;c<=range.e.c;c++){
          const cell=ws[XLSX.utils.encode_cell({r:1,c})]
          const code=cell?String(cell.v||'').trim():''
          productCodes.push({col:c,code})
        }
        const validProducts=productCodes.filter(p=>/^\d{2}\.\d{2}$/.test(p.code))

        // Parse employee rows starting from row 4 (0-indexed row 3)
        const flatRows=[]
        for(let r=3;r<=range.e.r;r++){
          const empCell=ws[XLSX.utils.encode_cell({r,c:1})] // column B = รหัสพนักงาน
          if(!empCell) continue
          const empNumeric=String(empCell.v||'').trim()
          if(!empNumeric||!/^\d+$/.test(empNumeric)) continue

          // Resolve to full employee code
          const fullCode=empCodeMap[empNumeric]||empNumeric

          for(const {col,code} of validProducts){
            const hCell=ws[XLSX.utils.encode_cell({r,c:col})]
            const hours=hCell?Number(hCell.v)||0:0
            if(hours>0){
              flatRows.push({employee_id:fullCode,product_code:code,hours})
            }
          }
        }

        if(!flatRows.length){
          setHoursError(`อ่านไฟล์ pivot ได้แต่ไม่พบข้อมูลชั่วโมง > 0\n(Sheet: ${sheetName}, พบ ${validProducts.length} product codes)`)
          setHoursPreview(null); return
        }
        setHoursPreview(flatRows)
        setHoursError(null)
      } else {
        // FLAT format: columns employee_id, product_code, hours
        const json=XLSX.utils.sheet_to_json(ws,{defval:''})
        if(json.length>0){
          const cols=Object.keys(json[0])
          const hasEmpId=cols.some(c=>/employee.?id/i.test(c)||c==='employee_id'||/รหัส/i.test(c))
          const hasProd=cols.some(c=>/product.?code/i.test(c)||c==='product_code')
          const hasHours=cols.some(c=>/hours/i.test(c)||c==='hours'||/ชั่วโมง/i.test(c))
          if(!hasEmpId||!hasProd||!hasHours){
            setHoursError(`ไฟล์ต้องมีคอลัมน์: employee_id, product_code, hours\nหรือใช้รูปแบบ Pivot (product codes เป็นหัวคอลัมน์)\nพบคอลัมน์: ${cols.join(', ')}`)
            setHoursPreview(null); return
          }
          // Normalize employee codes in flat format too
          const flatRows=json.map(row=>{
            const keys=Object.keys(row)
            const empKey=keys.find(k=>/employee.?id/i.test(k)||/รหัส/i.test(k))||keys[0]
            const prodKey=keys.find(k=>/product.?code/i.test(k))||keys[1]
            const hKey=keys.find(k=>/hours/i.test(k)||/ชั่วโมง/i.test(k))||keys[2]
            const rawEmp=String(row[empKey]||'').trim()
            const fullCode=empCodeMap[rawEmp]||rawEmp
            return {employee_id:fullCode,product_code:String(row[prodKey]||'').trim(),hours:Number(row[hKey])||0}
          }).filter(r=>r.employee_id&&r.product_code&&r.hours>0)
          setHoursPreview(flatRows)
        } else { setHoursPreview([]) }
      }
    }catch(err){ setHoursError('อ่านไฟล์ไม่ได้: '+err.message); setHoursPreview(null) }
  }

  const handleHoursImport=async()=>{
    if(!hoursPreview?.length||!hoursMonth) return
    setHoursImporting(true); setHoursError(null); setHoursResult(null)
    try{
      // hoursPreview is already flat: [{employee_id, product_code, hours}] with full employee codes
      const rows=hoursPreview.map(r=>({...r,period_month:hoursMonth}))

      if(!rows.length){ setHoursError('ไม่พบข้อมูลที่ถูกต้อง (employee_id, product_code, hours > 0)'); return }

      // 1) Delete old hours for this month
      const {error:delH}=await supabase.from('hr_hours_allocation').delete().eq('period_month',hoursMonth)
      if(delH) throw new Error('ลบข้อมูลชม.เดิมไม่ได้: '+delH.message)

      // 2) Delete old cost_allocation for this month
      const {error:delC}=await supabase.from('hr_cost_allocation').delete().eq('period_month',hoursMonth)
      if(delC) throw new Error('ลบข้อมูลต้นทุนเดิมไม่ได้: '+delC.message)

      // 3) Match hr_employee_id from employee_code
      const empMap={}
      hrEmployees.forEach(e=>{empMap[e.employee_code]=e.id})

      const hoursRows=rows.map(r=>({
        period_month:r.period_month,
        employee_id:r.employee_id,
        product_code:r.product_code,
        hours:r.hours,
        hr_employee_id:empMap[r.employee_id]||null
      }))

      // 4) Insert hours in batches
      const BATCH=500
      let insertedH=0
      for(let i=0;i<hoursRows.length;i+=BATCH){
        const chunk=hoursRows.slice(i,i+BATCH)
        const {error}=await supabase.from('hr_hours_allocation').insert(chunk)
        if(error) throw new Error('Insert hours ล้มเหลว: '+error.message)
        insertedH+=chunk.length
      }

      // 5) Build cost_per_hour lookup — try this month first, fall back to latest available month
      let {data:costEmpMonth}=await supabase.from('hr_cost_employee')
        .select('employee_id,cost_per_hour')
        .eq('period_month',hoursMonth)

      let costSource=hoursMonth
      if(!costEmpMonth?.length){
        // No cost data for this month — copy from the latest month that has data
        const mi_target=MONTH_ORDER.indexOf(hoursMonth)
        let fallbackMonth=null
        for(let i=mi_target-1;i>=0;i--){
          const {data:check,count}=await supabase.from('hr_cost_employee')
            .select('employee_id',{count:'exact',head:true})
            .eq('period_month',MONTH_ORDER[i])
          if(count>0){ fallbackMonth=MONTH_ORDER[i]; break }
        }
        if(!fallbackMonth){
          // Try forward
          for(let i=mi_target+1;i<12;i++){
            const {data:check,count}=await supabase.from('hr_cost_employee')
              .select('employee_id',{count:'exact',head:true})
              .eq('period_month',MONTH_ORDER[i])
            if(count>0){ fallbackMonth=MONTH_ORDER[i]; break }
          }
        }
        if(fallbackMonth){
          const {data:srcData}=await supabase.from('hr_cost_employee')
            .select('*')
            .eq('period_month',fallbackMonth)
          if(srcData?.length){
            // Clone cost_employee records for the new month
            const cloned=srcData.map(({id,created_at,...rest})=>({...rest,period_month:hoursMonth}))
            for(let i=0;i<cloned.length;i+=BATCH){
              const chunk=cloned.slice(i,i+BATCH)
              await supabase.from('hr_cost_employee').insert(chunk)
            }
            costEmpMonth=cloned
            costSource=fallbackMonth+' (คัดลอก)'
          }
        }
      }

      const cphMap={}
      if(costEmpMonth) costEmpMonth.forEach(r=>{cphMap[r.employee_id]=Number(r.cost_per_hour)||0})

      // 6) Generate cost_allocation = hours × cost_per_hour
      const costRows=rows.filter(r=>cphMap[r.employee_id]>0).map(r=>({
        period_month:r.period_month,
        employee_id:r.employee_id,
        product_code:r.product_code,
        amount:Math.round(r.hours*cphMap[r.employee_id]*100)/100,
        hr_employee_id:empMap[r.employee_id]||null
      }))

      let insertedC=0
      for(let i=0;i<costRows.length;i+=BATCH){
        const chunk=costRows.slice(i,i+BATCH)
        const {error}=await supabase.from('hr_cost_allocation').insert(chunk)
        if(error) throw new Error('Insert cost_allocation ล้มเหลว: '+error.message)
        insertedC+=chunk.length
      }

      const noCost=rows.length-costRows.length
      const uniqueEmps=new Set(rows.map(r=>r.employee_id)).size
      setHoursResult(`สำเร็จ — ${uniqueEmps} คน, ${insertedH} รายการชั่วโมง + ${insertedC} รายการต้นทุน${costSource!==hoursMonth?` (cost_per_hour จาก ${costSource})`:''}${noCost>0?` · ${noCost} รายการไม่มี cost_per_hour`:''}`)
      setHoursFile(null); setHoursPreview(null)
      loadData()
    }catch(err){ setHoursError(err.message)
    }finally{ setHoursImporting(false) }
  }

  const handleDownloadHoursTemplate=()=>{
    // Generate PIVOT format template matching user's file:
    // Row 1: BU headers (merged across product columns)
    // Row 2: product codes
    // Row 3: product names
    // Row 4+: employee data (1 row per employee, columns=products sorted by BU)

    // Sort products by BU then code
    const buOrder=['BU efin.finance','BU Content','BU IR Plus','BU IT Solution','Cost Center','ATESS']
    const sortedProducts=[...productMap].sort((a,b)=>{
      const ai=buOrder.indexOf(a.bu_name), bi=buOrder.indexOf(b.bu_name)
      const aIdx=ai>=0?ai:99, bIdx=bi>=0?bi:99
      if(aIdx!==bIdx) return aIdx-bIdx
      return (a.code||'').localeCompare(b.code||'')
    })

    // Build hours lookup from reference month
    const monthsWithData=MONTH_ORDER.filter(mo=>hoursMonthStatus[mo]?.records>0)
    const refMonth=monthsWithData.length>0?monthsWithData[monthsWithData.length-1]:null
    const hoursMap={} // key: `${empCode}|${prodCode}` → hours
    if(refMonth){
      hoursAlloc.filter(r=>r.period_month===refMonth).forEach(r=>{
        hoursMap[`${r.employee_id}|${r.product_code}`]=Number(r.hours)||0
      })
    }

    // Get employee list sorted by code
    const emps=hrEmployees.filter(e=>e.status==='active').sort((a,b)=>(a.employee_code||'').localeCompare(b.employee_code||''))

    // Fixed columns: A=dept_code, B=รหัสพนักงาน, C=ชื่อพนักงาน, D=แผนก, E=Total
    const FIXED_COLS=5 // A-E
    const ws={}
    const totalRows=3+emps.length // 3 header rows + employee rows
    const totalCols=FIXED_COLS+sortedProducts.length

    // Row 1 (r=0): BU headers
    let prevBu=''
    for(let ci=0;ci<sortedProducts.length;ci++){
      const p=sortedProducts[ci]
      if(p.bu_name!==prevBu){
        ws[XLSX.utils.encode_cell({r:0,c:FIXED_COLS+ci})]={v:p.bu_name,t:'s'}
        prevBu=p.bu_name
      }
    }

    // Row 2 (r=1): product codes
    ws[XLSX.utils.encode_cell({r:1,c:0})]={v:'dept_code',t:'s'}
    ws[XLSX.utils.encode_cell({r:1,c:1})]={v:'รหัสพนักงาน',t:'s'}
    ws[XLSX.utils.encode_cell({r:1,c:2})]={v:'ชื่อพนักงาน',t:'s'}
    ws[XLSX.utils.encode_cell({r:1,c:3})]={v:'แผนก',t:'s'}
    ws[XLSX.utils.encode_cell({r:1,c:4})]={v:'Total',t:'s'}
    for(let ci=0;ci<sortedProducts.length;ci++){
      ws[XLSX.utils.encode_cell({r:1,c:FIXED_COLS+ci})]={v:sortedProducts[ci].code,t:'s'}
    }

    // Row 3 (r=2): product names
    for(let ci=0;ci<sortedProducts.length;ci++){
      ws[XLSX.utils.encode_cell({r:2,c:FIXED_COLS+ci})]={v:sortedProducts[ci].name||'',t:'s'}
    }

    // Row 4+ (r=3+): employee data
    emps.forEach((emp,ri)=>{
      const r=3+ri
      const numCode=(emp.employee_code||'').replace(/^(OA|APT|EXP|SMT)/i,'')
      // Lookup department name
      const deptName=emp.department_name||''
      ws[XLSX.utils.encode_cell({r,c:0})]={v:'',t:'s'}
      ws[XLSX.utils.encode_cell({r,c:1})]={v:numCode?Number(numCode):numCode,t:'n'}
      ws[XLSX.utils.encode_cell({r,c:2})]={v:`${emp.first_name_th||''} ${emp.last_name_th||''}`.trim(),t:'s'}
      ws[XLSX.utils.encode_cell({r,c:3})]={v:deptName,t:'s'}
      // Total formula =SUM(F{row}:...)
      const rowNum=r+1 // 1-indexed
      const firstCol=XLSX.utils.encode_col(FIXED_COLS)
      const lastCol=XLSX.utils.encode_col(FIXED_COLS+sortedProducts.length-1)
      ws[XLSX.utils.encode_cell({r,c:4})]={f:`SUM(${firstCol}${rowNum}:${lastCol}${rowNum})`,t:'n'}

      for(let ci=0;ci<sortedProducts.length;ci++){
        const hrs=hoursMap[`${emp.employee_code}|${sortedProducts[ci].code}`]||0
        if(hrs>0) ws[XLSX.utils.encode_cell({r,c:FIXED_COLS+ci})]={v:hrs,t:'n'}
      }
    })

    ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:totalRows-1,c:totalCols-1}})

    // Column widths
    const cols=[{wch:10},{wch:14},{wch:22},{wch:28},{wch:8}]
    for(let i=0;i<sortedProducts.length;i++) cols.push({wch:7})
    ws['!cols']=cols

    // Freeze panes at F4
    ws['!freeze']={xSplit:FIXED_COLS,ySplit:3}

    const targetMonth=hoursMonth||'template'
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,targetMonth)
    XLSX.writeFile(wb,`hours_${targetMonth}.xlsx`)
  }

  if(!isSuperUser) return <div className="p-8 text-center text-gray-500"><DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300"/><p className="text-lg font-medium">ไม่มีสิทธิ์เข้าถึง</p></div>

  // Emp cost % color
  const empCostPctColor = empCostPct===null ? 'bg-gray-50 text-gray-500 border-gray-200'
    : empCostPct>45 ? 'bg-red-50 text-red-700 border-red-200'
    : empCostPct>40 ? 'bg-orange-50 text-orange-700 border-orange-200'
    : empCostPct>35 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
    : 'bg-[#f0fce8] text-[#4E7F1A] border-[#C5E888]'

  const maxBar=Math.max(...monthlyData.map(d=>d.cost),1)

  return <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
    {/* Header */}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900">วิเคราะห์ต้นทุน</h1>
        <p className="text-sm text-gray-500">ต้นทุนพนักงาน / ชม.ทำงาน / แยกตาม BU & Product ({hrEmployees.length} คน · {availableMonths.length} เดือน{selectedCompany!=='all'?` · ${selectedCompany}`:''})</p></div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={()=>{setShowHoursUpdate(true);setHoursMonth(null);setHoursFile(null);setHoursPreview(null);setHoursError(null);setHoursResult(null)}}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition border border-amber-200">
          <Clock size={14}/>อัปเดตชั่วโมงทำงาน
        </button>
        <button onClick={()=>{setShowImport(true);setImportFile(null);setImportPreview(null);setImportError(null);setImportResult(null)}}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#7DC242] bg-[#f0fce8] rounded-lg hover:bg-[#E6F9F0] transition">
          <Upload size={14}/>นำเข้า
        </button>
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition">
            <Download size={14}/>ส่งออก
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            <button onClick={()=>handleExport('cost_employee')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">ต้นทุนพนักงาน</button>
            <button onClick={()=>handleExport('cost_allocation')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">การจัดสรรต้นทุน</button>
            <button onClick={()=>handleExport('hours_allocation')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">การจัดสรรชั่วโมง</button>
          </div>
        </div>
        <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">ทุกเดือน</option>
          {availableMonths.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterBU} onChange={e=>setFilterBU(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="all">ทุก BU ({hrEmployees.length} คน)</option>
          {buList.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
      </div>
    </div>

    {/* KPIs — clickable */}
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      <KPI icon={<DollarSign className="w-5 h-5"/>} label="ต้นทุนพนักงานรวม" value={`฿${fmtM(totalCost)}`} sub={filterMonth==='all'?`${availableMonths.length} เดือน`:filterMonth} color="indigo"
        onClick={()=>setCostDetailPopup({type:'totalCost'})}/>
      <KPI icon={<Clock className="w-5 h-5"/>} label="ชม.ทำงานรวม" value={fmt(Math.round(totalHours))} sub="ชั่วโมง" color="cyan"
        onClick={()=>setCostDetailPopup({type:'totalHours'})}/>
      <KPI icon={<Users className="w-5 h-5"/>} label="จำนวนพนักงาน" value={fmt(uniqueEmp)} sub="คน" color="purple"
        onClick={()=>setCostDetailPopup({type:'employees'})}/>
      <KPI icon={<BarChart3 className="w-5 h-5"/>} label="ต้นทุน/คน" value={`฿${fmtM(avgCostPerHead)}`} sub="เฉลี่ย/เดือน" color="amber"
        onClick={()=>setCostDetailPopup({type:'buList'})}/>
      <div className={`rounded-xl border p-4 ${empCostPctColor} cursor-pointer hover:shadow-md transition-all`} onClick={()=>setShowCostInput(p=>!p)}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${empCostPct===null?'bg-gray-100':empCostPct>45?'bg-red-100':empCostPct>40?'bg-orange-100':empCostPct>35?'bg-yellow-100':'bg-[#D0F0C0]'}`}>
            <Target className="w-5 h-5"/>
          </div>
          <div className="min-w-0">
            <p className="text-xs opacity-70 truncate">Employee Cost %</p>
            <p className="text-lg font-bold truncate">{empCostPct!==null?`${empCostPct.toFixed(1)}%`:'ระบุต้นทุนบริษัท'}</p>
            <p className="text-xs opacity-60 truncate">{empCostPct!==null?(empCostPct>45?'⚠ สูงผิดปกติ':empCostPct>40?'⚠ ต้องติดตาม':empCostPct>35?'กำลังติดตาม':'✓ ปกติ'):'คลิกเพื่อตั้งค่า'}</p>
          </div>
        </div>
      </div>
      <div className="relative bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-[#C5E888] transition-all" onClick={()=>setCostDetailPopup({type:'products'})}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0"><Layers className="w-5 h-5"/></div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 truncate">Product/Cost Center</p>
            <p className="text-lg font-bold text-gray-900 truncate">{productMap.length}</p>
            <p className="text-xs text-gray-400 truncate">รหัส</p>
          </div>
        </div>
        {alertList.length>0&&<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{alertList.length}</span>}
      </div>
    </div>

    {/* Total Company Cost input */}
    {showCostInput&&<div className="bg-white rounded-xl border border-[#C5E888] p-4 flex items-center gap-3 flex-wrap">
      <Target className="w-4 h-4 text-[#7DC242] flex-shrink-0"/>
      <span className="text-sm text-gray-700 font-medium">ต้นทุนรวมบริษัท (บาท/เดือน หรือ สะสมทั้งปี)</span>
      <input type="text" value={costInputVal} onChange={e=>setCostInputVal(e.target.value)}
        placeholder="เช่น 73600000" className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7DC242]"/>
      <button onClick={()=>{const v=Number(costInputVal.replace(/,/g,''));if(v>0){setTotalCompanyCost(v);setShowCostInput(false)}}} className="px-4 py-2 text-sm bg-[#7DC242] text-white rounded-lg hover:bg-[#5A9020] font-medium">ตั้งค่า</button>
      {totalCompanyCost>0&&<button onClick={()=>{setTotalCompanyCost(0);setCostInputVal('');setShowCostInput(false)}} className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg">รีเซ็ต</button>}
      <p className="w-full text-xs text-gray-400">ใส่ต้นทุนรวมบริษัท (ทุก Cost รวมกัน) เพื่อคำนวณ Employee Cost % เทียบกับ Design Doc เกณฑ์: &lt;35% ปกติ, 35-40% ติดตาม, 40-45% เพิ่มขึ้น, &gt;45% สูงผิดปกติ</p>
    </div>}

    {/* ===== ALERT PANEL ===== */}
    {alertList.length>0&&<div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-b border-red-200">
        <Bell className="w-4 h-4 text-red-600"/>
        <span className="text-sm font-bold text-red-700">การแจ้งเตือน — {alertList.length} รายการ</span>
      </div>
      <div className="divide-y divide-red-100">
        {alertList.map((a,i)=><div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${a.sev==='critical'?'bg-red-50':'bg-yellow-50'}`}>
          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.sev==='critical'?'text-red-500':'text-yellow-500'}`}/>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-bold mr-2 px-1.5 py-0.5 rounded ${a.sev==='critical'?'bg-red-200 text-red-800':'bg-yellow-200 text-yellow-800'}`}>{a.id}</span>
            <span className={`text-sm font-semibold ${a.sev==='critical'?'text-red-800':'text-yellow-800'}`}>{a.label}</span>
            <span className={`text-sm ml-2 ${a.sev==='critical'?'text-red-700':'text-yellow-700'}`}>{a.msg}</span>
          </div>
        </div>)}
      </div>
    </div>}

    {/* Tabs */}
    <Tab tabs={[
      {key:'overview',icon:<LayoutDashboard className="w-4 h-4"/>,label:'ภาพรวม'},
      {key:'bu',icon:<Building2 className="w-4 h-4"/>,label:'ตาม BU'},
      {key:'product',icon:<Layers className="w-4 h-4"/>,label:'ตาม Product'},
      {key:'employee',icon:<UserCheck className="w-4 h-4"/>,label:'รายพนักงาน'},
      {key:'costtype',icon:<PieChart className="w-4 h-4"/>,label:'ตามต้นทุน'},
      {key:'costbu',icon:<Layers className="w-4 h-4"/>,label:'ต้นทุน × BU'},
      {key:'ccalloc',icon:<Table2 className="w-4 h-4"/>,label:'CC จัดสรร 2026'},
    ]} active={tab} onChange={setTab}/>

    {loading ? <div className="text-center py-20 text-gray-400 animate-pulse">กำลังโหลดข้อมูล...</div> : <>

    {/* ===== TAB: OVERVIEW ===== */}
    {tab==='overview' && <div className="space-y-6">
      {/* Monthly Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#7DC242]"/>ต้นทุนรายเดือน</h3>
        <div className="flex items-end gap-2 h-52">
          {monthlyData.map((d,i)=><div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">{fmtM(d.cost)}</span>
            <div className="w-full relative group">
              <div className="w-full bg-[#7DC242] rounded-t-md hover:bg-[#7DC242] min-h-[2px]" style={{height:`${Math.max((d.cost/maxBar)*160,4)}px`}}/>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                ฿{fmt(d.cost)}<br/>{fmt(Math.round(d.hours))} ชม. / {d.count} คน
              </div>
            </div>
            <span className="text-[10px] text-gray-400">{d.short}</span>
          </div>)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BU Pie-like */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><PieChart className="w-5 h-5 text-purple-500"/>สัดส่วนต้นทุนตาม BU</h3>
          <div className="space-y-3">
            {buSummary.map(([bu,info])=>{
              const pct=allocTotal>0?(info.cost/allocTotal*100):0
              const color=BU_COLORS[bu]||'#64748b'
              return <div key={bu}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:color}}/>{bu}</span>
                  <span className="font-medium text-gray-900 tabular-nums">฿{fmtM(info.cost)} <span className="text-gray-400 text-xs">({fmtPct(pct)})</span></span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}}/></div>
              </div>
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-cyan-500"/>Top 15 Product / Cost Center</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {topProducts.slice(0,15).map((d,idx)=>{
              const pct=allocTotal>0?(d.cost/allocTotal*100):0
              return <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-gray-400 text-xs text-right">{idx+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-gray-700 truncate">{d.name}</span>
                    <span className="font-medium text-gray-900 tabular-nums ml-2 whitespace-nowrap">฿{fmtM(d.cost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{d.bu} · {fmt(Math.round(d.hours))}ชม. · {d.people.size}คน</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 rounded-full" style={{width:`${pct}%`}}/></div>
                    <span className="text-[10px] text-gray-400 tabular-nums">{fmtPct(pct)}</span>
                  </div>
                </div>
              </div>
            })}
          </div>
        </div>
      </div>

      {/* BU Cost per Head + Central Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* BU Cost per Head Ranking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#78c045]"/>ต้นทุนต่อหัว (Cost per Head) แยก BU
          </h3>
          <p className="text-xs text-gray-400 mb-4">เฉลี่ยรวม: ฿{fmt(Math.round(buCostPerHead.avg))}/คน · แจ้งเตือนถ้าสูงกว่าเฉลี่ย 20%</p>
          <div className="space-y-2.5">
            {Object.entries(buCostPerHead.byBU).sort((a,b)=>b[1].costPerHead-a[1].costPerHead).map(([bu,d])=>{
              const maxCPH=Math.max(...Object.values(buCostPerHead.byBU).map(x=>x.costPerHead),1)
              const pct=maxCPH>0?d.costPerHead/maxCPH*100:0
              return <div key={bu}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {d.isHigh&&<AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0"/>}
                    <span className={`truncate ${d.isHigh?'text-orange-700 font-semibold':'text-gray-700'}`}>{bu}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">({d.headcount}คน)</span>
                  </div>
                  <span className={`font-semibold tabular-nums flex-shrink-0 ml-2 ${d.isHigh?'text-orange-600':'text-gray-800'}`}>฿{fmtM(d.costPerHead)}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.isHigh?'bg-orange-400':'bg-[#78c045]'}`} style={{width:`${pct}%`}}/>
                </div>
              </div>
            })}
          </div>
          {buCostPerHead.avg>0&&<div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>
            <span>สีส้ม = สูงกว่าเฉลี่ย &gt; 20% (เกณฑ์ Alert A3)</span>
          </div>}
        </div>

        {/* Central Cost Ratio */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-500"/>Central Cost Ratio (ต้นทุนส่วนกลาง)
          </h3>
          <p className="text-xs text-gray-400 mb-4">รวม: ฿{fmtM(centralData.total)} · แจ้งเตือนถ้า Cost Center ใด &gt; 30%</p>
          {centralData.items.length>0
            ? <div className="space-y-2.5">
                {centralData.items.map((d,i)=><div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {d.isHigh&&<AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/>}
                      <span className={`truncate ${d.isHigh?'text-red-700 font-semibold':'text-gray-700'}`}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`font-semibold tabular-nums ${d.isHigh?'text-red-600':'text-gray-800'}`}>{d.ratio.toFixed(1)}%</span>
                      <span className="text-xs text-gray-400">฿{fmtM(d.cost)}</span>
                      {d.isHigh&&<span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">บวม!</span>}
                    </div>
                  </div>
                  <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${d.isHigh?'bg-red-400':'bg-amber-400'}`} style={{width:`${Math.min(d.ratio,100)}%`}}/>
                    <div className="absolute top-0 h-full border-r-2 border-dashed border-gray-400" style={{left:'30%'}}/>
                  </div>
                </div>)}
                <div className="pt-2 text-xs text-gray-400 flex items-center gap-1">
                  <span className="border-r-2 border-dashed border-gray-400 h-3 inline-block mr-1"/>
                  เส้นประ = เกณฑ์ 30% (Alert A4)
                </div>
              </div>
            : <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Building2 className="w-10 h-10 mb-2 text-gray-200"/>
                <p className="text-sm">ไม่พบข้อมูล Cost Center ส่วนกลาง</p>
                <p className="text-xs mt-1">ต้องมี BU = "Cost Center" ใน hr_product_map</p>
              </div>
          }
        </div>
      </div>

      {/* Monthly comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-500"/>สรุปรายเดือน</h3>
          {trendAlert&&<div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5"/>ต้นทุนเพิ่ม 3 เดือนต่อเนื่อง +{trendAlert.growth}%
          </div>}
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">เดือน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุนรวม (฿)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">จำนวนคน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">MoM</th>
          </tr></thead>
          <tbody>{monthlyData.map((d,i)=>{
            const prev=i>0?monthlyData[i-1].cost:0
            const mom=prev>0?((d.cost-prev)/prev*100):0
            const cph=d.hours>0?(d.cost/d.hours):0
            return <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-700">{d.month}</td>
              <td className="px-3 py-2 text-right tabular-nums">฿{fmt(Math.round(d.cost))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(Math.round(d.hours))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{d.count}</td>
              <td className="px-3 py-2 text-right tabular-nums">฿{fmt(Math.round(cph))}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${mom>0?'text-red-600':mom<0?'text-green-600':'text-gray-400'}`}>{i>0?`${mom>=0?'+':''}${mom.toFixed(1)}%`:'-'}</td>
            </tr>
          })}</tbody>
          <tfoot><tr className="border-t-2 border-gray-300 bg-[#E6F9F0] font-semibold">
            <td className="px-3 py-2 text-[#4E7F1A]">รวม</td>
            <td className="px-3 py-2 text-right text-[#4E7F1A] tabular-nums">฿{fmt(Math.round(totalCost))}</td>
            <td className="px-3 py-2 text-right text-[#4E7F1A] tabular-nums">{fmt(Math.round(totalHours))}</td>
            <td className="px-3 py-2 text-right text-[#4E7F1A] tabular-nums">{uniqueEmp}</td>
            <td className="px-3 py-2 text-right text-[#4E7F1A] tabular-nums">฿{fmt(Math.round(avgCostPerHour))}</td>
            <td className="px-3 py-2"></td>
          </tr></tfoot>
        </table></div>
      </div>
    </div>}

    {/* ===== TAB: BU ===== */}
    {tab==='bu' && <div className="space-y-3">
      {buSummary.map(([bu,info])=>{
        const isOpen=expandedBU[bu]
        const color=BU_COLORS[bu]||'#64748b'
        const products=Object.entries(info.products).sort((a,b)=>b[1].cost-a[1].cost)
        const pct=allocTotal>0?(info.cost/allocTotal*100):0
        return <div key={bu} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={()=>setExpandedBU(p=>({...p,[bu]:!p[bu]}))} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{backgroundColor:color}}/>
              <span className="font-semibold text-gray-800">{bu}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{products.length} products</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><p className="font-bold text-gray-900">฿{fmtM(info.cost)}</p><p className="text-xs text-gray-400">{fmtPct(pct)}</p></div>
              {isOpen?<ChevronDown className="w-5 h-5 text-gray-400"/>:<ChevronRight className="w-5 h-5 text-gray-400"/>}
            </div>
          </button>
          {isOpen && <div className="border-t border-gray-100 px-5 py-4">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">รหัส</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Product / Cost Center</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน (฿)</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">สัดส่วน</th>
              </tr></thead>
              <tbody>{products.map(([code,pd])=>{
                const ppct=info.cost>0?(pd.cost/info.cost*100):0
                const cph=pd.hours>0?(pd.cost/pd.hours):0
                return <tr key={code} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs font-mono">{code}</td>
                  <td className="px-3 py-2 text-gray-700">{pd.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">฿{fmt(Math.round(pd.cost))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(Math.round(pd.hours))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cph>0?`฿${fmt(Math.round(cph))}`:'-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${ppct}%`,backgroundColor:color}}/></div>
                      <span className="text-xs text-gray-400 tabular-nums w-10 text-right">{fmtPct(ppct)}</span>
                    </div>
                  </td>
                </tr>
              })}</tbody>
              <tfoot><tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="px-3 py-2" colSpan={2}>รวม {bu}</td>
                <td className="px-3 py-2 text-right tabular-nums">฿{fmt(Math.round(info.cost))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(Math.round(products.reduce((s,[,p])=>s+p.hours,0)))}</td>
                <td className="px-3 py-2"></td><td className="px-3 py-2 text-right text-xs">100%</td>
              </tr></tfoot>
            </table></div>
          </div>}
        </div>
      })}
    </div>}

    {/* ===== TAB: PRODUCT ===== */}
    {tab==='product' && <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Product / Cost Center ทั้งหมด ({topProducts.length} รายการ)</h3>
      {(()=>{
        // Group products by BU
        const buGroups={}
        const buOrder=['BU efin.finance','BU Content','BU IR Plus','BU IT Solution','Cost Center','Event&Community','ATESS']
        topProducts.forEach(d=>{
          const bu=d.bu||'ไม่ระบุ BU'
          if(!buGroups[bu]) buGroups[bu]=[]
          buGroups[bu].push(d)
        })
        const orderedBUs=[...buOrder.filter(b=>buGroups[b]),...Object.keys(buGroups).filter(b=>!buOrder.includes(b))]
        return orderedBUs.map(buName=>{
          const items=buGroups[buName]
          const buCost=items.reduce((s,d)=>s+d.cost,0)
          const buHours=items.reduce((s,d)=>s+d.hours,0)
          const buPeople=new Set(items.flatMap(d=>[...d.people])).size
          const color=BU_COLORS[buName]||'#64748b'
          return <div key={buName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor:color}}/>
                <span className="font-bold text-gray-800">{buName}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">{items.length} products</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{buPeople} คน</span>
                <span>{fmt(Math.round(buHours))} ชม.</span>
                <span className="font-bold text-gray-800 text-sm">฿{fmt(Math.round(buCost))}</span>
              </div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-gray-50/50"><tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">รหัส</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">ชื่อ</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน (฿)</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">จำนวนคน</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">สัดส่วน</th>
              </tr></thead>
              <tbody>{items.map((d,i)=>{
                const pct=allocTotal>0?(d.cost/allocTotal*100):0
                const cph=d.hours>0?(d.cost/d.hours):0
                return <tr key={d.code} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs">{d.code}</td>
                  <td className="px-3 py-2 text-gray-700">{d.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{d.cost>0?`฿${fmt(Math.round(d.cost))}`:'-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.hours>0?fmt(Math.round(d.hours)):'-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cph>0?`฿${fmt(Math.round(cph))}`:'-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.people.size||'-'}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:color}}/></div>
                      <span className="text-xs text-gray-400 tabular-nums">{pct>0?fmtPct(pct):'-'}</span>
                    </div>
                  </td>
                </tr>
              })}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td className="px-3 py-2 text-gray-700" colSpan={2}>รวม {buName}</td>
                <td className="px-3 py-2 text-right tabular-nums">฿{fmt(Math.round(buCost))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(Math.round(buHours))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{buHours>0?`฿${fmt(Math.round(buCost/buHours))}`:'-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{buPeople}</td>
                <td className="px-3 py-2 text-right tabular-nums">{allocTotal>0?fmtPct(buCost/allocTotal*100):'-'}</td>
              </tr>
              </tbody>
            </table></div>
          </div>
        })
      })()}
    </div>}

    {/* ===== TAB: EMPLOYEE ===== */}
    {tab==='employee' && <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส / บริษัท / BU / ตำแหน่ง / สถานะ..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white"/>
        </div>
        <span className="text-sm text-gray-500">{empDetail.length} คน</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">รหัส</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">ชื่อ-นามสกุล</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">ตำแหน่ง</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">แผนก</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">บริษัท</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">BU</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">ประเภท</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">สถานะ</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">วันเริ่มงาน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600 bg-[#E6F9F0]">รวมต้นทุน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
            <th className="px-3 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
          </tr></thead>
          <tbody>{empDetail.slice(0,200).map((e,i)=>{
            const cost=costByUUID[e.id]
            const statusColor=e.status==='active'?'bg-green-100 text-green-700':e.status==='inactive'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'
            return <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-1.5 text-xs font-mono text-[#7DC242]">{e.employee_code}</td>
              <td className="px-3 py-1.5 text-gray-700 font-medium whitespace-nowrap">{`${e.prefix_th||''}${e.first_name_th||''} ${e.last_name_th||''}`.trim()}</td>
              <td className="px-3 py-1.5 text-gray-500 text-xs truncate max-w-[150px]">{e.position_th||'-'}</td>
              <td className="px-3 py-1.5 text-gray-500 text-xs truncate max-w-[150px]">{deptLookup[e.department_id]||'-'}</td>
              <td className="px-3 py-1.5 text-xs">{e.company_entity ? <span className="px-1.5 py-0.5 rounded bg-[#f0fce8] text-[#5A9020] whitespace-nowrap">{e.company_entity}</span> : '-'}</td>
              <td className="px-3 py-1.5 text-xs">{e.bu ? <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 whitespace-nowrap">{e.bu}</span> : '-'}</td>
              <td className="px-3 py-1.5 text-xs text-gray-500">{e.employment_type||'-'}</td>
              <td className="px-3 py-1.5 text-xs"><span className={`px-1.5 py-0.5 rounded ${statusColor}`}>{e.status||'-'}</span></td>
              <td className="px-3 py-1.5 text-xs text-gray-500">{e.hire_date?new Date(e.hire_date).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}):'-'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-[#5A9020] bg-[#E6F9F0]">{cost?`฿${maskCost(cost.totalCost)}`:'-'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{cost&&cost.totalHours>0?fmt(Math.round(cost.totalHours)):'-'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{cost&&cost.costPerHour>0?`฿${fmt(Math.round(cost.costPerHour))}`:'-'}</td>
            </tr>
          })}</tbody>
        </table></div>
        {empDetail.length>200 && <div className="text-center py-3 text-xs text-gray-400">แสดง 200 จาก {empDetail.length} คน</div>}
      </div>
    </div>}

    {/* ===== TAB: COST TYPE ===== */}
    {tab==='costtype' && <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['service','sales','admin'].map(ct=>{
          const d=costTypeData[ct]; const pct=(d.totalCost/grandTotal*100)
          return <div key={ct} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full`} style={{backgroundColor:COST_TYPE_COLORS[ct]}}/>
                <span className="font-semibold text-gray-800">{COST_TYPE_LABELS[ct]}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{pct.toFixed(1)}%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">฿{fmtM(d.totalCost)}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mt-3">
              <span>จำนวนพนักงาน</span><span className="text-right font-medium text-gray-700">{d.headcount.size} คน</span>
              <span>ชม.ทำงานรวม</span><span className="text-right font-medium text-gray-700">{fmt(Math.round(d.totalHours))} ชม.</span>
              <span>ต้นทุน/ชม.</span><span className="text-right font-medium text-gray-700">฿{d.totalHours>0?fmt(Math.round(d.totalCost/d.totalHours)):'-'}</span>
            </div>
          </div>
        })}
      </div>

      {/* Proportion Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#7DC242]"/>สัดส่วนต้นทุน</h3>
        <div className="flex rounded-lg overflow-hidden h-10">
          {['service','sales','admin'].map(ct=>{
            const pct=costTypeData[ct].totalCost/grandTotal*100
            return pct>0 ? <div key={ct} className="flex items-center justify-center text-white text-xs font-semibold" style={{width:`${pct}%`,backgroundColor:COST_TYPE_COLORS[ct],minWidth:pct>5?'auto':'30px'}}>
              {pct>=8 && `${COST_TYPE_LABELS[ct]} ${pct.toFixed(1)}%`}
            </div> : null
          })}
        </div>
        <div className="flex gap-6 mt-3">
          {['service','sales','admin'].map(ct=><div key={ct} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded" style={{backgroundColor:COST_TYPE_COLORS[ct]}}/>
            {COST_TYPE_LABELS[ct]}: ฿{fmtM(costTypeData[ct].totalCost)} ({(costTypeData[ct].totalCost/grandTotal*100).toFixed(1)}%)
          </div>)}
        </div>
      </div>

      {/* Detail per cost type */}
      {['service','sales','admin'].map(ct=>{
        const d=costTypeData[ct]
        const companies=Object.entries(d.byCompany).sort((a,b)=>b[1].totalCost-a[1].totalCost)
        const depts=Object.entries(d.byDept).sort((a,b)=>b[1].totalCost-a[1].totalCost)
        return <div key={ct} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor:COST_TYPE_COLORS[ct]}}/>
              <h3 className="font-bold text-gray-800">{COST_TYPE_LABELS[ct]}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{d.headcount.size} คน</span>
            </div>
            <span className="text-lg font-bold text-gray-900">฿{fmt(Math.round(d.totalCost))}</span>
          </div>

          {/* By Company */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">แยกตามบริษัท</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">บริษัท</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">คน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">เงินเดือน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">OT/ค่าเดินทาง</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ประกันสังคม</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">กองทุนสำรอง</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">สวัสดิการ</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 bg-[#E6F9F0]">รวมต้นทุน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
              </tr></thead>
              <tbody>
                {companies.map(([name,c])=><tr key={name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-700">{name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.headcount.size}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(c.salary))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(c.ot))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(c.socialSecurity))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(c.providentFund))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(c.welfare))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(Math.round(c.totalHours))}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#5A9020] bg-[#E6F9F0]">฿{fmt(Math.round(c.totalCost))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.totalHours>0?`฿${fmt(Math.round(c.totalCost/c.totalHours))}`:'-'}</td>
                </tr>)}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="px-4 py-2 text-gray-700">รวม</td>
                  <td className="px-4 py-2 text-right">{d.headcount.size}</td>
                  <td className="px-4 py-2 text-right">฿{fmt(Math.round(d.salary))}</td>
                  <td className="px-4 py-2 text-right">฿{fmt(Math.round(d.ot))}</td>
                  <td className="px-4 py-2 text-right">฿{fmt(Math.round(d.socialSecurity))}</td>
                  <td className="px-4 py-2 text-right">฿{fmt(Math.round(d.providentFund))}</td>
                  <td className="px-4 py-2 text-right">฿{fmt(Math.round(d.welfare))}</td>
                  <td className="px-4 py-2 text-right">{fmt(Math.round(d.totalHours))}</td>
                  <td className="px-4 py-2 text-right text-[#5A9020] bg-[#E6F9F0]">฿{fmt(Math.round(d.totalCost))}</td>
                  <td className="px-4 py-2 text-right">{d.totalHours>0?`฿${fmt(Math.round(d.totalCost/d.totalHours))}`:'-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* By Department */}
          <div className="px-5 py-3 bg-gray-50 border-t border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">แยกตามแผนก</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">แผนก</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">บริษัท</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">คน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">เงินเดือน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">OT/ค่าเดินทาง</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ประกันสังคม</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">กองทุนสำรอง</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">สวัสดิการ</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ชม.ทำงาน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600 bg-[#E6F9F0]">รวมต้นทุน</th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
              </tr></thead>
              <tbody>
                {depts.map(([name,dd])=><tr key={name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700 text-xs">{name}</td>
                  <td className="px-4 py-2 text-xs"><span className="px-1.5 py-0.5 rounded bg-[#f0fce8] text-[#5A9020]">{dd.company||'-'}</span></td>
                  <td className="px-4 py-2 text-right tabular-nums">{dd.headcount.size}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(dd.salary))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(dd.ot))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(dd.socialSecurity))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(dd.providentFund))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">฿{fmt(Math.round(dd.welfare))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmt(Math.round(dd.totalHours))}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#5A9020] bg-[#E6F9F0]">฿{fmt(Math.round(dd.totalCost))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{dd.totalHours>0?`฿${fmt(Math.round(dd.totalCost/dd.totalHours))}`:'-'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      })}
    </div>}

    {/* ===== TAB: COST × BU ===== */}
    {tab==='costbu' && <div className="space-y-6">
      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500">ประเภทต้นทุน:</label>
        <select value={filterCostType} onChange={e=>setFilterCostType(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="all">ทั้งหมด</option>
          <option value="service">ต้นทุนบริการ</option>
          <option value="sales">ต้นทุนขาย</option>
          <option value="admin">ต้นทุนบริหาร</option>
        </select>
      </div>

      {/* KPI Cards */}
      {(()=>{
        const gTotal=costBUData.grandTotal
        const buCount=costBUData.buList.length
        const totalPeople=new Set(costBUData.buList.flatMap(([,v])=>[...v.people])).size
        const totalHrs=costBUData.buList.reduce((s,[,v])=>s+v.hours,0)
        const svc=costBUData.buList.reduce((s,[,v])=>s+v.service,0)
        const sal=costBUData.buList.reduce((s,[,v])=>s+v.sales,0)
        const adm=costBUData.buList.reduce((s,[,v])=>s+v.admin,0)
        return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI icon={<DollarSign className="w-5 h-5"/>} label="ต้นทุนรวมทุก BU" value={`฿${fmtM(gTotal)}`} sub={`${totalPeople} คน · ${fmt(Math.round(totalHrs))} ชม.`} color="indigo"/>
          <KPI icon={<PieChart className="w-5 h-5"/>} label="ต้นทุนบริการ" value={`฿${fmtM(svc)}`} sub={`${gTotal>0?(svc/gTotal*100).toFixed(1):'0'}% ของต้นทุนรวม`} color="purple"/>
          <KPI icon={<TrendingUp className="w-5 h-5"/>} label="ต้นทุนขาย" value={`฿${fmtM(sal)}`} sub={`${gTotal>0?(sal/gTotal*100).toFixed(1):'0'}% ของต้นทุนรวม`} color="cyan"/>
          <KPI icon={<TrendingDown className="w-5 h-5"/>} label="ต้นทุนบริหาร" value={`฿${fmtM(adm)}`} sub={`${gTotal>0?(adm/gTotal*100).toFixed(1):'0'}% ของต้นทุนรวม`} color="amber"/>
        </div>
      })()}

      {/* Stacked Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-[#7DC242]"/>สัดส่วนต้นทุนแยก BU</h3>
        <div className="flex gap-6 mb-4">
          {[{k:'service',l:'ต้นทุนบริการ',c:'#6366f1'},{k:'sales',l:'ต้นทุนขาย',c:'#06b6d4'},{k:'admin',l:'ต้นทุนบริหาร',c:'#f59e0b'}].map(x=>
            <div key={x.k} className="flex items-center gap-1.5 text-xs text-gray-600"><div className="w-2.5 h-2.5 rounded" style={{backgroundColor:x.c}}/>{x.l}</div>
          )}
        </div>
        <div className="space-y-2">
          {costBUData.buList.map(([buName,bu])=>{
            const t=bu.totalCost||1
            const sPct=bu.service/t*100, slPct=bu.sales/t*100, aPct=bu.admin/t*100
            return <div key={buName} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-600 text-right truncate flex-shrink-0">{buName}</div>
              <div className="flex-1 h-7 bg-gray-100 rounded overflow-hidden flex">
                {sPct>0&&<div className="h-full flex items-center justify-center text-white text-[10px] font-semibold" style={{width:`${sPct}%`,backgroundColor:'#6366f1',minWidth:sPct>8?'auto':'0'}}>{sPct>=8?`${Math.round(sPct)}%`:''}</div>}
                {slPct>0&&<div className="h-full flex items-center justify-center text-white text-[10px] font-semibold" style={{width:`${slPct}%`,backgroundColor:'#06b6d4',minWidth:slPct>8?'auto':'0'}}>{slPct>=8?`${Math.round(slPct)}%`:''}</div>}
                {aPct>0&&<div className="h-full flex items-center justify-center text-white text-[10px] font-semibold" style={{width:`${aPct}%`,backgroundColor:'#f59e0b',minWidth:aPct>8?'auto':'0'}}>{aPct>=8?`${Math.round(aPct)}%`:''}</div>}
              </div>
              <div className="w-20 text-xs text-gray-600 text-right tabular-nums flex-shrink-0">฿{fmtM(bu.totalCost)}</div>
            </div>
          })}
        </div>
      </div>

      {/* Detail per BU */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5 text-[#7DC242]"/>รายละเอียดต้นทุนแยก BU → Product</h3>
        {costBUData.buList.map(([buName,bu])=>{
          const isExpanded=expandedCostBU[buName]!==false // default expanded
          const products=Object.entries(bu.products)
            .map(([code,p])=>({code,name:buLookup[code]?.name||code,...p}))
            .sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))
          const filteredProducts=filterCostType==='all'?products:products.filter(p=>p[filterCostType]>0)
          const buColor=BU_COLORS[buName]||'#6366f1'

          return <div key={buName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={()=>setExpandedCostBU(p=>({...p,[buName]:!isExpanded}))}>
              <div className="flex items-center gap-3">
                {isExpanded?<ChevronDown className="w-4 h-4 text-gray-400"/>:<ChevronRight className="w-4 h-4 text-gray-400"/>}
                <div className="w-3 h-3 rounded-full" style={{backgroundColor:buColor}}/>
                <span className="font-bold text-gray-800">{buName}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500">{bu.people.size} คน · {filteredProducts.length} products</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {bu.service>0&&<span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D0F0C0] text-[#5A9020]">บริการ ฿{fmtM(bu.service)}</span>}
                  {bu.sales>0&&<span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">ขาย ฿{fmtM(bu.sales)}</span>}
                  {bu.admin>0&&<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">บริหาร ฿{fmtM(bu.admin)}</span>}
                </div>
                <span className="text-lg font-bold text-gray-900">฿{fmt(Math.round(bu.totalCost))}</span>
              </div>
            </div>

            {isExpanded && <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Product</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">ชม.</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">สัดส่วน</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุนบริการ</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุนขาย</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุนบริหาร</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600 bg-[#E6F9F0]">รวมต้นทุน</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">ต้นทุน/ชม.</th>
                </tr></thead>
                <tbody>
                  {filteredProducts.map(p=>{
                    const pctOfBU=bu.hours>0?(p.hours/bu.hours*100):0
                    return <tr key={p.code} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700"><span className="text-xs text-gray-400 mr-1">{p.code}</span> {p.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(Math.round(p.hours))}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{pctOfBU.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.service>0?`฿${fmt(Math.round(p.service))}`:'-'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.sales>0?`฿${fmt(Math.round(p.sales))}`:'-'}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.admin>0?`฿${fmt(Math.round(p.admin))}`:'-'}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-[#5A9020] bg-[#E6F9F0]">฿{fmt(Math.round(p.totalCost))}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{p.hours>0?`฿${fmt(Math.round(p.totalCost/p.hours))}`:'-'}</td>
                    </tr>
                  })}
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-4 py-2 text-gray-700">รวม {buName}</td>
                    <td className="px-4 py-2 text-right">{fmt(Math.round(bu.hours))}</td>
                    <td className="px-4 py-2 text-right">100%</td>
                    <td className="px-4 py-2 text-right">฿{fmt(Math.round(bu.service))}</td>
                    <td className="px-4 py-2 text-right">฿{fmt(Math.round(bu.sales))}</td>
                    <td className="px-4 py-2 text-right">฿{fmt(Math.round(bu.admin))}</td>
                    <td className="px-4 py-2 text-right text-[#5A9020] bg-[#E6F9F0]">฿{fmt(Math.round(bu.totalCost))}</td>
                    <td className="px-4 py-2 text-right">{bu.hours>0?`฿${fmt(Math.round(bu.totalCost/bu.hours))}`:'-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>}
          </div>
        })}
      </div>

      {/* Calculation note */}
      <div className="bg-[#f0fce8] rounded-xl border border-blue-100 p-4">
        <p className="text-xs font-semibold text-[#4E7F1A] mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/>หลักการคำนวณ</p>
        <div className="text-xs text-[#5A9020] space-y-1">
          <p>1. ดึงชั่วโมงทำงานของพนักงานแต่ละคนแยกตาม product code จาก hr_hours_allocation</p>
          <p>2. คำนวณสัดส่วน % ชั่วโมงในแต่ละ product ต่อชั่วโมงรวมของคนนั้น</p>
          <p>3. จัดสรรต้นทุน (เงินเดือน, OT, ประกันสังคม, กองทุน, สวัสดิการ) ตามสัดส่วนเข้า product</p>
          <p>4. จัดกลุ่ม product เข้า BU ผ่าน hr_product_map</p>
          <p>5. ประเภทต้นทุน (บริการ/ขาย/บริหาร) มาจากแผนกต้นสังกัดของพนักงาน</p>
        </div>
      </div>
    </div>}

    </>}

    {/* ===== Hours Update Modal ===== */}
    {showHoursUpdate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setShowHoursUpdate(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500"/>อัปเดตชั่วโมงทำงาน</h3>
          <button onClick={()=>setShowHoursUpdate(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400"/></button>
        </div>

        {/* Month Grid */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">เลือกเดือนที่ต้องการอัปเดต</label>
          <div className="grid grid-cols-4 gap-2">
            {MONTH_ORDER.map((mo,i)=>{
              const st=hoursMonthStatus[mo]
              const hasData=st?.records>0
              const isSelected=hoursMonth===mo
              return <button key={mo} onClick={()=>{setHoursMonth(mo);setHoursFile(null);setHoursPreview(null);setHoursError(null);setHoursResult(null)}}
                className={`relative p-3 rounded-lg border-2 text-left transition-all ${isSelected?'border-amber-500 bg-amber-50 shadow-md':'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected?'text-amber-800':'text-gray-700'}`}>{MONTH_SHORT[i]}</span>
                  {hasData ? <span className="w-2.5 h-2.5 rounded-full bg-green-400" title="มีข้อมูลแล้ว"/> : <span className="w-2.5 h-2.5 rounded-full bg-gray-300" title="ยังไม่มีข้อมูล"/>}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {hasData ? `${st.records} รายการ · ${Math.round(st.hours).toLocaleString()} ชม.` : 'ยังไม่มีข้อมูล'}
                </div>
              </button>
            })}
          </div>
        </div>

        {/* Upload area - only show when month selected */}
        {hoursMonth && <>
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">เดือน: <span className="text-amber-600 font-bold">{hoursMonth}</span></span>
                {hoursMonthStatus[hoursMonth]?.records>0 && <span className="ml-2 text-xs text-orange-500">(มีข้อมูลเดิม {hoursMonthStatus[hoursMonth].records} รายการ — จะถูกแทนที่)</span>}
              </div>
              <button onClick={handleDownloadHoursTemplate} className="flex items-center gap-1 text-xs text-[#7DC242] hover:text-[#4E7F1A]">
                <Download size={12}/>ดาวน์โหลด Template
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <p className="font-medium text-gray-700 mb-1">รูปแบบไฟล์ Excel ที่รับ:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span><span><b className="text-gray-700">Pivot</b> — แถว=พนักงาน คอลัมน์=product code (เหมือนไฟล์ชม.ทำงานรายเดือน)</span></div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span><span><b className="text-gray-700">Flat</b> — คอลัมน์ employee_id, product_code, hours</span></div>
              </div>
              <p className="mt-2 text-gray-400">ระบบจะ auto-detect รูปแบบ · เลือก sheet ตรงชื่อเดือน · คำนวณต้นทุนอัตโนมัติ</p>
            </div>

            <div>
              <input ref={hoursFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleHoursFileSelect}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-amber-50 file:text-amber-700 file:text-xs file:font-medium"/>
            </div>

            {hoursPreview && <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0"/>
                <span className="text-sm text-green-700 font-medium">อ่านได้ {hoursPreview.length} รายการ ({new Set(hoursPreview.map(r=>r.employee_id)).size} คน)</span>
              </div>
              <div className="max-h-32 overflow-auto text-xs">
                <table className="w-full text-left">
                  <thead><tr className="text-gray-500 border-b border-green-200">
                    <th className="py-1 px-2">employee_id</th><th className="py-1 px-2">product_code</th><th className="py-1 px-2 text-right">hours</th>
                  </tr></thead>
                  <tbody>
                    {hoursPreview.slice(0,8).map((r,i)=>
                      <tr key={i} className="border-b border-green-100"><td className="py-1 px-2 font-mono">{r.employee_id}</td><td className="py-1 px-2 font-mono">{r.product_code}</td><td className="py-1 px-2 text-right">{r.hours}</td></tr>
                    )}
                    {hoursPreview.length>8 && <tr><td colSpan={3} className="py-1 px-2 text-gray-400 text-center">... อีก {hoursPreview.length-8} แถว</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>}

            {hoursError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"/>
              <span className="text-sm text-red-700 whitespace-pre-wrap">{hoursError}</span>
            </div>}

            {hoursResult && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"/>
              <span className="text-sm text-green-700">{hoursResult}</span>
            </div>}

            <div className="flex gap-2 pt-2">
              <button onClick={()=>setShowHoursUpdate(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">ปิด</button>
              <button onClick={handleHoursImport} disabled={!hoursPreview?.length||hoursImporting}
                className="flex-1 px-4 py-2.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium">
                {hoursImporting?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังนำเข้า...</>:<><Upload size={14}/>อัปเดตชั่วโมง — {hoursMonth}</>}
              </button>
            </div>
          </div>
        </>}
      </div>
    </div>}

    {/* Import Modal */}
    {showImport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={()=>setShowImport(false)}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-blue-500"/>นำเข้าข้อมูลต้นทุน</h3>
          <button onClick={()=>setShowImport(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-400"/></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทข้อมูล</label>
            <select value={importType} onChange={e=>setImportType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2">
              {Object.entries(IMPORT_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คอลัมน์ที่ต้องมีใน Excel</label>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 font-mono break-all">
              {IMPORT_TYPES[importType].cols.join(', ')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกไฟล์ Excel (.xlsx)</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-[#f0fce8] file:text-[#7DC242] file:text-xs file:font-medium"/>
          </div>

          {importPreview && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0"/>
            <span className="text-sm text-green-700">อ่านได้ {importPreview.length} แถว พร้อมนำเข้า</span>
          </div>}

          {importError && <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0"/>
            <span className="text-sm text-red-700">{importError}</span>
          </div>}

          {importResult && <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0"/>
            <span className="text-sm text-green-700">{importResult}</span>
          </div>}

          <div className="flex gap-2 pt-2">
            <button onClick={()=>setShowImport(false)} className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
            <button onClick={handleImport} disabled={!importPreview?.length||importing}
              className="flex-1 px-4 py-2 text-sm bg-[#7DC242] text-white rounded-lg hover:bg-[#5A9020] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {importing?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>กำลังนำเข้า...</>:<><Upload size={14}/>นำเข้า {importPreview?.length||0} รายการ</>}
            </button>
          </div>
        </div>
      </div>
    </div>}

    {/* ===== DETAIL POPUP ===== */}
    {costDetailPopup && (() => {
      let popupTitle='', popupIcon=DollarSign, popupIconBg='bg-[#7DC242]', popupData=[], popupCols=[], popupSummary=''

      switch(costDetailPopup.type) {
        case 'totalCost': {
          popupTitle = `ต้นทุนรวม ฿${fmt(Math.round(totalCost))} — แยกรายเดือน`
          popupIcon = DollarSign; popupIconBg = 'bg-[#7DC242]'
          popupSummary = `ที่มา: hr_cost_employee (total_cost) รวม ${fCostEmp.length} records · filter: ${filterMonth==='all'?'ทุกเดือน':filterMonth}${filterBU!=='all'?' · BU: '+filterBU:''}`
          // Aggregate by month
          const byMonth = {}
          fCostEmp.forEach(r => {
            const m = r.period_month
            if(!byMonth[m]) byMonth[m] = { month: m, salary: 0, transport: 0, welfare: 0, providentFund: 0, socialSecurity: 0, totalCost: 0, people: new Set(), hours: 0 }
            byMonth[m].salary += Number(r.salary)||0
            byMonth[m].transport += Number(r.transport)||0
            byMonth[m].welfare += Number(r.welfare)||0
            byMonth[m].providentFund += Number(r.provident_fund)||0
            byMonth[m].socialSecurity += Number(r.social_security)||0
            byMonth[m].totalCost += Number(r.total_cost)||0
            byMonth[m].hours += Number(r.work_hours)||0
            byMonth[m].people.add(r.employee_id)
          })
          popupData = MONTH_ORDER.filter(m=>byMonth[m]).map(m=>({...byMonth[m], count: byMonth[m].people.size}))
          popupCols = [
            { label: 'เดือน', key: 'month', render: r=>r.month },
            { label: 'จำนวนคน', key: 'count', render: r=>fmt(r.count), sortKey: r=>r.count, align:'right' },
            { label: 'เงินเดือน', key: 'salary', render: r=>'฿'+fmt(Math.round(r.salary)), sortKey: r=>r.salary, align:'right' },
            { label: 'ค่าเดินทาง', key: 'transport', render: r=>'฿'+fmt(Math.round(r.transport)), sortKey: r=>r.transport, align:'right' },
            { label: 'สวัสดิการ', key: 'welfare', render: r=>'฿'+fmt(Math.round(r.welfare)), sortKey: r=>r.welfare, align:'right' },
            { label: 'กองทุนสำรอง', key: 'providentFund', render: r=>'฿'+fmt(Math.round(r.providentFund)), sortKey: r=>r.providentFund, align:'right' },
            { label: 'ประกันสังคม', key: 'socialSecurity', render: r=>'฿'+fmt(Math.round(r.socialSecurity)), sortKey: r=>r.socialSecurity, align:'right' },
            { label: 'ต้นทุนรวม', key: 'totalCost', render: r=>'฿'+fmt(Math.round(r.totalCost)), sortKey: r=>r.totalCost, align:'right' },
          ]
          break
        }
        case 'totalHours': {
          popupTitle = `ชม.ทำงานรวม ${fmt(Math.round(totalHours))} ชั่วโมง — แยกรายเดือน`
          popupIcon = Clock; popupIconBg = 'bg-cyan-500'
          popupSummary = `ที่มา: hr_cost_employee (work_hours) · ชั่วโมงทำงานมาตรฐาน 176 ชม./เดือน/คน`
          const byMonth = {}
          fCostEmp.forEach(r => {
            const m = r.period_month
            if(!byMonth[m]) byMonth[m] = { month: m, hours: 0, people: new Set(), cost: 0 }
            byMonth[m].hours += Number(r.work_hours)||0
            byMonth[m].cost += Number(r.total_cost)||0
            byMonth[m].people.add(r.employee_id)
          })
          popupData = MONTH_ORDER.filter(m=>byMonth[m]).map(m=>({...byMonth[m], count: byMonth[m].people.size, avgHrs: byMonth[m].people.size>0?byMonth[m].hours/byMonth[m].people.size:0, costPerHr: byMonth[m].hours>0?byMonth[m].cost/byMonth[m].hours:0}))
          popupCols = [
            { label: 'เดือน', key: 'month', render: r=>r.month },
            { label: 'จำนวนคน', key: 'count', render: r=>fmt(r.count), sortKey: r=>r.count, align:'right' },
            { label: 'ชม.ทำงานรวม', key: 'hours', render: r=>fmt(Math.round(r.hours)), sortKey: r=>r.hours, align:'right' },
            { label: 'เฉลี่ย/คน', key: 'avgHrs', render: r=>r.avgHrs.toFixed(1), sortKey: r=>r.avgHrs, align:'right' },
            { label: 'ต้นทุนรวม', key: 'cost', render: r=>'฿'+fmt(Math.round(r.cost)), sortKey: r=>r.cost, align:'right' },
            { label: 'ต้นทุน/ชม.', key: 'costPerHr', render: r=>'฿'+fmt(Math.round(r.costPerHr)), sortKey: r=>r.costPerHr, align:'right' },
          ]
          break
        }
        case 'employees': {
          popupTitle = `จำนวนพนักงาน ${fmt(uniqueEmp)} คน`
          popupIcon = Users; popupIconBg = 'bg-purple-500'
          popupSummary = `ที่มา: hr_cost_employee JOIN hr_employees · นับ employee_id ที่ไม่ซ้ำกัน (Unique) · filter: ${filterMonth==='all'?'ทุกเดือน':filterMonth}${filterBU!=='all'?' · BU: '+filterBU:''}`
          // Show per-employee aggregate
          const empAgg = {}
          fCostEmp.forEach(r => {
            const uid = r.hr_employee_id; if(!uid) return
            if(!empAgg[uid]) empAgg[uid] = { totalCost: 0, hours: 0, months: 0 }
            empAgg[uid].totalCost += Number(r.total_cost)||0
            empAgg[uid].hours += Number(r.work_hours)||0
            empAgg[uid].months++
          })
          popupData = Object.entries(empAgg).map(([uid, agg]) => {
            const emp = hrById[uid]||{}
            return { ...emp, ...agg, department: deptLookup[emp.department_id]||'-', costPerHr: agg.hours>0?agg.totalCost/agg.hours:0 }
          }).sort((a,b) => b.totalCost - a.totalCost)
          popupCols = [
            { label: 'รหัส', key: 'employee_code', render: r=>r.employee_code||'-' },
            { label: 'ชื่อ-สกุล', key: 'name', render: r=>`${r.prefix_th||''}${r.first_name_th||''} ${r.last_name_th||''}` },
            { label: 'บริษัท', key: 'company_entity', render: r=>r.company_entity||'-' },
            { label: 'BU', key: 'bu', render: r=>r.bu||'-' },
            { label: 'แผนก', key: 'department', render: r=>r.department },
            { label: 'จำนวนเดือน', key: 'months', render: r=>r.months, sortKey: r=>r.months, align:'right' },
            { label: 'ชม.ทำงาน', key: 'hours', render: r=>fmt(Math.round(r.hours)), sortKey: r=>r.hours, align:'right' },
            { label: 'ต้นทุนรวม', key: 'totalCost', render: r=>'฿'+maskCost(r.totalCost), sortKey: r=>r.totalCost, align:'right' },
            { label: 'ต้นทุน/ชม.', key: 'costPerHr', render: r=>'฿'+fmt(Math.round(r.costPerHr)), sortKey: r=>r.costPerHr, align:'right' },
          ]
          break
        }
        case 'costPerHour': {
          popupTitle = `ต้นทุน/ชม. เฉลี่ย ฿${fmt(Math.round(avgCostPerHour))} — แยกตามแผนก`
          popupIcon = BarChart3; popupIconBg = 'bg-amber-500'
          popupSummary = `สูตร: ต้นทุนรวม ÷ ชม.ทำงานรวม = ฿${fmt(Math.round(totalCost))} ÷ ${fmt(Math.round(totalHours))} = ฿${fmt(Math.round(avgCostPerHour))}/ชม. · ที่มา: hr_cost_employee`
          const byDept = {}
          fCostEmp.forEach(r => {
            const uid = r.hr_employee_id; if(!uid) return
            const emp = hrById[uid]
            const dept = emp ? deptLookup[emp.department_id]||'ไม่ระบุ' : r.department||'ไม่ระบุ'
            if(!byDept[dept]) byDept[dept] = { department: dept, cost: 0, hours: 0, people: new Set() }
            byDept[dept].cost += Number(r.total_cost)||0
            byDept[dept].hours += Number(r.work_hours)||0
            byDept[dept].people.add(r.employee_id)
          })
          popupData = Object.values(byDept).map(d=>({...d,count:d.people.size,costPerHr:d.hours>0?d.cost/d.hours:0})).sort((a,b)=>b.costPerHr-a.costPerHr)
          popupCols = [
            { label: 'แผนก', key: 'department', render: r=>r.department },
            { label: 'จำนวนคน', key: 'count', render: r=>fmt(r.count), sortKey: r=>r.count, align:'right' },
            { label: 'ต้นทุนรวม', key: 'cost', render: r=>'฿'+fmt(Math.round(r.cost)), sortKey: r=>r.cost, align:'right' },
            { label: 'ชม.ทำงาน', key: 'hours', render: r=>fmt(Math.round(r.hours)), sortKey: r=>r.hours, align:'right' },
            { label: 'ต้นทุน/ชม.', key: 'costPerHr', render: r=>'฿'+fmt(Math.round(r.costPerHr)), sortKey: r=>r.costPerHr, align:'right' },
          ]
          break
        }
        case 'buList': {
          popupTitle = `จำนวน BU ${buList.length} หน่วย`
          popupIcon = Building2; popupIconBg = 'bg-slate-500'
          popupSummary = `ที่มา: hr_employees (bu field) · BU = Business Unit ที่พนักงานสังกัด`
          const buAgg = {}
          fCostEmp.forEach(r => {
            const uid = r.hr_employee_id; if(!uid) return
            const bu = empBUbyUUID[uid]||'ไม่ระบุ'
            if(!buAgg[bu]) buAgg[bu] = { bu, cost: 0, hours: 0, people: new Set() }
            buAgg[bu].cost += Number(r.total_cost)||0
            buAgg[bu].hours += Number(r.work_hours)||0
            buAgg[bu].people.add(r.employee_id)
          })
          popupData = Object.values(buAgg).map(d=>({...d,count:d.people.size,costPerHr:d.hours>0?d.cost/d.hours:0,pct:totalCost>0?(d.cost/totalCost*100):0})).sort((a,b)=>b.cost-a.cost)
          popupCols = [
            { label: 'BU', key: 'bu', render: r=>r.bu },
            { label: 'จำนวนคน', key: 'count', render: r=>fmt(r.count), sortKey: r=>r.count, align:'right' },
            { label: 'ต้นทุนรวม', key: 'cost', render: r=>'฿'+fmtM(r.cost), sortKey: r=>r.cost, align:'right' },
            { label: 'สัดส่วน', key: 'pct', render: r=>r.pct.toFixed(1)+'%', sortKey: r=>r.pct, align:'right' },
            { label: 'ชม.ทำงาน', key: 'hours', render: r=>fmt(Math.round(r.hours)), sortKey: r=>r.hours, align:'right' },
            { label: 'ต้นทุน/ชม.', key: 'costPerHr', render: r=>'฿'+fmt(Math.round(r.costPerHr)), sortKey: r=>r.costPerHr, align:'right' },
          ]
          break
        }
        case 'products': {
          popupTitle = `Product/Cost Center ${productMap.length} รหัส`
          popupIcon = Layers; popupIconBg = 'bg-pink-500'
          popupSummary = `ที่มา: hr_product_map · แต่ละ Product มีรหัส, ชื่อ, BU ที่สังกัด`
          popupData = productMap.map(p=>{
            const allocCost = fCostAlloc.filter(r=>r.product_code===p.code).reduce((s,r)=>s+(Number(r.amount)||0),0)
            const allocHrs = fHoursAlloc.filter(r=>r.product_code===p.code).reduce((s,r)=>s+(Number(r.hours)||0),0)
            const empCount = new Set(fHoursAlloc.filter(r=>r.product_code===p.code).map(r=>r.employee_id)).size
            return { ...p, allocCost, allocHrs, empCount }
          }).sort((a,b)=>b.allocCost-a.allocCost)
          popupCols = [
            { label: 'รหัส', key: 'code', render: r=>r.code },
            { label: 'ชื่อ Product', key: 'name', render: r=>r.name||'-' },
            { label: 'BU', key: 'bu_name', render: r=>r.bu_name||'-' },
            { label: 'จำนวนคน', key: 'empCount', render: r=>fmt(r.empCount), sortKey: r=>r.empCount, align:'right' },
            { label: 'ชม.จัดสรร', key: 'allocHrs', render: r=>fmt(Math.round(r.allocHrs)), sortKey: r=>r.allocHrs, align:'right' },
            { label: 'ต้นทุนจัดสรร', key: 'allocCost', render: r=>r.allocCost>0?'฿'+fmtM(r.allocCost):'-', sortKey: r=>r.allocCost, align:'right' },
          ]
          break
        }
      }
      return <CostDetailPopup title={popupTitle} icon={popupIcon} iconBg={popupIconBg} data={popupData}
        columns={popupCols} summary={popupSummary} onClose={()=>setCostDetailPopup(null)} />
    })()}

    {/* ===== TAB: CC จัดสรร 2026 ===== */}
    {tab==='ccalloc' && <CcAllocTab
      data={ccAllocRaw}
      loading={ccAllocLoading}
      filterMonth={ccFilterMonth}
      setFilterMonth={setCcFilterMonth}
      filterBU={ccFilterBU}
      setFilterBU={setCcFilterBU}
    />}

  </div>
}

// ---- CC Allocation 2026 Tab Component ----
const CC_MONTH_ORDER = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function CcAllocTab({ data, loading, filterMonth, setFilterMonth, filterBU, setFilterBU }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('direct_cost')
  const [sortAsc, setSortAsc] = useState(false)
  const [viewMode, setViewMode] = useState('summary') // 'summary' | 'detail'

  const months = useMemo(()=>{
    const s = new Set(data.map(r=>r.month))
    return CC_MONTH_ORDER.filter(m=>s.has(m))
  },[data])

  const buGroups = useMemo(()=>{
    const s = new Set(data.map(r=>r.bu_group).filter(Boolean))
    return [...s].sort()
  },[data])

  const filtered = useMemo(()=>{
    let list = data
    if(filterMonth!=='all') list = list.filter(r=>r.month===filterMonth)
    if(filterBU!=='all') list = list.filter(r=>r.bu_group===filterBU)
    if(search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r=>
        (r.employee_name||'').toLowerCase().includes(q) ||
        String(r.employee_code||'').includes(q) ||
        (r.department||'').toLowerCase().includes(q) ||
        (r.cc_group||'').toLowerCase().includes(q)
      )
    }
    return list
  },[data,filterMonth,filterBU,search])

  const totalCost = useMemo(()=>filtered.reduce((s,r)=>s+(r.direct_cost||0),0),[filtered])
  const totalEmp = useMemo(()=>new Set(filtered.map(r=>r.employee_code)).size,[filtered])
  const totalHrs = useMemo(()=>filtered.reduce((s,r)=>s+(r.hours_bu_group||0),0),[filtered])

  // Summary by BU group
  const buSummary = useMemo(()=>{
    const map={}
    filtered.forEach(r=>{
      const bu = r.bu_group||'ไม่ระบุ'
      if(!map[bu]) map[bu]={ bu_group:bu, cost:0, hrs:0, emps:new Set() }
      map[bu].cost += r.direct_cost||0
      map[bu].hrs  += r.hours_bu_group||0
      map[bu].emps.add(r.employee_code)
    })
    return Object.values(map).map(x=>({...x,empCount:x.emps.size})).sort((a,b)=>b.cost-a.cost)
  },[filtered])

  // Monthly summary per BU (pivot)
  const buMonthPivot = useMemo(()=>{
    const map={}
    filtered.forEach(r=>{
      const bu = r.bu_group||'ไม่ระบุ'
      if(!map[bu]) map[bu]={}
      map[bu][r.month] = (map[bu][r.month]||0)+(r.direct_cost||0)
    })
    return Object.entries(map).map(([bu,monthMap])=>({bu,...monthMap}))
      .sort((a,b)=>{
        const sa = Object.values(a).filter(v=>typeof v==='number').reduce((x,y)=>x+y,0)
        const sb = Object.values(b).filter(v=>typeof v==='number').reduce((x,y)=>x+y,0)
        return sb-sa
      })
  },[filtered])

  // Detail rows sorted
  const detailRows = useMemo(()=>{
    const list = [...filtered]
    list.sort((a,b)=>{
      const av = a[sortCol]??0, bv = b[sortCol]??0
      if(typeof av==='number') return sortAsc ? av-bv : bv-av
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return list
  },[filtered,sortCol,sortAsc])

  const toggleSort = col => {
    if(sortCol===col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(false) }
  }

  if(loading) return <div className="text-center py-20 text-gray-400 animate-pulse">กำลังโหลดข้อมูล CC Allocation...</div>

  return <div className="space-y-5">
    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPI icon={<DollarSign className="w-5 h-5"/>} label="ต้นทุนตรงรวม" value={'฿'+fmtM(totalCost)} sub={`${filtered.length} แถว`} color="indigo"/>
      <KPI icon={<Users className="w-5 h-5"/>} label="จำนวนพนักงาน (unique)" value={fmt(totalEmp)} sub="คน" color="cyan"/>
      <KPI icon={<Clock className="w-5 h-5"/>} label="ชั่วโมง BU รวม" value={fmtM(totalHrs)} sub="ชม." color="amber"/>
      <KPI icon={<Calendar className="w-5 h-5"/>} label="เดือนที่มีข้อมูล" value={months.length} sub={filterMonth==='all'?`${months[0]||'-'} – ${months[months.length-1]||'-'}`:filterMonth} color="purple"/>
    </div>

    {/* Filters & View Toggle */}
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">เดือน:</span>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#7DC242]">
            <option value="all">ทั้งหมด</option>
            {months.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">BU:</span>
          <select value={filterBU} onChange={e=>setFilterBU(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#7DC242]">
            <option value="all">ทั้งหมด</option>
            {buGroups.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="ค้นหาพนักงาน / แผนก / CC..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DC242]"/>
        </div>
        <div className="flex gap-1 ml-auto">
          {['summary','pivot','detail'].map(m=>(
            <button key={m} onClick={()=>setViewMode(m)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${viewMode===m?'bg-[#7DC242] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {m==='summary'?'BU สรุป':m==='pivot'?'BU × เดือน':'รายพนักงาน'}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Summary View */}
    {viewMode==='summary' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-[#7DC242]"/>
        <h3 className="font-semibold text-gray-800">สรุปต้นทุนตาม BU Group</h3>
        <span className="ml-auto text-xs text-gray-400">{buSummary.length} BU</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">#</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">BU Group</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">จำนวนคน</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">ชม. BU รวม</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">ต้นทุนตรง (฿)</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">% ของรวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {buSummary.map((r,i)=>(
              <tr key={r.bu_group} className="hover:bg-[#f0fce8]/40">
                <td className="px-5 py-3 text-xs text-gray-400">{i+1}</td>
                <td className="px-5 py-3 font-medium text-gray-800">{r.bu_group}</td>
                <td className="px-5 py-3 text-right text-gray-700">{fmt(r.empCount)}</td>
                <td className="px-5 py-3 text-right text-gray-700 font-mono">{fmtM(r.hrs)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900 font-mono">฿{fmtM(r.cost)}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-[#7DC242] h-1.5 rounded-full" style={{width:`${totalCost>0?(r.cost/totalCost*100):0}%`}}/>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{totalCost>0?(r.cost/totalCost*100).toFixed(1):0}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-[#f0fce8]">
            <tr>
              <td colSpan={2} className="px-5 py-3 text-xs font-bold text-gray-700">รวมทั้งหมด</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900">{fmt(totalEmp)}</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono">{fmtM(totalHrs)}</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono">฿{fmtM(totalCost)}</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>}

    {/* Pivot View: BU × Month */}
    {viewMode==='pivot' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Table2 className="w-5 h-5 text-[#7DC242]"/>
        <h3 className="font-semibold text-gray-800">ต้นทุนตาม BU × เดือน</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">BU Group</th>
              {months.map(m=><th key={m} className="text-right px-3 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{m}</th>)}
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">รวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {buMonthPivot.map(row=>{
              const total=months.reduce((s,m)=>s+(row[m]||0),0)
              return <tr key={row.bu} className="hover:bg-[#f0fce8]/40">
                <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{row.bu}</td>
                {months.map(m=><td key={m} className="px-3 py-2.5 text-right text-gray-600 font-mono text-xs whitespace-nowrap">
                  {row[m]>0?fmtM(row[m]):'-'}
                </td>)}
                <td className="px-4 py-2.5 text-right font-bold text-gray-900 font-mono text-xs whitespace-nowrap">฿{fmtM(total)}</td>
              </tr>
            })}
          </tbody>
          <tfoot className="bg-[#f0fce8]">
            <tr>
              <td className="px-4 py-3 text-xs font-bold text-gray-700">รวม</td>
              {months.map(m=>{
                const tot = filtered.filter(r=>r.month===m).reduce((s,r)=>s+(r.direct_cost||0),0)
                return <td key={m} className="px-3 py-3 text-right font-bold text-gray-900 font-mono text-xs whitespace-nowrap">{tot>0?fmtM(tot):'-'}</td>
              })}
              <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono text-xs whitespace-nowrap">฿{fmtM(totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>}

    {/* Detail View */}
    {viewMode==='detail' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-[#7DC242]"/>
        <h3 className="font-semibold text-gray-800">รายละเอียดรายพนักงาน</h3>
        <span className="ml-auto text-xs text-gray-400">{detailRows.length} รายการ</span>
      </div>
      <div className="overflow-auto max-h-[520px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-8">#</th>
              {[
                {key:'month',label:'เดือน'},
                {key:'employee_code',label:'รหัส'},
                {key:'employee_name',label:'ชื่อพนักงาน'},
                {key:'department',label:'แผนก'},
                {key:'bu_group',label:'BU Group'},
                {key:'cc_group',label:'CC Group'},
                {key:'emp_type',label:'ประเภท'},
                {key:'hours_bu_group',label:'ชม.BU',align:'right'},
                {key:'pct_cost_center',label:'%CC',align:'right'},
                {key:'direct_cost',label:'ต้นทุนตรง',align:'right'},
              ].map(col=>(
                <th key={col.key} onClick={()=>toggleSort(col.key)}
                  className={`${col.align==='right'?'text-right':'text-left'} px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap`}>
                  {col.label}{sortCol===col.key?(sortAsc?' ▲':' ▼'):''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {detailRows.map((r,i)=>(
              <tr key={i} className="hover:bg-[#f0fce8]/40">
                <td className="px-4 py-2 text-xs text-gray-400">{i+1}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{r.month}</td>
                <td className="px-4 py-2 text-xs text-gray-600 font-mono">{r.employee_code}</td>
                <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{r.employee_name}</td>
                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap max-w-[160px] truncate" title={r.department}>{r.department}</td>
                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{r.bu_group||'-'}</td>
                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">{r.cc_group||'-'}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{r.emp_type||'-'}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-gray-600">{r.hours_bu_group!=null?fmtM(r.hours_bu_group):'-'}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-gray-600">{r.pct_cost_center!=null?r.pct_cost_center.toFixed(1)+'%':'-'}</td>
                <td className="px-4 py-2 text-right font-semibold font-mono text-xs text-gray-900">{r.direct_cost>0?'฿'+fmtM(r.direct_cost):'-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>}
  </div>
}

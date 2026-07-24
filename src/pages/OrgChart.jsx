import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import { PageHeader, KPICard, Section } from '../components/PageUI';
import { Building2, Users, GitBranch, Layers, ChevronDown, ChevronRight, User, X } from 'lucide-react';

/* ─── Colors — OA Design System ─────────────────────── */
const LEVEL_COLORS = {
  G12: { bg: 'bg-[#78c045]', text: 'text-white', border: 'border-[#78c045]', label: 'CEO' },
  G11: { bg: 'bg-[#5a9030]', text: 'text-white', border: 'border-[#5a9030]', label: 'C-Level' },
  G10: { bg: 'bg-[#1692dc]', text: 'text-white', border: 'border-[#1692dc]', label: 'C-Level' },
  G9:  { bg: 'bg-[#0d7abf]', text: 'text-white', border: 'border-[#0d7abf]', label: 'Director' },
  G8:  { bg: 'bg-[#00afab]', text: 'text-white', border: 'border-[#00afab]', label: 'Director' },
  G7:  { bg: 'bg-[#f59e0b]', text: 'text-white', border: 'border-[#f59e0b]', label: 'Manager' },
  G6:  { bg: 'bg-[#d97706]', text: 'text-white', border: 'border-[#d97706]', label: 'Manager' },
  G5:  { bg: 'bg-[#8b5cf6]', text: 'text-white', border: 'border-[#8b5cf6]', label: 'Lead' },
  G4:  { bg: 'bg-[#ec4899]', text: 'text-white', border: 'border-[#ec4899]', label: 'Senior' },
  G3:  { bg: 'bg-[#474747]', text: 'text-white', border: 'border-[#474747]', label: 'Staff' },
};
const defaultLvl = { bg: 'bg-gray-400', text: 'text-white', border: 'border-gray-400', label: '' };
const getLvl = (l) => LEVEL_COLORS[l] || defaultLvl;

const DEPT_PALETTE = [
  '#78c045','#1692dc','#00afab','#f59e0b','#ff5252',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316',
  '#5a9030','#0d7abf','#d97706','#7c3aed','#e11d48',
];

/* ─── Company & BU Colors — OA palette ──────────────── */
const CO_COLORS = {
  ONL:   { bg: 'bg-[#f0f9e8]', border: 'border-[#78c045]', text: 'text-[#5a9030]'   },
  ATESS: { bg: 'bg-blue-50',   border: 'border-blue-400',  text: 'text-blue-700'     },
  EFINX: { bg: 'bg-[#e0f5f4]', border: 'border-[#00afab]', text: 'text-[#00afab]'   },
  SMT:   { bg: 'bg-orange-50', border: 'border-orange-400',text: 'text-orange-700'   },
};
const defaultCo = { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' };

const BU_COLOR_MAP = {
  'BU efin.finance': '#78c045',
  'BU Content':      '#1692dc',
  'BU IR Plus':      '#00afab',
  'BU IT Solution':  '#f59e0b',
  'Center':          '#8b5cf6',
  'Cost Center':     '#8b5cf6',
  'ATESS':           '#1692dc',
  'Expert':          '#ec4899',
  'SMT':             '#f97316',
};
const getBUColor = (buName, idx) => BU_COLOR_MAP[buName] || DEPT_PALETTE[idx % DEPT_PALETTE.length];

/* ─── Level Badge ───────────────────────────────────── */
function LevelBadge({ level }) {
  const lv = getLvl(level);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${lv.bg} ${lv.text}`}>
      {level}{lv.label ? ` · ${lv.label}` : ''}
    </span>
  );
}

/* ─── Employee Card ─────────────────────────────────── */
function EmpCard({ emp, lang, compact }) {
  const name = lang === 'th'
    ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()
    : `${emp.first_name_en || emp.first_name_th || ''} ${emp.last_name_en || emp.last_name_th || ''}`.trim();
  const nick = emp.nickname;
  const pos = lang === 'th' ? (emp.position_th || emp.position_en || '') : (emp.position_en || emp.position_th || '');
  const lv = getLvl(emp.level);
  const lvNum = parseInt((emp.level || '').replace('G', '')) || 0;
  const isExec = lvNum >= 9;
  const isProb = emp.status === 'probation';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded border-l-3 ${lv.border} bg-white hover:bg-gray-50 transition ${isProb ? 'border-dashed opacity-80' : ''}`}>
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-gray-800 truncate">
            {name}{nick ? ` (${nick})` : ''}
            {isProb && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded">ทดลองงาน</span>}
          </div>
          <div className="text-[10px] text-gray-400 truncate">{pos}</div>
        </div>
        <LevelBadge level={emp.level} />
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 ${lv.border} bg-white shadow-sm hover:shadow-md transition p-3 ${isExec ? 'ring-2 ring-amber-200' : ''} ${isProb ? 'border-dashed opacity-85' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${isExec ? 'bg-amber-100' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
          <User className={`w-5 h-5 ${isExec ? 'text-amber-600' : 'text-gray-500'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-sm font-semibold text-gray-900">{name}</div>
            {isProb && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">ทดลองงาน</span>}
          </div>
          {nick && <div className="text-xs text-gray-400">({nick})</div>}
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">{pos}</div>
          <div className="mt-1.5"><LevelBadge level={emp.level} /></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Department Section ────────────────────────────── */
function DeptSection({ dept, emps, lang, color, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const head = emps[0];
  const headName = lang === 'th'
    ? `${head?.first_name_th || ''} ${head?.last_name_th || ''}${head?.nickname ? ' (' + head.nickname + ')' : ''}`.trim()
    : `${head?.first_name_en || head?.first_name_th || ''} ${head?.last_name_en || head?.last_name_th || ''}${head?.nickname ? ' (' + head.nickname + ')' : ''}`.trim();

  return (
    <div
      className={`rounded-xl border-2 transition cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow'}`}
      onClick={() => onSelect(dept)}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-gray-900 truncate">{dept}</div>
          <div className="text-xs text-gray-500 truncate">{headName}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold" style={{ color }}>{emps.length}</div>
          <div className="text-[10px] text-gray-400">{lang === 'th' ? 'คน' : 'emp'}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel ──────────────────────────────────── */
function OrgDetailPanel({ deptName, emps, lang, color, onClose, groupBy = 'level', deptMap = {} }) {
  // Group by level
  const levelGroups = useMemo(() => {
    if (groupBy !== 'level') return [];
    const groups = {};
    emps.forEach(emp => {
      const lvl = emp.level || 'N/A';
      if (!groups[lvl]) groups[lvl] = [];
      groups[lvl].push(emp);
    });
    // Sort levels descending
    return Object.entries(groups).sort((a, b) => {
      const numA = parseInt(a[0].replace('G', '')) || 0;
      const numB = parseInt(b[0].replace('G', '')) || 0;
      return numB - numA;
    });
  }, [emps, groupBy]);

  // Group by department
  const deptGroups = useMemo(() => {
    if (groupBy !== 'department') return [];
    const groups = {};
    emps.forEach(emp => {
      const name = emp.department_name_th || (lang === 'th' ? 'ไม่ระบุแผนก' : 'Unassigned');
      if (!groups[name]) groups[name] = [];
      groups[name].push(emp);
    });
    // Sort employees within each dept by level descending
    Object.values(groups).forEach(arr => {
      arr.sort((a, b) => {
        const la = parseInt((a.level || '').replace('G', '')) || 0;
        const lb = parseInt((b.level || '').replace('G', '')) || 0;
        return lb - la;
      });
    });
    // Sort departments by highest-level employee, then by headcount
    return Object.entries(groups).sort((a, b) => {
      const aUnassigned = a[0].includes('ไม่ระบุ') || a[0] === 'Unassigned';
      const bUnassigned = b[0].includes('ไม่ระบุ') || b[0] === 'Unassigned';
      if (aUnassigned && !bUnassigned) return 1;
      if (!aUnassigned && bUnassigned) return -1;
      const maxA = parseInt((a[1][0]?.level || '').replace('G', '')) || 0;
      const maxB = parseInt((b[1][0]?.level || '').replace('G', '')) || 0;
      if (maxB !== maxA) return maxB - maxA;
      return b[1].length - a[1].length;
    });
  }, [emps, groupBy, deptMap, lang]);

  const groups = groupBy === 'department' ? deptGroups : levelGroups;
  const groupLabel = groupBy === 'department'
    ? (lang === 'th' ? 'ฝ่ายงาน' : 'departments')
    : (lang === 'th' ? 'ระดับ' : 'levels');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 text-white relative" style={{ backgroundColor: color }}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-bold pr-8">{deptName}</h3>
        <div className="flex gap-4 mt-2 text-sm opacity-90">
          <span>{emps.length} {lang === 'th' ? 'คน' : 'employees'}</span>
          <span>{groups.length} {groupLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {groups.map(([groupName, groupEmps]) => {
          if (groupBy === 'department') {
            return (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Building2 className="w-3 h-3 mr-1" />
                    {groupName}
                  </span>
                  <span className="text-xs text-gray-400">{groupEmps.length} {lang === 'th' ? 'คน' : ''}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="space-y-1.5 pl-2">
                  {groupEmps.map(emp => <EmpCard key={emp.id} emp={emp} lang={lang} compact />)}
                </div>
              </div>
            );
          }
          const lv = getLvl(groupName);
          return (
            <div key={groupName}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${lv.bg} ${lv.text}`}>
                  {groupName} · {lv.label}
                </span>
                <span className="text-xs text-gray-400">{groupEmps.length} {lang === 'th' ? 'คน' : ''}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-1.5 pl-2">
                {groupEmps.map(emp => <EmpCard key={emp.id} emp={emp} lang={lang} compact />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── CEO Card ──────────────────────────────────────── */
function CEOCard({ emp, lang }) {
  if (!emp) return null;
  const name = lang === 'th'
    ? `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim()
    : `${emp.first_name_en || emp.first_name_th || ''} ${emp.last_name_en || emp.last_name_th || ''}`.trim();
  const pos = lang === 'th' ? (emp.position_th || '') : (emp.position_en || emp.position_th || '');

  return (
    <div className="flex justify-center mb-2">
      <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl p-4 shadow-lg text-center min-w-64 max-w-sm">
        <div className="w-14 h-14 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
          <User className="w-7 h-7 text-white" />
        </div>
        <div className="text-white font-bold text-base">{name}</div>
        {emp.nickname && <div className="text-amber-100 text-xs">({emp.nickname})</div>}
        <div className="text-amber-100 text-xs mt-1">{pos}</div>
        <LevelBadge level={emp.level} />
      </div>
    </div>
  );
}

/* ─── C-Level Row ───────────────────────────────────── */
function CLevelRow({ emps, lang }) {
  if (!emps.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-4">
      {emps.map(emp => (
        <div key={emp.id} className="bg-white rounded-lg border-2 border-red-400 p-3 shadow-sm text-center min-w-48 max-w-56">
          <div className="w-10 h-10 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-1">
            <User className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {lang === 'th' ? `${emp.first_name_th} ${emp.last_name_th}` : `${emp.first_name_en || emp.first_name_th} ${emp.last_name_en || emp.last_name_th}`}
          </div>
          {emp.nickname && <div className="text-xs text-gray-400">({emp.nickname})</div>}
          <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{lang === 'th' ? emp.position_th : (emp.position_en || emp.position_th)}</div>
          <div className="mt-1"><LevelBadge level={emp.level} /></div>
        </div>
      ))}
    </div>
  );
}

/* ─── Dept List Item (for list view) ────────────────── */
function DeptListItem({ deptName, data, color, lang }) {
  const [open, setOpen] = useState(false);

  const sortedLevels = useMemo(() => {
    const levelGroups = {};
    data.employees.forEach(emp => {
      const lvl = emp.level || 'N/A';
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(emp);
    });
    return Object.entries(levelGroups).sort((a, b) => {
      const na = parseInt(a[0].replace('G', '')) || 0;
      const nb = parseInt(b[0].replace('G', '')) || 0;
      return nb - na;
    });
  }, [data.employees]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition text-left"
      >
        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">{deptName}</div>
          <div className="text-xs text-gray-400">
            {data.employees[0]?.first_name_th} {data.employees[0]?.last_name_th}{data.employees[0]?.nickname ? ` (${data.employees[0].nickname})` : ''}
          </div>
        </div>
        <div className="text-lg font-bold" style={{ color }}>{data.employees.length}</div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {sortedLevels.map(([level, lvlEmps]) => {
            const lv = getLvl(level);
            return (
              <div key={level}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lv.bg} ${lv.text}`}>
                    {level} · {lv.label}
                  </span>
                  <span className="text-[10px] text-gray-400">{lvlEmps.length} {lang === 'th' ? 'คน' : ''}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-2">
                  {lvlEmps.map(emp => <EmpCard key={emp.id} emp={emp} lang={lang} compact />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── BU Org Tree Diagram ─────────────────────────────── */
function BUOrgTree({ buTreeData, selectedBU, setSelectedBU, filtered, deptMap, lang }) {
  const NW = 152;
  const CO_H = 58;
  const BU_H = 78;
  const DP_H = 52;
  const H_GAP = 24;
  const BU_STEP = NW + H_GAP;

  return (
    <div className="space-y-6">
      {buTreeData.map(({ company, total, bus }) => {
        const coCfg = CO_COLORS[company] || defaultCo;
        const n = Math.max(bus.length, 1);
        const W = Math.max(NW + 80, n * BU_STEP + H_GAP);
        const leftOffset = (W - n * BU_STEP + H_GAP) / 2;
        const bX  = (i) => leftOffset + i * BU_STEP;
        const bCX = (i) => bX(i) + NW / 2;
        const coCX = W / 2;
        const railY  = CO_H + 18;
        const BU_TOP = CO_H + 38;
        const maxD   = Math.max(...bus.map(b => b.depts.length), 0);
        const DP_START = BU_TOP + BU_H + 26;
        const DP_STEP  = DP_H + 6;
        const svgH = maxD > 0 ? DP_START + maxD * DP_STEP + 20 : BU_TOP + BU_H + 20;

        return (
          <div key={company}>
            <div className="org-hscroll pb-2">
              <div className="relative mx-auto" style={{ width: W, height: svgH }}>

                {/* SVG connector lines */}
                <svg className="absolute inset-0 pointer-events-none" width={W} height={svgH}>
                  <line x1={coCX} y1={CO_H} x2={coCX} y2={railY} stroke="#cbd5e1" strokeWidth={2} />
                  {n > 1 && <line x1={bCX(0)} y1={railY} x2={bCX(n-1)} y2={railY} stroke="#cbd5e1" strokeWidth={2} />}
                  {bus.map((_, i) => (
                    <line key={i} x1={bCX(i)} y1={railY} x2={bCX(i)} y2={BU_TOP} stroke="#cbd5e1" strokeWidth={2} />
                  ))}
                  {bus.map((bu, i) => {
                    if (!bu.depts.length) return null;
                    const cx = bCX(i);
                    return (
                      <g key={`d${i}`}>
                        <line x1={cx} y1={BU_TOP + BU_H} x2={cx} y2={DP_START} stroke="#e2e8f0" strokeWidth={1.5} />
                        {bu.depts.length > 1 && (
                          <line
                            x1={cx} y1={DP_START + DP_H / 2}
                            x2={cx} y2={DP_START + (bu.depts.length - 1) * DP_STEP + DP_H / 2}
                            stroke="#e2e8f0" strokeWidth={1.5}
                          />
                        )}
                        {bu.depts.map((_, di) => {
                          const dy = DP_START + di * DP_STEP + DP_H / 2;
                          return <line key={di} x1={bX(i)} y1={dy} x2={cx} y2={dy} stroke="#e2e8f0" strokeWidth={1.5} />;
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Company Node */}
                <div
                  className={`absolute rounded-xl border-2 p-3 text-center shadow-sm ${coCfg.bg} ${coCfg.border}`}
                  style={{ left: (W - NW) / 2, top: 0, width: NW }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${coCfg.text}`} />
                    <span className={`text-sm font-bold ${coCfg.text}`}>{company}</span>
                  </div>
                  <div className={`text-xs ${coCfg.text} opacity-70`}>
                    {total} {lang === 'th' ? 'คน' : 'emp'}
                  </div>
                </div>

                {/* BU Nodes */}
                {bus.map((bu, i) => {
                  const buColor = getBUColor(bu.bu, i);
                  const buKey = `${company}__${bu.bu}`;
                  const isSel = selectedBU === buKey;
                  return (
                    <div
                      key={bu.bu}
                      className="absolute rounded-xl bg-white p-3 text-center cursor-pointer transition hover:shadow-lg"
                      style={{
                        left: bX(i), top: BU_TOP, width: NW,
                        border: `2px solid ${buColor}`,
                        boxShadow: isSel ? `0 0 0 3px ${buColor}50, 0 4px 14px rgba(0,0,0,.12)` : undefined,
                      }}
                      onClick={() => setSelectedBU(prev => prev === buKey ? null : buKey)}
                    >
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                        style={{ background: buColor + '18' }}
                      >
                        <GitBranch className="w-5 h-5" style={{ color: buColor }} />
                      </div>
                      <div className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{bu.bu}</div>
                      <div className="text-xs font-semibold mt-1" style={{ color: buColor }}>
                        {bu.total} {lang === 'th' ? 'คน' : 'emp'}
                      </div>
                    </div>
                  );
                })}

                {/* Dept Nodes */}
                {bus.map((bu, i) =>
                  bu.depts.map((dept, di) => {
                    const buColor = getBUColor(bu.bu, i);
                    return (
                      <div
                        key={`${bu.bu}_${dept.dept}_${di}`}
                        className="absolute rounded-lg bg-white px-2 py-1.5 text-center"
                        style={{
                          left: bX(i),
                          top: DP_START + di * DP_STEP,
                          width: NW,
                          border: '1px solid #e2e8f0',
                          borderLeft: `3px solid ${buColor}`,
                        }}
                      >
                        <div className="text-[11px] text-gray-700 leading-tight line-clamp-2 px-0.5">
                          {dept.dept}
                        </div>
                        <div className="text-xs font-bold mt-0.5" style={{ color: buColor }}>
                          {dept.count}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Employee detail panel */}
            {selectedBU && selectedBU.startsWith(company + '__') && (() => {
              const buName = selectedBU.slice((company + '__').length);
              const buIdx = bus.findIndex(b => b.bu === buName);
              const buColor = getBUColor(buName, buIdx >= 0 ? buIdx : 0);
              const buEmps = filtered.filter(e =>
                (e.company_entity || (lang === 'th' ? 'ไม่ระบุ' : 'Other')) === company &&
                (e.bu || (lang === 'th' ? 'ไม่ระบุ BU' : 'Unassigned')) === buName
              );
              return (
                <div className="mt-3">
                  <OrgDetailPanel
                    deptName={`${company} › ${buName}`}
                    emps={buEmps}
                    lang={lang}
                    color={buColor}
                    onClose={() => setSelectedBU(null)}
                    groupBy="department"
                    deptMap={deptMap}
                  />
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Department Org Chart — G-level band layout ─── */
function DeptOrgChart({ deptName, employees, lang }) {
  const FF      = "'FC Minimal', sans-serif";
  const BW      = 148, BH = 72, HG = 24, VG = 48;
  const ROW_MAX = 8;    // max boxes per visual sub-row within a band
  const PAD     = 16;   // outer padding
  const LBL_W   = 56;   // left gutter width for G-level label

  /* name lookup: nickname AND first_name_th → employee
     (one_down บางคนใช้ชื่อจริง เช่น "ดรุณี" แทน nickname "ณี") */
  const nameMap = useMemo(() => {
    const m = {};
    employees.forEach(e => { if (e.first_name_th) m[e.first_name_th] = e; });
    employees.forEach(e => { if (e.nickname)      m[e.nickname]      = e; });
    return m;
  }, [employees]);

  /* Group employees by G-level number */
  const levelGroups = useMemo(() => {
    const groups = {};
    employees.forEach(e => {
      const n = parseInt((e.level || '').replace('G', '')) || 0;
      if (!groups[n]) groups[n] = [];
      groups[n].push(e);
    });
    return groups;
  }, [employees]);

  /* G-levels sorted descending (highest G at top) */
  const sortedLevels = useMemo(() =>
    Object.keys(levelGroups).map(Number).sort((a, b) => b - a),
    [levelGroups]
  );

  /* Positions, bandRanges, and SVG size — two-pass approach:
     Pass 1 : compute svgW from widest row.
     Pass 2 : place bands top→bottom; within each band, employees are
              grouped by direct manager (GROUP_GAP between groups) so that
              connector lines never pass visually through another manager's box. */
  const GROUP_GAP  = 40;                         // px gap between manager-groups in same band
  const ROW_VG     = 14;                         // compact vertical gap between staggered sub-rows
  const STAGGER_X  = Math.round((BW + HG) / 2); // 86px: horizontal offset for odd sub-rows ("brick" layout)

  const { positions, bandRanges, svgW, svgH } = useMemo(() => {

    /* Build sorted manager-groups for one band given already-placed pos */
    const buildGroups = (emps, pos) => {
      const map = new Map();
      emps.forEach(e => {
        const mgr = e.one_down ? nameMap[e.one_down] : null;
        const key = mgr ? mgr.id : '__none';
        if (!map.has(key)) map.set(key, { mgr, list: [] });
        map.get(key).list.push(e);
      });
      return [...map.values()]
        .sort((a, b) => {
          const cxA = (a.mgr && pos[a.mgr.id]) ? pos[a.mgr.id].cx : Infinity;
          const cxB = (b.mgr && pos[b.mgr.id]) ? pos[b.mgr.id].cx : Infinity;
          if (cxA !== cxB) return cxA - cxB;
          const gA = a.mgr ? (parseInt((a.mgr.level || '').replace('G', '')) || 0) : 0;
          const gB = b.mgr ? (parseInt((b.mgr.level || '').replace('G', '')) || 0) : 0;
          return gB - gA;
        })
        .map(g => {
          g.list.sort((a, b) => (a.first_name_th || '').localeCompare(b.first_name_th || ''));
          return g;
        });
    };

    /* ── Pass 1: widest row → contentW ── */
    let maxRowW = 0;
    sortedLevels.forEach(level => {
      const emps = levelGroups[level] || [];
      const nRows = Math.ceil(emps.length / ROW_MAX);
      for (let r = 0; r < nRows; r++) {
        const cnt  = Math.min(ROW_MAX, emps.length - r * ROW_MAX);
        const rowW = cnt * BW + Math.max(0, cnt - 1) * HG;
        if (rowW > maxRowW) maxRowW = rowW;
      }
    });
    const contentW = maxRowW;
    const calcSvgW = Math.max(900, contentW + LBL_W + PAD * 2 + 20);

    /* ── Pass 2: place grouped blocks, one band at a time ── */
    const pos    = {};
    const ranges = {};
    let y = PAD;

    sortedLevels.forEach(level => {
      const rawEmps    = levelGroups[level] || [];
      const groups     = buildGroups(rawEmps, pos);
      const bandStartY = y;

      if (groups.length === 0) {
        ranges[level] = { y: bandStartY - 6, h: BH + 22 };
        y += BH + VG + 18;
        return;
      }

      /* width of each group (single-row; dept charts rarely exceed ROW_MAX) */
      const gWidths = groups.map(g =>
        Math.min(g.list.length, ROW_MAX) * BW
        + Math.max(0, Math.min(g.list.length, ROW_MAX) - 1) * HG
      );
      const totalW = gWidths.reduce((s, w) => s + w, 0)
                   + Math.max(0, groups.length - 1) * GROUP_GAP;

      /* centre the whole band within contentW */
      let x = LBL_W + PAD + Math.round((contentW - totalW) / 2);
      if (x < LBL_W + PAD) x = LBL_W + PAD;

      let maxBandY = y;

      groups.forEach((g, gi) => {
        if (gi > 0) x += GROUP_GAP;
        const list  = g.list;
        const nRows = Math.ceil(list.length / ROW_MAX);
        let gy      = y;
        const groupStartX = x;

        for (let r = 0; r < nRows; r++) {
          const rowEmps = list.slice(r * ROW_MAX, (r + 1) * ROW_MAX);
          /* odd rows are shifted right by STAGGER_X ("brick" pattern) */
          const xOff = r % 2 === 1 ? STAGGER_X : 0;
          let rx = groupStartX + xOff;
          rowEmps.forEach(e => {
            pos[e.id] = { x: rx, y: gy, cx: rx + BW / 2 };
            rx += BW + HG;
          });
          if (r === 0) x = rx; // advance group-end x using first row
          if (r < nRows - 1) gy += BH + ROW_VG; // compact gap between sub-rows
        }
        maxBandY = Math.max(maxBandY, gy);
      });

      y = maxBandY + BH + VG;
      ranges[level] = { y: bandStartY - 6, h: (y - bandStartY) - VG + 16 };
      y += 18;
    });

    const vals     = Object.values(pos);
    const calcSvgH = !vals.length ? 200
      : Math.max(160, Math.max(...vals.map(p => p.y + BH)) + PAD + 24);

    return { positions: pos, bandRanges: ranges, svgW: calcSvgW, svgH: calcSvgH };
  }, [sortedLevels, levelGroups, nameMap]);

  /* box fill/stroke based on level + status */
  const bStyle = (level, status) => {
    const n    = parseInt((level || '').replace('G', '')) || 0;
    const prob = status === 'probation';
    if (n >= 8) return { fill: '#1a1a1a', stroke: prob ? '#f59e0b' : '#1a1a1a', sw: prob ? 2.5 : 1.5, tf: '#fff',    nf: '#9a9a9a', dash: prob ? '5 3' : null };
    if (n >= 6) return { fill: '#78c045', stroke: prob ? '#f59e0b' : '#5a9030', sw: prob ? 2.5 : 1.2, tf: '#fff',    nf: '#d4edba', dash: prob ? '5 3' : null };
    return             { fill: prob ? '#fffbeb' : '#fff', stroke: prob ? '#f59e0b' : '#d0e8c8', sw: prob ? 2 : 1.0, tf: '#333333', nf: '#888888', dash: prob ? '5 3' : null };
  };

  const splitName = name => {
    if (!name) return ['', ''];
    const p = name.split(' ');
    return p.length === 1 ? [name, ''] : [p[0], p.slice(1).join(' ')];
  };
  /* split position title into at most 2 lines; prefer word boundary (space) */
  const wrapPos = (s, maxPer = 22) => {
    if (!s) return [];
    if (s.length <= maxPer) return [s];
    const bp = s.lastIndexOf(' ', maxPer);
    if (bp > 4) return [s.slice(0, bp), s.slice(bp + 1, bp + 1 + maxPer)];
    return [s.slice(0, maxPer), s.slice(maxPer, maxPer * 2)];
  };

  if (!employees.length) return (
    <div className="text-center py-12 text-gray-400 text-sm">ไม่มีข้อมูลพนักงานในฝ่ายนี้</div>
  );

  const activeCount = employees.filter(e => e.status === 'active').length;
  const probCount   = employees.filter(e => e.status === 'probation').length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white"
         style={{ boxShadow: 'rgba(0,0,0,0.05) 0px 10px 20px 0px' }}>
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
        <Building2 className="w-4 h-4 text-[#78c045]" />
        <span className="text-sm font-bold" style={{ color: '#333333', fontFamily: FF }}>{deptName}</span>
        <span className="text-xs text-gray-400 ml-1">
          {activeCount} คน{probCount > 0 ? ` · ทดลองงาน ${probCount} คน` : ''}
        </span>
      </div>

      {/* Scrollable canvas — always-visible horizontal scrollbar styled via index.css .org-hscroll */}
      <div className="org-hscroll">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          xmlns="http://www.w3.org/2000/svg"
          fontFamily={FF}
          style={{ display: 'block' }}
        >
          {/* ── G-level band backgrounds + labels ── */}
          {sortedLevels.map(level => {
            const rng = bandRanges[level];
            if (!rng) return null;
            const n    = level;
            const fill = n >= 8 ? '#1a1a1a' : n >= 6 ? '#78c045' : '#f4faf0';
            const lc   = n >= 6 ? '#fff'    : '#4a7c2a';
            const bg   = n >= 8 ? 'rgba(26,26,26,0.04)' : n >= 6 ? 'rgba(120,192,69,0.07)' : 'rgba(120,192,69,0.03)';
            return (
              <g key={`band_${level}`}>
                <rect x={PAD} y={rng.y} width={svgW - PAD * 2} height={rng.h}
                  fill={bg} rx={10} />
                {/* G-level label pill */}
                <rect x={PAD + 4} y={rng.y + rng.h / 2 - 13} width={44} height={26} rx={8} fill={fill} />
                <text x={PAD + 26} y={rng.y + rng.h / 2 + 5}
                  textAnchor="middle" fontSize={12} fontWeight={800} fill={lc}
                >G{level}</text>
              </g>
            );
          })}

          {/* ── Connector lines — elbow from manager bottom → report top ── */}
          {employees.map(emp => {
            if (!emp.one_down || !nameMap[emp.one_down]) return null;
            const par = nameMap[emp.one_down];
            const pp  = positions[par.id];
            const cp  = positions[emp.id];
            if (!pp || !cp) return null;
            /* exit bottom-centre of parent, enter top-centre of child */
            const x1 = pp.cx,       y1 = pp.y + BH + 2;
            const x2 = cp.cx,       y2 = cp.y - 2;
            const hy = y1 + 16; /* elbow turns just below parent box — keeps branch visually at parent level */
            const sameX = Math.abs(x1 - x2) < 2;
            const d = sameX
              ? `M${x1},${y1} L${x2},${y2}`
              : `M${x1},${y1} L${x1},${hy} L${x2},${hy} L${x2},${y2}`;
            return (
              <path key={`ln_${emp.id}`}
                d={d}
                stroke="#8ec94f" strokeWidth={1.8} fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
            );
          })}

          {/* ── Employee boxes ── */}
          {employees.map(emp => {
            const p = positions[emp.id];
            if (!p) return null;
            const { x, y } = p;
            const cfg = bStyle(emp.level, emp.status);
            const fullName = (`${emp.first_name_th || ''} ${emp.last_name_th || ''}`).trim()
                          || (`${emp.first_name_en || ''} ${emp.last_name_en || ''}`).trim();
            const [n1, n2] = splitName(fullName);
            const title = lang === 'th'
              ? (emp.position_th || emp.position_en || '')
              : (emp.position_en || emp.position_th || '');
            const titleW = wrapPos(title);
            const lines = [
              { text: n1,       bold: true,  color: cfg.tf, size: 10.5 },
              n2          ? { text: n2,        bold: true,  color: cfg.tf, size: 10.5 } : null,
              titleW[0]   ? { text: titleW[0], bold: false, color: cfg.nf, size: 9.0  } : null,
              titleW[1]   ? { text: titleW[1], bold: false, color: cfg.nf, size: 9.0  } : null,
            ].filter(Boolean);
            const LINE_H = 13;
            const textH  = lines.length * LINE_H;
            /* center text vertically; shift down slightly if probation badge present */
            const topOffset = emp.status === 'probation' ? 8 : 0;
            const sy = y + Math.max((BH - textH) / 2, topOffset + 6) + LINE_H / 2;

            return (
              <g key={emp.id}>
                <rect x={x} y={y} width={BW} height={BH} rx={10}
                  fill={cfg.fill} stroke={cfg.stroke} strokeWidth={cfg.sw}
                  strokeDasharray={cfg.dash || undefined} />
                {lines.map((ln, li) => (
                  <text key={li}
                    x={x + BW / 2} y={sy + li * LINE_H}
                    textAnchor="middle"
                    fontSize={ln.size} fontWeight={ln.bold ? 700 : 400}
                    fill={ln.color}
                  >{ln.text}</text>
                ))}
                {/* Probation badge corner */}
                {emp.status === 'probation' && (
                  <g>
                    <rect x={x + BW - 34} y={y + 5} width={30} height={14} rx={4} fill="#f59e0b" opacity={0.9} />
                    <text x={x + BW - 19} y={y + 15.5} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#fff">ทดลองงาน</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-100 flex flex-wrap gap-4 justify-center">
        {[
          { fill: '#1a1a1a', label: 'G8+ ผู้บริหาร' },
          { fill: '#78c045', label: 'G6–7 ผู้จัดการ' },
          { fill: '#ffffff', label: 'G5↓ พนักงาน',   stroke: '#d0e8c8' },
          { fill: '#fffbeb', label: 'ทดลองงาน',       stroke: '#f59e0b', dash: '4 2' },
        ].map(({ fill, label, stroke, dash }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width={14} height={14}>
              <rect x={1} y={1} width={12} height={12} rx={3}
                fill={fill} stroke={stroke || fill} strokeWidth={1}
                strokeDasharray={dash || undefined} />
            </svg>
            <span className="text-[11px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────── */
export default function OrgChart({ lang }) {
  const { filterByCompany } = useCompanyFilter();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // chart | list | bu | tree | dept_org
  const [selectedBU, setSelectedBU] = useState(null);
  const [collapsedCos, setCollapsedCos] = useState(new Set());
  const [selectedOrgDept, setSelectedOrgDept] = useState(null);

  const t = {
    title: lang === 'th' ? 'โครงสร้างองค์กร' : 'Organization Chart',
    empCount: lang === 'th' ? 'จำนวนพนักงาน' : 'Total Employees',
    deptCount: lang === 'th' ? 'แผนก/ฝ่าย' : 'Departments',
    levelCount: lang === 'th' ? 'ระดับตำแหน่ง' : 'Job Grades',
    buCount: lang === 'th' ? 'Business Unit' : 'Business Units',
    cLevel: lang === 'th' ? 'บอร์ดบริหาร' : 'Executive Board',
    seniorExecs: lang === 'th' ? 'บอร์ดบริหาร' : 'Executive Board',
    loading: lang === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading...',
    chartView: lang === 'th' ? 'บริษัท/ฝ่าย' : 'Dept View',
    listView: lang === 'th' ? 'รายชื่อ' : 'List View',
    buView: lang === 'th' ? 'โครงสร้าง BU' : 'BU Structure',
    treeView: lang === 'th' ? 'แผนผังองค์กร' : 'Tree Diagram',
    selectDept: lang === 'th' ? 'เลือกแผนกเพื่อดูรายละเอียดพนักงาน' : 'Select a department to view employees',
    selectBU: lang === 'th' ? 'เลือก BU เพื่อดูรายละเอียดพนักงาน' : 'Select a BU to view employees',
    allDepts: lang === 'th' ? 'แผนกทั้งหมด' : 'All Departments',
    allBUs: lang === 'th' ? 'Business Unit ทั้งหมด' : 'All Business Units',
    deptOrgView: lang === 'th' ? 'ผังองค์กรฝ่าย' : 'Dept Org Chart',
    selectDeptOrg: lang === 'th' ? 'เลือกฝ่ายที่ต้องการดูผัง' : 'Select department to view org chart',
  };

  // Fetch data
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [empRes, deptRes] = await Promise.all([
          supabase.from('hr_employees')
            .select('id,employee_code,first_name_th,last_name_th,first_name_en,last_name_en,nickname,position_th,position_en,level,department_id,department_name_th,bu,status,company_entity,one_down')
            .in('status', ['active', 'probation'])
            .order('level', { ascending: false }),
          supabase.from('hr_departments').select('id,name_th,name_en,parent_id')
        ]);
        if (empRes.error) throw empRes.error;
        if (deptRes.error) throw deptRes.error;
        setEmployees(empRes.data || []);
        setDepartments(deptRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Filtered employees
  const filtered = useMemo(() => filterByCompany(employees), [employees, filterByCompany]);

  // Build dept map
  const deptMap = useMemo(() => {
    const map = {};
    departments.forEach(d => { map[d.id] = d; });
    return map;
  }, [departments]);

  // CEO, C-level (G10+), and Senior Executives (G9)
  const { ceo, cLevel, seniorExecs } = useMemo(() => {
    let ceo = null;
    const cLevel = [];
    const seniorExecs = [];
    filtered.forEach(emp => {
      const num = parseInt((emp.level || '').replace('G', '')) || 0;
      if (num >= 12) ceo = emp;
      else if (num >= 10) cLevel.push(emp);
      else if (num === 9) {
        const pos = (emp.position_th || '') + ' ' + (emp.position_en || '');
        if (/Head|ผู้อำนวยการ|บรรณาธิการบริหาร|Executive Editor/i.test(pos)) seniorExecs.push(emp);
      }
    });
    return { ceo, cLevel, seniorExecs };
  }, [filtered]);

  // Group by department — use department_name_th directly (department_id may be null)
  const deptGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(emp => {
      const deptName = emp.department_name_th || (lang === 'th' ? 'ไม่ระบุแผนก' : 'Unassigned');

      if (!groups[deptName]) groups[deptName] = { employees: [] };
      groups[deptName].employees.push(emp);
    });

    // Sort employees within each dept by level descending
    Object.values(groups).forEach(g => {
      g.employees.sort((a, b) => {
        const la = parseInt((a.level || '').replace('G', '')) || 0;
        const lb = parseInt((b.level || '').replace('G', '')) || 0;
        return lb - la;
      });
    });

    // Sort departments by headcount descending
    const sorted = Object.entries(groups).sort((a, b) => {
      // Put highest-level employee's dept first
      const maxA = parseInt((a[1].employees[0]?.level || '').replace('G', '')) || 0;
      const maxB = parseInt((b[1].employees[0]?.level || '').replace('G', '')) || 0;
      if (maxB !== maxA) return maxB - maxA;
      return b[1].employees.length - a[1].employees.length;
    });

    return sorted;
  }, [filtered, lang]);

  // Build BU Head map from ALL employees (cross-BU heads like สมบัติศิริ who heads Atess but is in BU IT Solution - MOL)
  const buHeadMap = useMemo(() => {
    const map = {};
    filtered.forEach(emp => {
      const pos = emp.position_th || '';
      // Split by comma to handle multiple titles like "Head BU IT Solution , Head BU Atess"
      const parts = pos.split(/[,，]/);
      parts.forEach(part => {
        const trimmed = part.trim();
        // Match "Head BU X" pattern
        const headBuMatch = trimmed.match(/Head\s+BU\s+(.+)/i);
        if (headBuMatch) {
          const buTarget = headBuMatch[1].trim().replace(/\s+and\s+.*/i, ''); // remove "and ..." suffix
          // Store with "BU " prefix (as it appears in emp.bu field) and without
          map['BU ' + buTarget] = emp;
          map[buTarget] = emp;
          // Also lowercase versions
          map[('BU ' + buTarget).toLowerCase()] = emp;
          map[buTarget.toLowerCase()] = emp;
        }
        // Match "Head Center" / "Head Cost Center"
        if (/Head\s+(Cost\s+)?Center/i.test(trimmed)) {
          map['Cost Center'] = emp;
          map['cost center'] = emp;
          map['Center'] = emp;
          map['center'] = emp;
        }
        // Match "Head Team IT Dev efin.finance" etc.
        const headTeamMatch = trimmed.match(/Head\s+Team\s+(.+)/i);
        if (headTeamMatch) {
          const teamTarget = headTeamMatch[1].trim();
          map[teamTarget] = emp;
          map[teamTarget.toLowerCase()] = emp;
        }
      });
    });
    return map;
  }, [filtered]);

  // Group by BU
  const buGroups = useMemo(() => {
    const groups = {};
    filtered.forEach(emp => {
      const buName = emp.bu || (lang === 'th' ? 'ไม่ระบุ BU' : 'Unassigned');
      if (!groups[buName]) groups[buName] = { employees: [] };
      groups[buName].employees.push(emp);
    });

    // Sort employees within each BU by level descending
    Object.values(groups).forEach(g => {
      g.employees.sort((a, b) => {
        const la = parseInt((a.level || '').replace('G', '')) || 0;
        const lb = parseInt((b.level || '').replace('G', '')) || 0;
        return lb - la;
      });
    });

    // Sort BUs by headcount descending, but put "ไม่ระบุ" last
    return Object.entries(groups).sort((a, b) => {
      const aUnassigned = a[0].includes('ไม่ระบุ') || a[0] === 'Unassigned';
      const bUnassigned = b[0].includes('ไม่ระบุ') || b[0] === 'Unassigned';
      if (aUnassigned && !bUnassigned) return 1;
      if (!aUnassigned && bUnassigned) return -1;
      return b[1].employees.length - a[1].employees.length;
    });
  }, [filtered, lang]);

  // Build Company → BU → Department tree (real-time from DB)
  const buTreeData = useMemo(() => {
    const coMap = {};
    filtered.forEach(emp => {
      const co = emp.company_entity || (lang === 'th' ? 'ไม่ระบุ' : 'Other');
      const bu = emp.bu || (lang === 'th' ? 'ไม่ระบุ BU' : 'Unassigned');
      const deptName = emp.department_name_th || (lang === 'th' ? 'ไม่ระบุแผนก' : 'Unassigned');
      if (!coMap[co]) coMap[co] = {};
      if (!coMap[co][bu]) coMap[co][bu] = {};
      if (!coMap[co][bu][deptName]) coMap[co][bu][deptName] = 0;
      coMap[co][bu][deptName]++;
    });
    return Object.entries(coMap)
      .map(([company, buMap]) => ({
        company,
        total: Object.values(buMap).reduce((acc, dm) => acc + Object.values(dm).reduce((a, b) => a + b, 0), 0),
        bus: Object.entries(buMap)
          .map(([bu, dm]) => ({
            bu,
            total: Object.values(dm).reduce((a, b) => a + b, 0),
            depts: Object.entries(dm).sort((a, b) => b[1] - a[1]).map(([dept, count]) => ({ dept, count })),
          }))
          .sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered, deptMap, lang]);

  // KPIs
  const kpis = useMemo(() => {
    const levels = new Set(filtered.map(e => e.level).filter(Boolean));
    const busWithData = buGroups.filter(([name]) => !name.includes('ไม่ระบุ') && name !== 'Unassigned');
    const deptsWithData = deptGroups.filter(([name]) => !name.includes('ไม่ระบุ') && name !== 'Unassigned');
    return {
      total: filtered.length,
      depts: deptsWithData.length,
      bus: busWithData.length,
      levels: levels.size,
    };
  }, [filtered, deptGroups, buGroups]);

  // Selected dept data
  const selectedData = useMemo(() => {
    if (!selectedDept) return null;
    const found = deptGroups.find(([name]) => name === selectedDept);
    return found ? { name: found[0], ...found[1] } : null;
  }, [selectedDept, deptGroups]);

  const handleSelectDept = useCallback((name) => {
    setSelectedDept(prev => prev === name ? null : name);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <div className="text-gray-500 text-sm">{t.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t.title} lang={lang} />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label={t.empCount} value={kpis.total} />
        <KPICard icon={Building2} iconBg="bg-green-100" iconColor="text-green-600" label={t.deptCount} value={kpis.depts} />
        <KPICard icon={GitBranch} iconBg="bg-orange-100" iconColor="text-orange-600" label={t.buCount} value={kpis.bus} />
        <KPICard icon={Layers} iconBg="bg-purple-100" iconColor="text-purple-600" label={t.levelCount} value={kpis.levels} />
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('chart')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{t.chartView}</button>
        <button
          onClick={() => setViewMode('bu')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'bu' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{t.buView}</button>
        <button
          onClick={() => setViewMode('tree')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{t.treeView}</button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{t.listView}</button>
        <button
          onClick={() => setViewMode('dept_org')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'dept_org' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >{t.deptOrgView}</button>
      </div>

      {viewMode === 'bu' ? (
        /* ═══ BU VIEW — Hierarchical Tree (real-time from DB) ═══ */
        <div className="space-y-3">
          {buTreeData.map(({ company, total, bus }) => {
            const coCfg = CO_COLORS[company] || defaultCo;
            const isOpen = !collapsedCos.has(company);
            const toggleCo = () => setCollapsedCos(prev => {
              const s = new Set(prev);
              s.has(company) ? s.delete(company) : s.add(company);
              return s;
            });
            return (
              <div key={company} className={`rounded-2xl border-2 ${coCfg.border} overflow-hidden`}>
                {/* Company Header */}
                <button
                  onClick={toggleCo}
                  className={`w-full flex items-center gap-3 px-5 py-3 ${coCfg.bg} hover:brightness-95 transition text-left`}
                >
                  {isOpen
                    ? <ChevronDown className={`w-4 h-4 flex-shrink-0 ${coCfg.text}`} />
                    : <ChevronRight className={`w-4 h-4 flex-shrink-0 ${coCfg.text}`} />
                  }
                  <span className={`font-bold text-base ${coCfg.text}`}>{company}</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/70 ${coCfg.text}`}>
                    {total} {lang === 'th' ? 'คน' : 'emp'}
                  </span>
                  <span className={`text-xs opacity-60 ml-auto ${coCfg.text}`}>
                    {bus.length} BU
                  </span>
                </button>

                {/* BU list */}
                {isOpen && (
                  <div className="px-4 py-3 space-y-2 bg-white/60">
                    {bus.map(({ bu, total: buTotal, depts }, buIdx) => {
                      const buColor = getBUColor(bu, buIdx);
                      const buKey = `${company}__${bu}`;
                      const isSelected = selectedBU === buKey;
                      return (
                        <div key={bu}>
                          <div
                            className={`rounded-xl border-2 bg-white cursor-pointer transition hover:shadow-md ${isSelected ? 'shadow-lg' : ''}`}
                            style={{ borderColor: buColor }}
                            onClick={() => setSelectedBU(prev => prev === buKey ? null : buKey)}
                          >
                            {/* BU Header row */}
                            <div className="flex items-center gap-3 px-4 py-2.5">
                              <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: buColor }} />
                              <span className="font-semibold text-sm text-gray-800 flex-1">{bu}</span>
                              <span className="text-sm font-bold" style={{ color: buColor }}>
                                {buTotal} {lang === 'th' ? 'คน' : ''}
                              </span>
                              {isSelected
                                ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-1" />
                              }
                            </div>
                            {/* Department pills */}
                            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                              {depts.map(({ dept, count }) => (
                                <span
                                  key={dept}
                                  className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-600"
                                >
                                  {dept}
                                  <span className="font-bold text-gray-800 ml-0.5">{count}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Employee Detail Panel (inline) */}
                          {isSelected && (() => {
                            const buEmps = filtered.filter(e =>
                              (e.company_entity || (lang === 'th' ? 'ไม่ระบุ' : 'Other')) === company &&
                              (e.bu || (lang === 'th' ? 'ไม่ระบุ BU' : 'Unassigned')) === bu
                            );
                            return (
                              <div className="mt-2 ml-4">
                                <OrgDetailPanel
                                  deptName={`${company} › ${bu}`}
                                  emps={buEmps}
                                  lang={lang}
                                  color={buColor}
                                  onClose={() => setSelectedBU(null)}
                                  groupBy="department"
                                  deptMap={deptMap}
                                />
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'tree' ? (
        /* ═══ TREE DIAGRAM VIEW ═══ */
        <BUOrgTree
          buTreeData={buTreeData}
          selectedBU={selectedBU}
          setSelectedBU={setSelectedBU}
          filtered={filtered}
          deptMap={deptMap}
          lang={lang}
        />
      ) : viewMode === 'chart' ? (
        /* ═══ CHART VIEW ═══ */
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-gray-200 p-6">
          {/* CEO */}
          <CEOCard emp={ceo} lang={lang} />

          {/* Connector line */}
          {ceo && <div className="flex justify-center mb-2"><div className="w-px h-6 bg-amber-400" /></div>}

          {/* บอร์ดบริหาร (C-Level + Senior Execs combined) */}
          {(cLevel.length > 0 || seniorExecs.length > 0) && (
            <>
              <div className="text-center text-xs text-gray-400 font-medium mb-2">{t.cLevel}</div>
              <CLevelRow emps={[...cLevel, ...seniorExecs]} lang={lang} />
              <div className="flex justify-center mb-4"><div className="w-px h-4 bg-gray-300" /></div>
            </>
          )}

          {/* Department Grid + Detail Panel */}
          <div className="flex gap-6">
            {/* Department Cards */}
            <div className={`${selectedData ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
              <div className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                {t.allDepts} ({deptGroups.length})
              </div>
              <div className={`grid ${selectedData ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
                {deptGroups.map(([name, data], i) => (
                  <DeptSection
                    key={name}
                    dept={name}
                    emps={data.employees}
                    lang={lang}
                    color={DEPT_PALETTE[i % DEPT_PALETTE.length]}
                    isSelected={selectedDept === name}
                    onSelect={handleSelectDept}
                  />
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            {selectedData && (
              <div className="w-1/2 transition-all duration-300">
                <OrgDetailPanel
                  deptName={selectedData.name}
                  emps={selectedData.employees}
                  lang={lang}
                  color={DEPT_PALETTE[deptGroups.findIndex(([n]) => n === selectedDept) % DEPT_PALETTE.length]}
                  onClose={() => setSelectedDept(null)}
                />
              </div>
            )}
          </div>

          {!selectedData && (
            <div className="text-center text-gray-400 text-sm mt-4">{t.selectDept}</div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap justify-center gap-4">
              {Object.entries(LEVEL_COLORS).map(([level, cfg]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${cfg.bg}`} />
                  <span className="text-[10px] text-gray-500">{level} · {cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ═══ LIST VIEW ═══ */
        <div className="space-y-4">
          {deptGroups.map(([deptName, data], deptIdx) => (
            <DeptListItem
              key={deptName}
              deptName={deptName}
              data={data}
              color={DEPT_PALETTE[deptIdx % DEPT_PALETTE.length]}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        /* ═══ DEPT ORG CHART VIEW ═══ */
        <div className="space-y-4">
          {/* Department Selector — dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{t.selectDeptOrg}:</span>
            <select
              value={selectedOrgDept || deptGroups[0]?.[0] || ''}
              onChange={e => setSelectedOrgDept(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[280px]"
            >
              {deptGroups.map(([name, grp]) => (
                <option key={name} value={name}>
                  {name} ({grp.employees.length})
                </option>
              ))}
            </select>
          </div>

          {/* Org Chart for selected department */}
          {(() => {
            const activeDept = selectedOrgDept || deptGroups[0]?.[0];
            const found = deptGroups.find(([name]) => name === activeDept);
            if (!found) return <div className="text-center py-12 text-gray-400 text-sm">{t.selectDeptOrg}</div>;
            return (
              <DeptOrgChart
                deptName={found[0]}
                employees={found[1].employees}
                lang={lang}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

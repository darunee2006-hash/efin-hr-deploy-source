import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts'

// ── BU CONFIG (ไม่รวม SMT ตามที่กำหนด) ───────────────────────────────────────
const BUS = {
  'Center':       { label: 'BU Center',       color: '#6366f1' },
  'Content':      { label: 'BU Content',      color: '#3b82f6' },
  'IR Plus':      { label: 'BU IR Plus',      color: '#f59e0b' },
  'efin.finance': { label: 'BU efin.finance', color: '#78c045' },
  'IT Solution':  { label: 'BU IT Solution',  color: '#8b5cf6' },
  'ATESS':        { label: 'BU ATESS',        color: '#ec4899' },
  'XPert':        { label: 'BU XPert',        color: '#0ea5e9' },
}

// ── DEPARTMENT → BU MAPPING ───────────────────────────────────────────────────
const DEPT_BU = {
  'Innovation Technology Department':                          'efin.finance',
  'Operations & Cybersecurity Department':                    'Center',
  'News & Digital Content Department':                        'Content',
  'Sale Department':                                          'Center',
  'Marketing & Communications Department':                    'efin.finance',
  'Community Relations Department':                           'Center',
  'Investor Relations & Corporate Communications Department': 'IR Plus',
  'Corporate & Human Resources Management Department':        'Center',
  'Accounting & Finance Department':                          'Center',
  'Accounting & HR Department':                               'ATESS',
  'Creative Design & Media Production Department':            'efin.finance',
  'Business Strategy & Development Department':               'efin.finance',
  'Software Development':                                     'ATESS',
}

const ALL_DEPTS = [
  'Innovation Technology Department',
  'Operations & Cybersecurity Department',
  'News & Digital Content Department',
  'Sale Department',
  'Marketing & Communications Department',
  'Community Relations Department',
  'Investor Relations & Corporate Communications Department',
  'Corporate & Human Resources Management Department',
  'Accounting & Finance Department',
  'Accounting & HR Department',
  'Creative Design & Media Production Department',
  'Business Strategy & Development Department',
  'Software Development',
]

const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// ── EMPLOYEE DATA (survey 2026, 53 คน) ────────────────────────────────────────
const S = [
  { id:1,  name:'Wipawee Poomruang',         nick:'วิ',       pos:'Head of Platform',               dept:'Innovation Technology Department',  bu:'efin.finance',  hrs:46,   sg:0, oy:4, om:1, cr:true,  bk:false, risk:'ปานกลาง', status:'งานท่วมในระดับวิกฤต',         summary:'ทำงานหลายบทบาทพร้อมกัน ต้องการโฟกัส Product Priority',          concern:'ขาดลำดับความสำคัญที่ชัดเจน',           rec:'กำหนด Product Priority ประจำสัปดาห์ ลดงานประชุม' },
  { id:2,  name:'Sulisa Ployboot',           nick:'ใส',       pos:'Project Manager',                dept:'Innovation Technology Department',  bu:'IT Solution',  hrs:89,   sg:0, oy:5, om:2, cr:true,  bk:false, risk:'สูง',      status:'Overload รุนแรง',                summary:'89 ชม./สัปดาห์ รับงานบริการ/ลูกค้าเกินขนาด',               concern:'คุณภาพงานลด พบบุคคลภายนอกมาก',          rec:'ลด Scope/Project, ต่อ Deputy/Backup, Capacity Interview' },
  { id:3,  name:'Panupong kunlabutr',        nick:'นุ',       pos:'Technical Lead (IR Project)',     dept:'Innovation Technology Department',  bu:'IR Plus',  hrs:45,   sg:0, oy:0, om:1, cr:true,  bk:false, risk:'ต่ำ',      status:'งานปกติ',                         summary:'Technical Lead ดูแล IR Project เป็นหลัก',                   concern:'ขาด Backup สำหรับระบบสำคัญ',            rec:'สร้าง Knowledge Base, Pairing กับ Backup Owner' },
  { id:4,  name:'Siripapar Pechngerntong',   nick:'ป่าน',     pos:'Technical Lead (MOL)',            dept:'Innovation Technology Department',  bu:'IT Solution',  hrs:47,   sg:0, oy:3, om:4, cr:false, bk:true,  risk:'ปานกลาง', status:'งานท่วมในระดับสูง',              summary:'ทำงานหลายบทบาท ต้องการ Coaching และ optimize 7 งาน',        concern:'แผนงานขาดตัดสินใจ เกิด Rework',          rec:'มอบ Project/Decision Owner ชัด ต่อ workflow automation' },
  { id:5,  name:'Worakit Rirkngam',          nick:'อาร์ต',   pos:'Lead Software Engineer',          dept:'Innovation Technology Department',  bu:'IT Solution',  hrs:43,   sg:0, oy:1, om:2, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'โฟกัส Cost Saving ระบบ Lead Engineer',                      concern:'requirement เปลี่ยนบ่อย',               rec:'เพิ่ม Change Control, ต่อ AI สำหรับ review' },
  { id:6,  name:'Theerachai Thongsem',       nick:'จั๊ก',    pos:'Lead AI Engineer',               dept:'Innovation Technology Department',  bu:'efin.finance',  hrs:40,   sg:0, oy:3, om:0, cr:true,  bk:false, risk:'ต่ำ',      status:'งานปกติ',                         summary:'โฟกัส Customer Service AI ชัดเจน',                          concern:'ขาดทิศทาง Self-development',             rec:'กำหนด AI Product KPI ชัด ระยะ milestone' },
  { id:7,  name:'Meree Mhandee',             nick:'มีรี',    pos:'Senior Business Analyst',         dept:'Innovation Technology Department',  bu:'IT Solution',  hrs:40,   sg:0, oy:1, om:3, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ มีบทบาทหลาย',             summary:'หา Pain Point Customer Service สำคัญ',                      concern:'Admin 22.5% เกิน',                       rec:'จัด Role Boundary ของ BA ลดงาน Admin' },
  { id:8,  name:'Sirapat Nemidkanam',        nick:'หมู',     pos:'Asst. Project Manager',           dept:'Innovation Technology Department',  bu:'efin.finance',  hrs:59,   sg:0, oy:3, om:1, cr:false, bk:true,  risk:'สูง',      status:'Overload สูง',                    summary:'59 ชม./สัปดาห์ รับงานหลายโปรเจกต์พร้อมกัน',               concern:'ประสิทธิภาพลด',                          rec:'ลดโปรเจกต์, กำหนด RACI, เพิ่ม Coordinator' },
  { id:9,  name:'Nuttapong Lertworasirikul', nick:'นัท',    pos:'Senior Backend Developer',        dept:'Innovation Technology Department',  bu:'efin.finance',  hrs:40,   sg:0, oy:0, om:0, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'80% รับงาน efin.finance ทิศทางชัด',                         concern:'Timeline commit ไม่ Estimate ก่อน',      rec:'ต่อ Capacity Estimate ก่อน commit' },
  { id:10, name:'Pornnarong Chamchuen',      nick:'ป้อ',     pos:'Network Architect (Center)',      dept:'Operations & Cybersecurity Department',  bu:'Center',    hrs:40,   sg:1, oy:2, om:1, cr:true,  bk:false, risk:'ปานกลาง', status:'งานปกติ',                         summary:'เชี่ยวชาญ Network/Cybersecurity จัด Self Dev 25%',           concern:'Skill Gap AI Security สำคัญต่อ BU',     rec:'IDP/POC AI Security 90 วัน, Vendor Training' },
  { id:11, name:'Pongdanai Nakbua',          nick:'บิ๊ก',   pos:'Sr. Operation Engineer (Center)', dept:'Operations & Cybersecurity Department',  bu:'Center',    hrs:40,   sg:0, oy:3, om:2, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'ลดต้นทุน พัฒนาตัวเอง optimize งาน',                          concern:'ระบบ Legacy ยากพัฒนา',                   rec:'Legacy Modernization Roadmap, AI automation' },
  { id:12, name:'Sarapong Nuntivong',        nick:'สราพงษ์', pos:'Deep Content & Data Specialist',  dept:'News & Digital Content Department',  bu:'Content',            hrs:60,   sg:0, oy:0, om:2, cr:true,  bk:false, risk:'สูง',      status:'Overload สูง',                    summary:'100% Deep Content เชี่ยวชาญ 60 ชม./สัปดาห์',              concern:'engagement/retention ลด',                rec:'แบ่งขอบเขต content กำหนด KPI คุณภาพ' },
  { id:13, name:'Charuwan Iamyingpanitch',   nick:'จ่า',     pos:'News Desk Lead',                  dept:'News & Digital Content Department',  bu:'Content',            hrs:50,   sg:0, oy:2, om:1, cr:false, bk:true,  risk:'ปานกลาง', status:'งานท่วมปกติ',                     summary:'Lead ทีมข่าว ดูแล Coaching ด้วย',                           concern:'ขาด North Star ชัดเจน',                  rec:'กำหนด North Star Metric 1-2 ตัว/สัปดาห์' },
  { id:14, name:'Chutima Apichaisuksakul',   nick:'ออย',     pos:'Head Reporter (News)',             dept:'News & Digital Content Department',  bu:'Content',            hrs:44,   sg:0, oy:3, om:0, cr:false, bk:true,  risk:'ต่ำ',      status:'งานท่วมในระดับสูง',              summary:'ประสบการณ์ข่าวสด สร้างโอกาสคอนเทนต์',                      concern:'ผูกกับ Customer Service/งานตอบสนองมาก',  rec:'Assignment Desk & Route งานข่าวสด, ใช้ AI' },
  { id:15, name:'Pariwat Hinploy',           nick:'ป้อง',    pos:'Senior Reporter (News)',           dept:'News & Digital Content Department',  bu:'Content',            hrs:50,   sg:0, oy:0, om:3, cr:false, bk:true,  risk:'ปานกลาง', status:'งานท่วมปกติ',                     summary:'100% งานข่าว ขาดโฟกัสคุณภาพ',                              concern:'ขาด Editorial Priority ชัด',             rec:'แยก Editorial Priority 4-6 สัปดาห์ ใช้ AI' },
  { id:16, name:'Chonchanok Pimjan',         nick:'นก',      pos:'TikTok Platform Owner (News)',     dept:'News & Digital Content Department',  bu:'Content',            hrs:44,   sg:1, oy:1, om:2, cr:true,  bk:false, risk:'ปานกลาง', status:'งานท่วมในระดับสูง บางส่วน',      summary:'ทักษะผลิตสื่อ TikTok สูง Automation 36%',                  concern:'Skill Gap AI Automation ขาด Capacity',  rec:'เพิ่ม Backup Editor, SOP, IDP Claude/Code' },
  { id:17, name:'Prakaidao Baengsuntia',     nick:'แป้ง',    pos:'Deputy ESG News Editor',          dept:'News & Digital Content Department',  bu:'Center',            hrs:80,   sg:0, oy:5, om:0, cr:true,  bk:false, risk:'สูง',      status:'Overload รุนแรง',                summary:'80 ชม./สัปดาห์ ESG+งานกอง+Admin+Coaching',                concern:'ขาดส่วน 100% เสี่ยง Burnout',            rec:'ตรวจ Time Allocation, มอบงาน Admin' },
  { id:18, name:'Thitiphan Khunpitak',       nick:'ต้น',     pos:'Marketing Sale',                  dept:'Sale Department',  bu:'Center',            hrs:45,   sg:4, oy:3, om:1, cr:false, bk:false, risk:'ปานกลาง', status:'งานท่วมในระดับสูง',              summary:'100% Revenue Generation, Skill Gap 4 ด้าน',                concern:'ขอบเขต Marketing-News-AE-Event ซ้อน',   rec:'กำหนด RACI, IDP Data Analysis/Marketing' },
  { id:19, name:'Chawaporn Sroypuang',       nick:'อ้อม',    pos:'Customer Success & Support',      dept:'Marketing & Communications Department',  bu:'efin.finance',  hrs:40,   sg:0, oy:3, om:2, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ มีสัญญาณ',               summary:'Self Dev 27.5% ดีมาก เสี่ยง Burnout',                       concern:'แรงดันจากลูกค้าสูง',                     rec:'FAQ/AI Draft/Knowledge Base, rotation งาน' },
  { id:20, name:'Keerati Noijard',           nick:'กีรติ',   pos:'Senior Customer Success',         dept:'Marketing & Communications Department',  bu:'efin.finance',  hrs:40,   sg:0, oy:0, om:1, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'Customer Success หลัก จัดกระบวนการแก้ปัญหา',               concern:'ขาด Escalation Path ชัด',               rec:'กำหนด SLA, Escalation Path, Voice of Customer' },
  { id:21, name:'Chachchot Kabil',           nick:'จ็อต',    pos:'PM / Coordinator (Event)',         dept:'Community Relations Department',  bu:'Center', hrs:50,   sg:0, oy:0, om:3, cr:false, bk:true,  risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'50 ชม. จัด Event หลายงานพร้อมกัน',                         concern:'ขอบเขตบทบาทยังไม่ชัด',                  rec:'Event Governance, Annual Calendar, Capacity plan' },
  { id:22, name:'Chonnanart Trisarp',        nick:'แนน',     pos:'Sr. IR Supervisor (IR Offline)',   dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:50,   sg:2, oy:2, om:3, cr:true,  bk:false, risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'ดูแลลูกค้า IR Coaching พัฒนาทีม Skill Gap 2',              concern:'Skill Gap Coaching & IR Consulting',    rec:'IDP People Management & Consultative Selling' },
  { id:23, name:'Charuporn Kaewsuvan',       nick:'ช่อ',     pos:'IR Supervisor (IR Online)',        dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:94,   sg:0, oy:2, om:2, cr:true,  bk:false, risk:'สูง',      status:'Overload รุนแรง / ตรวจสอบ',     summary:'94 ชม./สัปดาห์ ดูแลลูกค้า+Coaching+CRM',                   concern:'ขาดพักกาก เสี่ยง Burnout สูง',           rec:'ลดลูกค้า, แยก Sales/Service/Project, CRM, AI' },
  { id:24, name:'Nittaya Phrompanya',        nick:'นิตยา',   pos:'IR Supervisor (AGM)',             dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:50.5, sg:0, oy:2, om:1, cr:false, bk:true,  risk:'ปานกลาง', status:'Overload',                        summary:'งาน AGM ฤดูลูกค้าสูง ดูแลหลายบทบาท',                       concern:'ขาด Seasonal Capacity Plan',             rec:'Seasonal Capacity Plan ก่อน AGM, IDP' },
  { id:25, name:'Dissakorn Thepjomjai',      nick:'ดิส',     pos:'Head of Business Development',    dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',              hrs:62,   sg:0, oy:2, om:0, cr:true,  bk:false, risk:'สูง',      status:'Overload',                        summary:'62 ชม. โฟกัส IR AI Copilot, SEO, Partnership',              concern:'ขาด Team Coaching',                      rec:'ลด Execution, เพิ่ม Sales Coaching' },
  { id:26, name:'Sirinatthakarn Panyawichan',nick:'เซีย',   pos:'IR Plus Coordinator Officer',      dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:45,   sg:0, oy:2, om:1, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติใกล้เกณฑ์',               summary:'Clipping 95.6% Manual มาก ต้องการ AI',                      concern:'งาน Manual สูงมาก',                      rec:'Clipping OCR อัตโนมัติ, AI Database' },
  { id:27, name:'Kornkamol Mangmee',         nick:'กรกมล',   pos:'Senior HRM',                      dept:'Corporate & Human Resources Management Department',  bu:'Center',        hrs:40,   sg:0, oy:4, om:2, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'Admin 97.5% Payroll/OT ดูแลระบบ HR',                        concern:'ขาด Self Dev',                           rec:'HR Workflow Automation Payroll/OT/Certificate' },
  { id:28, name:'Pichanika Wieng-in',        nick:'พิชา',    pos:'PM / Coordinator (Event)',         dept:'Community Relations Department',  bu:'Center', hrs:48,   sg:0, oy:1, om:1, cr:false, bk:true,  risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'48 ชม. Admin 33% Event Team รับ Project Owner',             concern:'Admin สูง บทบาทรับงานเพิ่มบ่อย',          rec:'RACI Event Team, Event Template, AI' },
  { id:29, name:'Witchaya Khongpo',          nick:'วิชยา',   pos:'Project Coordinator & Admin',     dept:'Accounting & HR Department',  bu:'ATESS',        hrs:44,   sg:0, oy:5, om:1, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติใกล้เกณฑ์',               summary:'Admin 34%+Others 25% งานหลายอย่าง',                         concern:'บทบาทไม่ตรงงานจริง',                    rec:'Central Workflow, SLA, Dashboard, Template/AI' },
  { id:30, name:'Achara Panday',             nick:'อ้อ',     pos:'Sr. Accounting & Finance',        dept:'Accounting & Finance Department',  bu:'Center',  hrs:44,   sg:0, oy:5, om:3, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติใกล้เกณฑ์',               summary:'Admin 81.8% งาน Petty Cash/Payment Manual',                 concern:'ขาด AI/License พัฒนาระบบ',              rec:'Accounting Automation, AI/OCR, Auto-matching' },
  { id:31, name:'Chakkaphong Sukkasame',     nick:'แชค',     pos:'Photographer & VDO Supervisor',   dept:'Creative Design & Media Production Department',  bu:'efin.finance', hrs:46,   sg:0, oy:5, om:0, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติใกล้เกณฑ์',               summary:'Customer Service 60% Coaching AI Tools',                    concern:'ขาด Focus ด้านตัวเอง',                  rec:'Production Queue/SLA, AI Retouch/Auto Edit' },
  { id:32, name:'Archaree Yothaprai',        nick:'อาร์ชี',  pos:'Sr. Graphic Design',              dept:'Creative Design & Media Production Department',  bu:'efin.finance', hrs:50,   sg:2, oy:2, om:6, cr:false, bk:true,  risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'Skill Gap 2 งาน 50 ชม. Rework/Others สูง',                 concern:'ขาด AI/Template workflow',               rec:'IDP Brand System/Modern Design, CI Prompt' },
  { id:33, name:'Pichchaya Sapankaew',       nick:'พิช',     pos:'Creative & Art Director',         dept:'Creative Design & Media Production Department',  bu:'Center', hrs:48,   sg:1, oy:0, om:1, cr:true,  bk:false, risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'Branding/Rebranding สำคัญขององค์กร',                        concern:'ขาด Self Dev, Process/Approval ช้า',    rec:'AI Creative/Management, Brand Architecture' },
  { id:34, name:'Bantita Poolpo',            nick:'แบน',     pos:'Sr. Web Designer (IR Plus)',       dept:'Creative Design & Media Production Department',  bu:'efin.finance', hrs:49,   sg:0, oy:4, om:2, cr:false, bk:true,  risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'UX/UI + Front-end + AI Workflow 49 ชม.',                    concern:'Rework, งานรับจากหลาย BU',              rec:'AI Design-to-Code Workflow, Requirement Brief' },
  { id:35, name:'Nathamon Kannasut',         nick:'น้ำ',     pos:'UX Officer (efin.finance)',        dept:'Business Strategy & Development Department',  bu:'efin.finance', hrs:54,   sg:0, oy:4, om:1, cr:false, bk:false, risk:'สูง',      status:'Overload',                        summary:'Overload 54 ชม. Design System/AI Workflow',                 concern:'ขาด Focus Time เพิ่มรับงาน',             rec:'Focus Block, Design-to-Dev Handoff Standard' },
  { id:36, name:'Sombatsiri Chaowakul',      nick:'สมบัติ',  pos:'Chief Operation Officer',         dept:'Innovation Technology Department',  bu:'IT Solution',        hrs:51,   sg:0, oy:5, om:2, cr:true,  bk:false, risk:'ปานกลาง', status:'Overload / Revenue Generation Focus',summary:'51 ชม./สัปดาห์ Revenue Gen 70.6% (Sale AI 15h, CS AI 6h, Solar Rooftop 15h), Team Coaching 19.6% (MOL/EAANYWHERE), Cost Saving 5.9% (Server/AI License)', concern:'รับผิดชอบ 3 โปรเจกต์ Revenue พร้อมกัน ขาด Priority Focus และ Backup ชัดเจน', rec:'กำหนด Priority POC ชัด, Delegate Coaching ให้ทีม, Portfolio Governance ทุก 2 สัปดาห์' },
  { id:37, name:'Pimrapas Siripraiwan',      nick:'ปิม',     pos:'Executive Editor',                dept:'News & Digital Content Department',  bu:'Content',            hrs:40,   sg:0, oy:0, om:3, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'Coaching บรรณาธิการ พัฒนาคน 3 บทบาท',                       concern:'ขาด Focus ทิศทาง Editorial',             rec:'Editorial Coaching/Development Time' },
  { id:38, name:'Wachiramed Tanedsatidpong', nick:'วชิระ',  pos:'Head of Investment Analytics',     dept:'Marketing & Communications Department',  bu:'efin.finance',         hrs:70,   sg:1, oy:2, om:2, cr:true,  bk:false, risk:'สูง',      status:'Overload',                        summary:'70 ชม. Investment Analytics + AI Innovation',               concern:'เฉพาะทาง เสี่ยงขาดคนแทน',               rec:'Focus Portfolio, ลด Consulting/Admin, Capability Building' },
  { id:39, name:'Kanda Techarattanopas',     nick:'กัณดา',   pos:'Director of IR and Sales',        dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:0,    sg:0, oy:0, om:0, cr:true,  bk:false, risk:'สูง',      status:'ต้องตรวจสอบ (ข้อมูลไม่ครบ)',     summary:'ข้อมูลยังไม่ครบ ต้องตรวจสอบ',                               concern:'ข้อมูลเปล่า 0 ชม.',                      rec:'ยืนยันข้อมูล กำหนดบทบาทชัด' },
  { id:40, name:'Jurarat Charoenpakdee',     nick:'จุ',      pos:'Investor Relation Manager',       dept:'Investor Relations & Corporate Communications Department',  bu:'IR Plus',         hrs:72,   sg:3, oy:2, om:3, cr:true,  bk:false, risk:'สูง',      status:'Overload',                        summary:'72 ชม. Skill Gap 3 ด้าน บทบาท IR หลาย',                    concern:'Overload + Skill Gap สูง',               rec:'IDP เชิงลึก, ลด Scope, Delegate งาน' },
  { id:41, name:'Soonthorn Anyamaneeroj',    nick:'สุนทร',   pos:'Chief Architect',                 dept:'Innovation Technology Department',  bu:'efin.finance',  hrs:53,   sg:0, oy:5, om:4, cr:true,  bk:false, risk:'สูง',      status:'Overload',                        summary:'53 ชม. Architecture+AI Coding+Security+Coaching',            concern:'Rework จาก Scope ไม่ชัด',               rec:'Architecture Intake + Definition of Ready + SRS/SDS/KB' },
  { id:42, name:'Onanong Premjai',           nick:'โอนัน',   pos:'Enterprise Operation Architect',  dept:'Operations & Cybersecurity Department',  bu:'Center',    hrs:45,   sg:1, oy:5, om:0, cr:false, bk:true,  risk:'ปานกลาง', status:'งานปกติใกล้เกณฑ์',               summary:'ลดต้นทุน Coaching Self-dev Incremental Modernization',       concern:'Skill Gap AI Adoption/Automation',       rec:'Quick-win Modernization, Technology Readiness' },
  { id:43, name:'Darunee Rungsibutr',        nick:'ดารุณี',  pos:'HR Manager',                      dept:'Corporate & Human Resources Management Department',  bu:'Center',        hrs:40,   sg:4, oy:5, om:4, cr:true,  bk:false, risk:'ปานกลาง', status:'งานปกติ / Skill Gap สำคัญ',      summary:'Cost Saving+Coaching บทบาท HR Manager ดี Skill Gap 4',     concern:'Skill Gap HR Analytics/Business Partnering',rec:'IDP 90 วัน HR Analytics, Workforce, AI for HR' },
  { id:44, name:'Prakasit Koonkrong',        nick:'ปราการ',  pos:'Creative Design Manager',         dept:'Creative Design & Media Production Department',  bu:'Center', hrs:50,   sg:1, oy:4, om:4, cr:false, bk:true,  risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'Customer Service+Cost Saving AI Workflow Web/VDO',          concern:'ขาด AI Process พัฒนา',                  rec:'Creative Intake/Brief, AI Workflow Pilot' },
  { id:45, name:'Pasutha Daichi Ide',        nick:'ปสุตา',   pos:'Head BU efin.finance & Event',    dept:'Business Strategy & Development Department',  bu:'efin.finance', hrs:77,   sg:0, oy:0, om:0, cr:true,  bk:false, risk:'สูง',      status:'Overload รุนแรง',                summary:'77 ชม. 2 บทบาท BU Head + Event Head',                       concern:'ขาด Self-dev, Optimize ยาก',             rec:'แยกบทบาท BU/Event, Deputy, Focus Core Business' },
  { id:46, name:'Piyaphol Rongkavilit',      nick:'ภิญญ์',   pos:'Head of Growth & Marketing',     dept:'Marketing & Communications Department',  bu:'efin.finance',       hrs:50,   sg:1, oy:3, om:5, cr:true,  bk:false, risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'Product+Funnel+Monetization+Growth Loop CDP Dashboard',      concern:'ขาด Single Source efin.finance',         rec:'Growth Data Foundation GA4-Billing-CRM, Roadmap' },
  { id:47, name:'Suphannee Singracha',       nick:'สุภานี',  pos:'Accounting & Finance Manager',    dept:'Accounting & Finance Department',  bu:'Center',  hrs:40,   sg:0, oy:7, om:2, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ / Optimize สูง',         summary:'Routine สูง Optimize ได้ 9 งาน Finance Real-time',          concern:'ขาดระบบ ขั้นตอนซ้อน',                   rec:'Finance Data Mart + Automation Roadmap' },
  { id:48, name:'Paitoon Burapavijitnon',    nick:'ไพฑูรย์', pos:'IT AI Director',                 dept:'Software Development',  bu:'ATESS',    hrs:40,   sg:0, oy:2, om:1, cr:true,  bk:false, risk:'ปานกลาง', status:'มีผลสำเร็จ / ตรวจสอบ',          summary:'ทิศทาง AI Product+DevOps ชัด ขาดส่วนดูแล 0%',              concern:'ขาดบทบาทหน้า ตัดสินใจช้า',              rec:'AI Product Governance, Decision Owner, Environment ชัด' },
  { id:49, name:'Surametee Maneesukho',      nick:'สุรเมธ',  pos:'Managing Editor',                 dept:'News & Digital Content Department',  bu:'Content',            hrs:40,   sg:0, oy:1, om:1, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ',                         summary:'คุณภาพบทบาท Editor+Data/AI จุดแข็ง',                        concern:'ขาด Self Dev, Focus',                    rec:'Editorial Coaching Time, Content-Data Squad' },
  { id:50, name:'Chatchaya Angkhulee',       nick:'ชัชชา',   pos:'Crypto Vertical Lead',            dept:'News & Digital Content Department',  bu:'Content',            hrs:53.5, sg:0, oy:2, om:3, cr:false, bk:false, risk:'สูง',      status:'Overload ส่งสัญญาณ Wellbeing Risk',summary:'53.5 ชม. Crypto/TikTok ขาด Coaching/Self-dev',              concern:'เสี่ยง Burnout ขาด Backup',              rec:'ลด Output/Shift, Backup, Wellbeing Plan' },
  { id:51, name:'Wassana Teskham',           nick:'วาสนา',   pos:'Director of Personnel Planning',  dept:'Accounting & Finance Department',  bu:'Center',        hrs:40,   sg:1, oy:1, om:4, cr:false, bk:true,  risk:'ต่ำ',      status:'งานปกติ / Admin สูง',            summary:'Admin 72.5% Self Dev 20% ต้องการ AI',                       concern:'Admin สูง Coaching แค่ 2.5%',           rec:'Automation Admin, Coaching AI Learning Plan' },
  { id:52, name:'Pattanasak Chaowakul',      nick:'ปัฐนสัก', pos:'CITO',                           dept:'Operations & Cybersecurity Department',  bu:'Center',    hrs:50,   sg:0, oy:4, om:4, cr:true,  bk:false, risk:'ปานกลาง', status:'งานสูง ใกล้เกณฑ์',              summary:'Cost Saving+Coaching+AI Core Infrastructure Governance',     concern:'Shadow IT, Data Leakage, Technical Debt', rec:'AI/IT Governance Fast-track, Sandbox, FinOps' },
  { id:53, name:'Patima Suksanguan',         nick:'พัทธิมา', pos:'Marketing Sale Manager',           dept:'Sale Department',  bu:'Center',            hrs:42.5, sg:2, oy:3, om:3, cr:false, bk:false, risk:'ปานกลาง', status:'งานปกติใกล้เกณฑ์ / ขาดพัฒนาทีม',summary:'Skill Gap 2 ด้าน AI Sales/CRM ต้องการ',                    concern:'ขาด Self Dev, Coaching',                rec:'Sales CRM/CPQ, IDP Negotiation/AI, Sales Coaching' },
]

const SURVEY_DATA = S.map(d => ({ ...d, bu: d.bu || DEPT_BU[d.dept] || 'Center' }))

// ── ACTION PLAN ───────────────────────────────────────────────────────────────
const INIT_ACTIONS = [
  { id:1, priority:'P0', issue:'ตรวจสอบข้อมูล',        owners:'Sombatsiri, Kanda, Paitoon',                                               reason:'ข้อมูลไม่ครบ/ดูแลรอบ/การจัดระเบียบ 0%',               action:'ยืนยันข้อมูลเบื้องต้น กำหนดบทบาทก่อนตัดสิน Workforce',      due:'2026-07-31', status:'pending' },
  { id:2, priority:'P1', issue:'Overload รุนแรง',       owners:'Sulisa, Charuporn, Prakaidao, Sombatsiri, Wachiramed, Jurarat, Pasutha',   reason:'70+ ชม./สัปดาห์ ผลงานผิดปกติ',                         action:'ลด Scope/Project, ต่อ Deputy/Backup, Capacity Interview',     due:'2026-08-15', status:'in_progress' },
  { id:3, priority:'P1', issue:'Overload + Wellbeing',  owners:'Sirapat, Sarapong, Dissakorn, Nathamon, Soonthorn, Chatchaya',             reason:'50+ ชม./สัปดาห์ สัญญาณสุขภาพ/ความกังวล',               action:'ปรับ Workload, เพิ่ม Backup, ตรวจ Wellbeing, กำหนด Focus Work',due:'2026-08-31', status:'pending' },
  { id:4, priority:'P1', issue:'Skill Gap สำคัญ',      owners:'Darunee, Chonnanart, Pornnarong, Chonchanok, Thitiphan, Piyaphol, Patima', reason:'Gap ในงานสำคัญตอบแทน BU',                               action:'IDP 90 วัน + Mentor/Project/Training จากงานจริง',            due:'2026-09-30', status:'pending' },
  { id:5, priority:'P1', issue:'Governance & Focus',    owners:'Pattanasak, Paitoon, Soonthorn, Onanong, Pasutha, Surametee',             reason:'Scope ไม่ชัด, Shadow IT, POC งานนอกแผน',                action:'Intake, Decision Owner, Portfolio Review, AI/IT Governance',   due:'2026-08-31', status:'pending' },
  { id:6, priority:'P2', issue:'Automation Foundation', owners:'Kornkamol, Achara, Suphannee, Darunee, Piyaphol, Prakasit, Patima',       reason:'ขาดระบบ งาน Routine/Manual ขาด Single Source',           action:'Data Mart, CRM/CDP, Workflow Automation, Knowledge Base',       due:'2026-10-31', status:'pending' },
  { id:7, priority:'P2', issue:'Coaching & Leadership', owners:'Dissakorn, Surametee, Wassana, Patima, Chatchaya',                        reason:'Coaching ต้องการ ขาดบทบาท Lead/Manager',                 action:'Coaching Cadence, Delegation, Successor/Backup Plan',          due:'2026-10-31', status:'pending' },
]

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const GREEN = '#78c045'
const RISK_COLORS = { 'สูง': '#ef4444', 'ปานกลาง': '#f59e0b', 'ต่ำ': '#22c55e', 'ปานกลาย': '#f59e0b' }
const STATUS_COLORS = { pending: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700' }
const PRIORITY_COLORS = { P0: 'bg-red-600 text-white', P1: 'bg-orange-500 text-white', P2: 'bg-blue-500 text-white' }
const TABS = [
  { key:'exec',    label:'Executive Dashboard' },
  { key:'team',    label:'Team Dashboard' },
  { key:'manpower',label:'Manpower Request' },
  { key:'skill',   label:'Skill Gap & Development' },
  { key:'critical',label:'Critical Role & Risk' },
  { key:'action',  label:'HR Action Plan' },
  { key:'import',  label:'Import Data' },
]

function isOverload(d) { return d.hrs > 45 || d.status.toLowerCase().includes('overload') || d.status.includes('ท่วม') }

function CT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color = '#78c045' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: color + '22', color }}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── EXECUTIVE DASHBOARD ───────────────────────────────────────────────────────
function ExecTab({ data }) {
  const buStats = useMemo(() => Object.entries(BUS).map(([key, cfg]) => {
    const ppl = data.filter(d => d.bu === key)
    const overload = ppl.filter(isOverload).length
    const ok = ppl.length - overload
    const highRisk = ppl.filter(d => d.risk === 'สูง').length
    const crNoBk = ppl.filter(d => d.cr && !d.bk).length
    return { bu: key, label: cfg.label, color: cfg.color, total: ppl.length, overload, ok, highRisk, crNoBk }
  }).filter(d => d.total > 0), [data])

  const kpis = useMemo(() => ({
    total: data.length,
    bus: buStats.length,
    overload: data.filter(isOverload).length,
    addReq: data.filter(d => d.oy >= 3).length,
    crNoBk: data.filter(d => d.cr && !d.bk).length,
    crTotal: data.filter(d => d.cr).length,
    highRisk: data.filter(d => d.risk === 'สูง').length,
  }), [data, buStats])

  const riskData = [
    { name: 'สูง',      value: data.filter(d => d.risk === 'สูง').length,                            color: '#ef4444' },
    { name: 'ปานกลาง', value: data.filter(d => d.risk === 'ปานกลาง' || d.risk === 'ปานกลาย').length, color: '#f59e0b' },
    { name: 'ต่ำ',      value: data.filter(d => d.risk === 'ต่ำ').length,                             color: '#22c55e' },
  ]

  const skillGapData = [
    { cat: 'AI / Automation / Data', count: 28 },
    { cat: 'Digital / Content',      count: 19 },
    { cat: 'Technology / Dev',        count: 18 },
    { cat: 'Sales / Marketing',       count: 14 },
    { cat: 'Leadership / Coaching',   count: 6 },
    { cat: 'Finance / Compliance',    count: 5 },
  ]

  const aiData = [
    { cat: 'เพิ่มประสิทธิภาพกระบวนการ', count: 42 },
    { cat: 'วิเคราะห์ข้อมูลและรายงาน',  count: 31 },
    { cat: 'การตลาดและภาษา',            count: 27 },
    { cat: 'บริการลูกค้าอัตโนมัติ',     count: 18 },
    { cat: 'พัฒนาผลิตภัณฑ์/นวัตกรรม',  count: 15 },
  ]

  const pct = (n, t) => t > 0 ? Math.round(n / t * 100) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon="👥" label="จำนวนผู้ตอบ" value={kpis.total} sub={`100% ของเป้าหมาย`} color={GREEN} />
        <KpiCard icon="🏢" label="BU ที่เข้าร่วม" value={kpis.bus} sub={`จาก 7 BU หลัก`} color="#6366f1" />
        <KpiCard icon="⚠️" label="กำลังคนไม่เพียงพอ" value={kpis.overload} sub={`${pct(kpis.overload, kpis.total)}% ของทั้งหมด`} color="#f59e0b" />
        <KpiCard icon="➕" label="คำขอเพิ่มกำลังคน" value={kpis.addReq} sub={`Optimize Yes ≥ 3`} color="#3b82f6" />
        <KpiCard icon="⭐" label="Critical Role ไม่มี Backup" value={kpis.crNoBk} sub={`${pct(kpis.crNoBk, kpis.crTotal)}% ของ Critical Role`} color="#ef4444" />
        <KpiCard icon="🚨" label="ความเสี่ยงสูง" value={kpis.highRisk} sub={`${pct(kpis.highRisk, kpis.total)}% ของทั้งหมด`} color="#dc2626" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">สถานะกำลังคนแยกตาม BU</h3>
          <p className="text-[10px] text-gray-400 mb-2">หน่วย: คน</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={buStats} layout="vertical" barSize={10} margin={{ left:0, right:30, top:0, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:9 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize:9, fill:'#374151' }} tickLine={false} axisLine={false} width={95} />
              <Tooltip content={<CT />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize:9 }} />
              <Bar dataKey="ok"       name="เพียงพอ"    fill={GREEN}   stackId="a" />
              <Bar dataKey="overload" name="ไม่เพียงพอ" fill="#f59e0b" stackId="a" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Skill Gap ตามประเด็นสำคัญ</h3>
          <p className="text-[10px] text-gray-400 mb-2">จำนวนทีม</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={skillGapData} barSize={16} margin={{ left:-10, right:20, top:5, bottom:45 }}>
              <XAxis dataKey="cat" tick={{ fontSize:8, fill:'#374151' }} angle={-30} textAnchor="end" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="count" name="ทีม" fill={GREEN} radius={[4,4,0,0]}>
                <LabelList dataKey="count" position="top" style={{ fontSize:9 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">ระดับความเสี่ยงกำลังคน</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {riskData.map((r, i) => <Cell key={i} fill={r.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} คน`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-gray-700">{riskData.reduce((a,b)=>a+b.value,0)}</span>
                <span className="text-[9px] text-gray-400">คน</span>
              </div>
            </div>
            <div className="ml-4 space-y-2">
              {riskData.map(r => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="text-xs text-gray-600">{r.name}</span>
                  <span className="text-xs font-bold ml-1" style={{ color: r.color }}>{r.value} ({pct(r.value, riskData.reduce((a,b)=>a+b.value,0))}%)</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">BU ที่ต้องติดตาม</h3>
            <table className="w-full text-[10px]">
              <thead><tr className="border-b border-gray-100">
                {['BU','คน','ไม่เพียงพอ','เสี่ยงสูง'].map(h=><th key={h} className="text-left py-1 px-1 text-gray-400">{h}</th>)}
              </tr></thead>
              <tbody>
                {buStats.sort((a,b)=>b.highRisk-a.highRisk).slice(0,4).map(r => (
                  <tr key={r.bu} className="border-b border-gray-50">
                    <td className="py-1 px-1"><span className="px-1 py-0.5 rounded text-[9px]" style={{ background: r.color+'22', color: r.color }}>{r.bu}</span></td>
                    <td className="py-1 px-1 text-center text-gray-600">{r.total}</td>
                    <td className="py-1 px-1 text-center font-bold text-orange-500">{r.overload}</td>
                    <td className="py-1 px-1 text-center font-bold text-red-500">{r.highRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">โอกาสจาก AI / Automation</h3>
          <p className="text-[10px] text-gray-400 mb-2">จำนวนทีมที่เห็นโอกาส</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={aiData} barSize={18} margin={{ left:-10, right:20, top:5, bottom:45 }}>
              <XAxis dataKey="cat" tick={{ fontSize:8, fill:'#374151' }} angle={-30} textAnchor="end" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:9 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CT />} />
              <Bar dataKey="count" name="ทีม" fill="#6366f1" radius={[4,4,0,0]}>
                <LabelList dataKey="count" position="top" style={{ fontSize:9 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a3d0a] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-[#78c045] flex items-center justify-center text-base">💡</span>
            <span className="font-semibold text-sm">Executive Insight</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-200">
            <p className="flex gap-2"><span className="text-[#78c045]">🎯</span><span>{kpis.overload} คน ({pct(kpis.overload,kpis.total)}%) กำลังคนไม่เพียงพอ</span></p>
            <p className="flex gap-2"><span className="text-[#78c045]">⭐</span><span>{kpis.crNoBk} Critical Role ไม่มี Backup</span></p>
            <p className="flex gap-2"><span className="text-[#78c045]">📊</span><span>Skill Gap AI/Data เกี่ยวข้อง 28 ทีม</span></p>
            <p className="flex gap-2"><span className="text-red-400">🚨</span><span>{kpis.highRisk} ทีม ความเสี่ยงสูง</span></p>
            <p className="flex gap-2"><span className="text-[#78c045]">🤖</span><span>42 ทีมเห็นโอกาส AI</span></p>
            <p className="flex gap-2"><span className="text-[#78c045]">✅</span><span>53 คน ครอบคลุม 7 BU</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TEAM DASHBOARD ─────────────────────────────────────────────────────────────
function TeamTab({ data }) {
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState(null)

  const filtered = useMemo(() => data.filter(d => {
    const q = search.toLowerCase()
    return !q || d.name.toLowerCase().includes(q) || d.pos.toLowerCase().includes(q) || d.nick.includes(q)
  }), [data, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / ตำแหน่ง..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:border-[#78c045]" />
        <span className="text-xs text-gray-400">แสดง {filtered.length} / {data.length} คน</span>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>{['#','ชื่อ','ชื่อเล่น','ตำแหน่ง','BU','ฝ่าย','ชม./สัปดาห์','SG','Opt Yes','CR','Backup','เสี่ยง','ดู'].map(h=>(
                <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-400">{i+1}</td>
                  <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{d.name}</td>
                  <td className="py-2 px-2 text-gray-400">{d.nick}</td>
                  <td className="py-2 px-2 text-gray-600 max-w-36 truncate">{d.pos}</td>
                  <td className="py-2 px-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: (BUS[d.bu]?.color||'#9ca3af')+'22', color: BUS[d.bu]?.color||'#374151' }}>
                      {d.bu}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-500 max-w-28 truncate">{d.dept}</td>
                  <td className="py-2 px-2">
                    <span className={`font-medium ${d.hrs > 60 ? 'text-red-600' : d.hrs > 45 ? 'text-orange-500' : 'text-gray-700'}`}>{d.hrs}</span>
                  </td>
                  <td className="py-2 px-2 text-center">{d.sg > 0 ? <span className="text-red-600 font-bold">{d.sg}</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="py-2 px-2 text-center text-green-600 font-medium">{d.oy}</td>
                  <td className="py-2 px-2 text-center">{d.cr ? '⭐' : '—'}</td>
                  <td className="py-2 px-2 text-center">{d.cr ? (d.bk ? <span className="text-green-500">✓</span> : <span className="text-red-500">✗</span>) : '—'}</td>
                  <td className="py-2 px-2">
                    <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: (RISK_COLORS[d.risk]||'#9ca3af')+'22', color: RISK_COLORS[d.risk]||'#374151' }}>
                      {d.risk}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <button onClick={() => setSel(d)} className="text-blue-500 hover:underline text-[10px]">ดู</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center" onClick={() => setSel(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{sel.name} <span className="text-gray-400 text-sm">({sel.nick})</span></h3>
                <p className="text-xs text-gray-500">{sel.pos} · {sel.dept} · BU {sel.bu}</p>
              </div>
              <button onClick={() => setSel(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-bold text-gray-700">{sel.hrs}</p><p className="text-[10px] text-gray-400">ชม./สัปดาห์</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-bold text-green-600">{sel.oy}</p><p className="text-[10px] text-gray-400">Optimize Yes</p></div>
                <div className="bg-gray-50 rounded-lg p-2"><p className="text-lg font-bold text-red-500">{sel.sg}</p><p className="text-[10px] text-gray-400">Skill Gap</p></div>
              </div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">สถานะ</p><p className="text-xs text-gray-700">{sel.status}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">สรุปภาพรวม</p><p className="text-xs text-gray-700">{sel.summary}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">ความกังวล</p><p className="text-xs text-orange-600">{sel.concern}</p></div>
              <div><p className="text-xs font-medium text-gray-500 mb-1">ข้อเสนอแนะ</p><p className="text-xs text-blue-600">{sel.rec}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MANPOWER REQUEST ──────────────────────────────────────────────────────────
function ManpowerTab({ data }) {
  const requests = useMemo(() => data.filter(d => d.oy >= 3 || d.om >= 3).sort((a, b) => (b.oy+b.om)-(a.oy+a.om)), [data])
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
          <p className="text-xs text-gray-500 mt-1">รายการ Optimize Request</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{data.reduce((a,d)=>a+d.oy,0)}</p>
          <p className="text-xs text-gray-500 mt-1">รวม Optimize Yes</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{data.reduce((a,d)=>a+d.om,0)}</p>
          <p className="text-xs text-gray-500 mt-1">รวม Optimize Maybe</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">รายการคำขอ Optimize / เพิ่มกำลังคน</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{['#','ชื่อ','BU','ฝ่าย','ชม./สัปดาห์','Opt Yes','Opt Maybe','Score','เสี่ยง','ข้อเสนอแนะ'].map(h=>(
              <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
            ))}</tr></thead>
            <tbody>
              {requests.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-400">{i+1}</td>
                  <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{d.name}</td>
                  <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: (BUS[d.bu]?.color||'#9ca3af')+'22', color: BUS[d.bu]?.color||'#374151' }}>{d.bu}</span></td>
                  <td className="py-2 px-2 text-gray-500 max-w-28 truncate">{d.dept}</td>
                  <td className="py-2 px-2 text-center font-medium"><span className={d.hrs>60?'text-red-600':d.hrs>45?'text-orange-500':'text-gray-700'}>{d.hrs}</span></td>
                  <td className="py-2 px-2 text-center text-green-600 font-bold">{d.oy}</td>
                  <td className="py-2 px-2 text-center text-blue-500">{d.om}</td>
                  <td className="py-2 px-2 text-center font-bold text-purple-600">{d.oy+d.om}</td>
                  <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: (RISK_COLORS[d.risk]||'#9ca3af')+'22', color: RISK_COLORS[d.risk]||'#374151' }}>{d.risk}</span></td>
                  <td className="py-2 px-2 text-gray-500 max-w-48 truncate">{d.rec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── SKILL GAP ─────────────────────────────────────────────────────────────────
function SkillTab({ data }) {
  const withGap = useMemo(() => data.filter(d => d.sg > 0).sort((a,b)=>b.sg-a.sg), [data])
  const buGap = useMemo(() => Object.entries(BUS).map(([k,v]) => ({
    bu: v.label, gap: data.filter(d=>d.bu===k&&d.sg>0).reduce((s,d)=>s+d.sg,0)
  })).filter(d=>d.gap>0).sort((a,b)=>b.gap-a.gap), [data])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Skill Gap รวมแยกตาม BU</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={buGap} layout="vertical" barSize={14} margin={{ left:0, right:40, top:0, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:9 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="bu" tick={{ fontSize:9, fill:'#374151' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<CT />} />
              <Bar dataKey="gap" name="รวม Skill Gap" fill="#ef4444" radius={[0,4,4,0]}>
                <LabelList dataKey="gap" position="right" style={{ fontSize:10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Optimize Opportunity แยกตาม BU</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={Object.entries(BUS).map(([k,v])=>({
              bu: v.label,
              oy: data.filter(d=>d.bu===k).reduce((s,d)=>s+d.oy,0),
              om: data.filter(d=>d.bu===k).reduce((s,d)=>s+d.om,0),
            })).filter(d=>d.oy+d.om>0).sort((a,b)=>(b.oy+b.om)-(a.oy+a.om))}
              layout="vertical" barSize={8} margin={{ left:0, right:10, top:0, bottom:0 }}>
              <XAxis type="number" tick={{ fontSize:9 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="bu" tick={{ fontSize:9, fill:'#374151' }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<CT />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize:9 }} />
              <Bar dataKey="oy" name="Optimize Yes"   fill={GREEN}   stackId="a" />
              <Bar dataKey="om" name="Optimize Maybe" fill="#93c5fd" stackId="a" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">รายชื่อผู้มี Skill Gap</h3></div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50"><tr>{['ชื่อ','BU','ฝ่าย','Skill Gap','ข้อเสนอ IDP'].map(h=><th key={h} className="text-left py-2 px-3 text-gray-500">{h}</th>)}</tr></thead>
          <tbody>
            {withGap.map(d => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 px-3 font-medium text-gray-700">{d.name}</td>
                <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: (BUS[d.bu]?.color||'#9ca3af')+'22', color: BUS[d.bu]?.color||'#374151' }}>{d.bu}</span></td>
                <td className="py-2 px-3 text-gray-500">{d.dept}</td>
                <td className="py-2 px-3"><div className="flex gap-0.5">{Array(d.sg).fill(0).map((_,i)=><span key={i} className="w-3 h-3 rounded-full bg-red-400 inline-block" />)}</div></td>
                <td className="py-2 px-3 text-blue-600 max-w-72 truncate">{d.rec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── CRITICAL ROLE ─────────────────────────────────────────────────────────────
function CriticalTab({ data }) {
  const [sortCol, setSortCol] = useState('bk')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const critical = useMemo(() => {
    const RISK_ORDER = { สูง: 0, ปานกลาง: 1, ต่ำ: 2 }
    return [...data.filter(d => d.cr)].sort((a, b) => {
      let va, vb
      if (sortCol === 'bk')   { va = a.bk ? 1 : 0;              vb = b.bk ? 1 : 0 }
      else if (sortCol === 'risk') { va = RISK_ORDER[a.risk] ?? 9; vb = RISK_ORDER[b.risk] ?? 9 }
      else { va = a[sortCol] ?? ''; vb = b[sortCol] ?? '' }
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'th')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortCol, sortDir])

  const SortTh = ({ col, label, className = '' }) => (
    <th onClick={() => toggleSort(col)}
      className={`text-left py-2 px-2 font-medium whitespace-nowrap cursor-pointer select-none transition-colors
        ${sortCol === col ? 'text-[#78c045]' : 'text-gray-500 hover:text-gray-800'} ${className}`}>
      {label}
      <span className="ml-0.5 text-[9px]">
        {sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
      </span>
    </th>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Critical Role ทั้งหมด',      val:data.filter(d=>d.cr).length,           color:'#374151' },
          { label:'ไม่มี Backup',               val:data.filter(d=>d.cr&&!d.bk).length,    color:'#ef4444' },
          { label:'มี Backup',                  val:data.filter(d=>d.cr&&d.bk).length,     color:GREEN },
          { label:'เสี่ยงสูง + ไม่มี Backup',  val:data.filter(d=>d.cr&&!d.bk&&d.risk==='สูง').length, color:'#dc2626' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">รายการ Critical Role ทั้งหมด</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>
              <SortTh col="name"    label="ชื่อ" />
              <SortTh col="bu"      label="BU" />
              <SortTh col="dept"    label="ฝ่าย" />
              <SortTh col="hrs"     label="ชม./สัปดาห์" className="text-center" />
              <SortTh col="bk"      label="Backup" className="text-center" />
              <SortTh col="risk"    label="ระดับเสี่ยง" />
              <SortTh col="concern" label="ความกังวล" />
              <SortTh col="rec"     label="ข้อเสนอแนะ" />
            </tr></thead>
            <tbody>
              {critical.map(d => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">{d.name}</td>
                  <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: (BUS[d.bu]?.color||'#9ca3af')+'22', color: BUS[d.bu]?.color||'#374151' }}>{d.bu}</span></td>
                  <td className="py-2 px-2 text-gray-500 max-w-28 truncate">{d.dept}</td>
                  <td className="py-2 px-2 text-center font-medium"><span className={d.hrs>60?'text-red-600':d.hrs>45?'text-orange-500':'text-gray-700'}>{d.hrs}</span></td>
                  <td className="py-2 px-2 text-center">{d.bk ? <span className="text-green-600 font-bold">✓ มี</span> : <span className="text-red-500 font-bold">✗ ไม่มี</span>}</td>
                  <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: (RISK_COLORS[d.risk]||'#9ca3af')+'22', color: RISK_COLORS[d.risk]||'#374151' }}>{d.risk}</span></td>
                  <td className="py-2 px-2 text-orange-600 max-w-40 truncate">{d.concern}</td>
                  <td className="py-2 px-2 text-blue-600 max-w-48 truncate">{d.rec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── HR ACTION PLAN ────────────────────────────────────────────────────────────
function ActionTab() {
  const [actions, setActions] = useState(INIT_ACTIONS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ priority:'P1', issue:'', owners:'', reason:'', action:'', due:'', status:'pending' })

  const save = () => {
    if (!form.issue.trim()) return
    setActions(prev => [...prev, { ...form, id: Date.now() }])
    setForm({ priority:'P1', issue:'', owners:'', reason:'', action:'', due:'', status:'pending' })
    setShowForm(false)
  }
  const updateStatus = (id, status) => setActions(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  const del = id => setActions(prev => prev.filter(a => a.id !== id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">HR Priority Action Plan 2026</h3>
        <button onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-1"
          style={{ background: GREEN }}>＋ เพิ่ม Action Plan
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">เพิ่ม Action Plan ใหม่</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]">
                <option>P0</option><option>P1</option><option>P2</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">วันที่ครบกำหนด</label>
              <input type="date" value={form.due} onChange={e=>setForm({...form,due:e.target.value})} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]" />
            </div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500 mb-1 block">ประเด็น</label>
              <input value={form.issue} onChange={e=>setForm({...form,issue:e.target.value})} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]" placeholder="ชื่อประเด็น..." />
            </div>
            <div className="sm:col-span-2"><label className="text-xs text-gray-500 mb-1 block">ชื่อผู้เกี่ยวข้อง</label>
              <input value={form.owners} onChange={e=>setForm({...form,owners:e.target.value})} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]" placeholder="ชื่อ 1, ชื่อ 2, ..." />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">เหตุผล</label>
              <textarea value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]" placeholder="เหตุผล..." />
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Action 30 วัน</label>
              <textarea value={form.action} onChange={e=>setForm({...form,action:e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#78c045]" placeholder="แผนดำเนินการ..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowForm(false)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600">ยกเลิก</button>
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-sm text-white font-medium" style={{ background: GREEN }}>บันทึก</button>
          </div>
        </div>
      )}

      {['P0','P1','P2'].map(p => (
        <div key={p}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{p} — {p==='P0'?'เร่งด่วนสุด':p==='P1'?'สำคัญมาก':'สำคัญ'}</h4>
          <div className="space-y-2">
            {actions.filter(a=>a.priority===p).map(a => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</span>
                    <span className="font-semibold text-sm text-gray-800">{a.issue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={a.status} onChange={e=>updateStatus(a.id,e.target.value)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer ${STATUS_COLORS[a.status]}`}>
                      <option value="pending">รอดำเนินการ</option>
                      <option value="in_progress">กำลังดำเนินการ</option>
                      <option value="done">เสร็จแล้ว</option>
                    </select>
                    <button onClick={()=>del(a.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="font-medium text-gray-500">ผู้เกี่ยวข้อง: </span>{a.owners}</div>
                  {a.due && <div><span className="font-medium text-gray-500">ครบกำหนด: </span>{a.due}</div>}
                  <div><span className="font-medium text-gray-500">เหตุผล: </span>{a.reason}</div>
                  <div><span className="font-medium text-gray-500">Action 30 วัน: </span>{a.action}</div>
                </div>
              </div>
            ))}
            {actions.filter(a=>a.priority===p).length === 0 && <p className="text-xs text-gray-400 py-2 px-3">ยังไม่มี Action Plan ระดับ {p}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── IMPORT DATA ───────────────────────────────────────────────────────────────
function ImportTab() {
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState(null)
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">อัปโหลดไฟล์ข้อมูล Capacity Workbook</h3>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${drag ? 'border-[#78c045] bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
          onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f?.name.endsWith('.xlsx'))setFile(f)}}
          onClick={()=>document.getElementById('wf-upload').click()}
        >
          <div className="text-4xl mb-3">📊</div>
          {file ? (
            <div>
              <p className="font-medium text-green-600">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size/1024).toFixed(1)} KB</p>
              <button className="mt-3 px-4 py-1.5 rounded-lg text-sm text-white font-medium" style={{background:GREEN}} onClick={e=>{e.stopPropagation();alert('ระบบรองรับ Static data — กรุณาแจ้ง Developer ให้ update ไฟล์ Workforce.jsx')}}>
                ประมวลผล
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">ลากไฟล์ .xlsx มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-xs text-gray-400 mt-1">รองรับ: Capacity_Workbook .xlsx เท่านั้น</p>
            </>
          )}
          <input id="wf-upload" type="file" accept=".xlsx" className="hidden" onChange={e=>{const f=e.target.files[0];if(f)setFile(f)}} />
        </div>
      </div>
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-medium mb-2">📋 โครงสร้างข้อมูลที่รองรับ</p>
        <p className="mb-1"><strong>แยกรายเดือน:</strong> ม.ค. – ธ.ค. (12 เดือน)</p>
        <p className="mb-1"><strong>BU (7 หน่วย):</strong> Center · Content · IR Plus · efin.finance · IT Solution · ATESS · XPert</p>
        <p className="mb-1"><strong>ฝ่าย (18 ฝ่าย):</strong> News · Creative Design · Trade IT-Dev · IT-Development · IT-Operation · IT Solution · BD · Marketing · Sale · IR Plus · Event&amp;Community · Admin HR · ACC &amp; Purchase · Outsource · ATESS-ไทย · ATESS-จีน · efin Xpert · SMT</p>
        <p className="mt-2 text-blue-500">ข้อมูลปัจจุบัน: Workforce Capacity Survey 2026 — 53 คน</p>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Workforce() {
  const [tab, setTab] = useState('exec')
  const [filters, setFilters] = useState({ month: 'all', bu: 'all', dept: 'all', risk: 'all' })
  const [nickMap, setNickMap] = useState({})

  // ดึงชื่อเล่นจาก DB (first_name_en + last_name_en → nickname)
  useEffect(() => {
    supabase
      .from('hr_employees')
      .select('first_name_en, last_name_en, nickname')
      .eq('status', 'active')
      .then(({ data: rows }) => {
        if (!rows) return
        const map = {}
        rows.forEach(r => {
          const key = `${r.first_name_en || ''} ${r.last_name_en || ''}`.trim()
          if (key && r.nickname) map[key] = r.nickname
        })
        setNickMap(map)
      })
  }, [])

  const data = useMemo(() => SURVEY_DATA
    .map(d => ({ ...d, nick: nickMap[d.name] || d.nick }))
    .filter(d => {
      if (filters.bu !== 'all' && d.bu !== filters.bu) return false
      if (filters.dept !== 'all' && d.dept !== filters.dept) return false
      if (filters.risk !== 'all' && d.risk !== filters.risk) return false
      return true
    }), [filters, nickMap])

  const setF = (key, val) => setFilters(p => ({ ...p, [key]: val }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Workforce</h1>
          <p className="text-xs text-gray-400 mt-0.5">Workforce Capacity Survey 2026 — 53 คน · 7 BU · 18 ฝ่าย</p>
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Survey Data 2026</span>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">เดือน</span>
          <select value={filters.month} onChange={e=>setF('month',e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#78c045]">
            <option value="all">ทั้งปี</option>
            {MONTHS.map((m,i) => <option key={i} value={String(i+1)}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">BU</span>
          <select value={filters.bu} onChange={e=>setF('bu',e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#78c045]">
            <option value="all">ทั้งหมด</option>
            {Object.entries(BUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">ฝ่าย</span>
          <select value={filters.dept} onChange={e=>setF('dept',e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#78c045]">
            <option value="all">ทั้งหมด</option>
            {ALL_DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">ความเสี่ยง</span>
          <select value={filters.risk} onChange={e=>setF('risk',e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#78c045]">
            <option value="all">ทั้งหมด</option>
            <option value="สูง">สูง</option>
            <option value="ปานกลาง">ปานกลาง</option>
            <option value="ต่ำ">ต่ำ</option>
          </select>
        </div>

        <button onClick={() => setFilters({ month:'all', bu:'all', dept:'all', risk:'all' })}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1 ml-auto">
          🔄 รีเฟรช
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? 'border-[#78c045] text-[#78c045]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'exec'     && <ExecTab    data={data} />}
      {tab === 'team'     && <TeamTab    data={data} />}
      {tab === 'manpower' && <ManpowerTab data={data} />}
      {tab === 'skill'    && <SkillTab   data={data} />}
      {tab === 'critical' && <CriticalTab data={data} />}
      {tab === 'action'   && <ActionTab  />}
      {tab === 'import'   && <ImportTab  />}
    </div>
  )
}

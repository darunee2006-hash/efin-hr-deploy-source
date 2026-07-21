# EFIN HR — เอกสารภาพรวมระบบ

ระบบบริหารทรัพยากรบุคคล (HR Management System) ของ eFinance Thai พัฒนาเป็นเว็บแอปพลิเคชัน รองรับ 2 ภาษา (ไทย/อังกฤษ) และแบ่งสิทธิ์การเข้าถึงตามระดับผู้ใช้งาน

- **Production URL:** https://efin-hr-deploy.vercel.app/
- **โฟลเดอร์ซอร์สโค้ด:** `C:\hrsrc`

## เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS 4 |
| Backend / Database | Supabase (PostgreSQL + Auth) |
| Routing | React Router DOM 7 |
| ไอคอน | lucide-react |
| กราฟ/แผนภูมิ | Recharts |
| นำเข้า/ส่งออกข้อมูล | Papaparse (CSV), SheetJS/xlsx (Excel), jsPDF (PDF) |
| Desktop build (ทางเลือก) | Electron + electron-builder (แพ็กเป็นโปรแกรม Windows แบบ portable) |
| Hosting | Vercel |

## ระดับสิทธิ์ผู้ใช้งาน (Roles)

ระบบมี 4 ระดับสิทธิ์ เรียงจากสูงสุดไปต่ำสุด:

1. **Super User** — เข้าถึงได้ทุกอย่างรวมถึงเมนู Payroll และ Cost Analysis
2. **Admin** — เข้าถึงได้เกือบทุกเมนู รวมเมนูผู้ดูแลระบบ (จัดการผู้ใช้, จัดการบริษัท, จัดการวันหยุด)
3. **Manager** — เห็นเมนูระดับทีม/แผนก เช่น Workforce, Org Chart, Recruitment, Reports
4. **Employee** — เห็นเฉพาะเมนูส่วนตัว เช่น Dashboard, Leave, Time Attendance, My Documents

หน้าที่แสดงจะถูกกรองอัตโนมัติตามสิทธิ์ของผู้ใช้ที่ login เข้ามา (กำหนดไว้ใน `src/App.jsx` และ `src/components/Layout.jsx`)

## รายการหน้า/ฟีเจอร์ทั้งหมด

### งานส่วนตัว (ทุกระดับเห็น)
- **Dashboard** — หน้าแรก สรุปข้อมูลภาพรวม
- **Time Attendance** — บันทึกเวลาเข้า-ออกงาน
- **Leave** — ยื่น/ติดตามการลา
- **Performance** — ประเมินผลการปฏิบัติงาน
- **Training** — ข้อมูลการฝึกอบรม
- **Welfare** — สวัสดิการพนักงาน
- **Documents** — เอกสารทั่วไป
- **My Documents** — เอกสารส่วนตัวของพนักงาน
- **Announcements** — ประกาศจากบริษัท
- **Expenses** — เบิกค่าใช้จ่าย

### งานระดับหัวหน้างานขึ้นไป (Manager+)
- **Workforce** — ภาพรวมกำลังคน
- **Employees** — ข้อมูลพนักงานทั้งหมด
- **Org Chart** — โครงสร้างองค์กร (แผนผังตำแหน่ง/สายบังคับบัญชา)
- **Recruitment** — งานสรรหาบุคลากร
- **Reports** — รายงานต่างๆ
- **Onboarding** — ขั้นตอนต้อนรับพนักงานใหม่
- **Offboarding** — ขั้นตอนพ้นสภาพพนักงาน
- **Employee Relations** — แรงงานสัมพันธ์
- **OT Calculation** — คำนวณค่าล่วงเวลา

### งานเฉพาะ Super User
- **Payroll** — ระบบเงินเดือน
- **Cost Analysis** — วิเคราะห์ต้นทุนบุคลากร

### งานผู้ดูแลระบบ (Admin)
- **User Management** — จัดการบัญชีผู้ใช้และสิทธิ์
- **Company Management** — จัดการข้อมูลบริษัท/นิติบุคคลในเครือ
- **Holiday Management** — จัดการวันหยุดประจำปี

## โครงสร้างโปรเจกต์ (สรุป)

```
hrsrc/
├── src/
│   ├── App.jsx              # จุดเริ่มต้น กำหนดสิทธิ์การเห็นหน้าตาม role
│   ├── main.jsx              # entry point ของ React
│   ├── components/
│   │   ├── Layout.jsx        # โครง sidebar + header + เมนู
│   │   ├── PageUI.jsx        # UI components ที่ใช้ร่วมกันหลายหน้า
│   │   ├── UI.jsx
│   │   ├── ImportExport.jsx  # นำเข้า/ส่งออกข้อมูล
│   │   └── ErrorBoundary.jsx
│   ├── pages/                 # แต่ละไฟล์ = 1 หน้าเมนู (26 หน้า)
│   ├── lib/
│   │   ├── supabase.js        # การเชื่อมต่อฐานข้อมูล Supabase
│   │   ├── AuthContext.jsx    # ระบบ login/สิทธิ์ผู้ใช้
│   │   ├── CompanyFilterContext.jsx  # ตัวกรองบริษัทในเครือ
│   │   ├── translations.js    # ข้อความสองภาษา (ไทย/อังกฤษ)
│   │   └── hooks.js
│   ├── utils/nameHelper.js
│   └── assets/                # โลโก้, ฟอนต์ (FC Minimal), รูปภาพ
├── public/
├── package.json
├── vite.config.js             # ตั้งค่า Vite + Tailwind plugin
└── electron-builder.json      # ตั้งค่าแพ็กเป็นโปรแกรม desktop (ถ้าต้องการ)
```

## การรองรับหลายบริษัท (Multi-company)

ระบบรองรับการกรองข้อมูลตาม "บริษัทในเครือ" ผ่าน `CompanyFilterContext` — ถ้าผู้ใช้มีสิทธิ์เห็นมากกว่า 1 บริษัท จะมี dropdown เลือกบริษัทที่มุมขวาบนของหน้าจอ

## การ Deploy

เว็บ deploy อยู่บน Vercel โปรเจกต์ชื่อ `efin-hr-deploy` ปัจจุบัน deploy ผ่านการอัปโหลดไฟล์โดยตรง (ไม่ได้เชื่อมกับ Git repository) การอัปเดตโค้ดครั้งต่อไปจึงต้อง deploy ผ่าน Vercel CLI (`vercel deploy --prod`) จากเครื่องที่มี Node.js ติดตั้งอยู่ พร้อม Vercel access token

---
*เอกสารนี้สร้างจากการสำรวจโครงสร้างโค้ดจริงในโฟลเดอร์ ณ วันที่ 20 กรกฎาคม 2569*

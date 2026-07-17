import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Laptop,
  Monitor,
  Plus,
  Edit2,
  Trash2,
  Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import {
  Badge,
  Card,
  Button,
  Modal,
  SearchInput,
  Select,
  Input,
  Table,
  LoadingSpinner,
  StatCard,
} from '../components/UI';
import { t, T } from '../lib/translations';
import { fmt, fmtDate, insertRow, updateRow, deleteRow } from '../lib/hooks';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { exportToExcel, ImportModal, ImportExportButtons } from '../components/ImportExport';

export default function Assets({ lang }) {
  const { filterByCompany } = useCompanyFilter();
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const categories = [
    { value: 'laptop', label: lang === 'th' ? 'แล็ปท็อป' : 'Laptop' },
    { value: 'desktop', label: lang === 'th' ? 'เดสก์ท็อป' : 'Desktop' },
    { value: 'monitor', label: lang === 'th' ? 'จอมอนิเตอร์' : 'Monitor' },
    { value: 'phone', label: lang === 'th' ? 'โทรศัพท์' : 'Phone' },
    { value: 'tablet', label: lang === 'th' ? 'แท็บเล็ต' : 'Tablet' },
    { value: 'vehicle', label: lang === 'th' ? 'ยานพาหนะ' : 'Vehicle' },
    { value: 'furniture', label: lang === 'th' ? 'เฟอร์นิเจอร์' : 'Furniture' },
    { value: 'equipment', label: lang === 'th' ? 'อุปกรณ์' : 'Equipment' },
    { value: 'software', label: lang === 'th' ? 'ซอฟต์แวร์' : 'Software' },
    { value: 'other', label: lang === 'th' ? 'อื่น ๆ' : 'Other' },
  ];

  const statuses = [
    { value: 'available', label: lang === 'th' ? 'ว่าง' : 'Available' },
    { value: 'assigned', label: lang === 'th' ? 'มอบหมายแล้ว' : 'Assigned' },
    { value: 'maintenance', label: lang === 'th' ? 'ซ่อมบำรุง' : 'Maintenance' },
    { value: 'disposed', label: lang === 'th' ? 'จำหน่ายแล้ว' : 'Disposed' },
  ];

  const conditions = [
    { value: 'new', label: lang === 'th' ? 'ใหม่' : 'New', color: 'green' },
    { value: 'good', label: lang === 'th' ? 'ดี' : 'Good', color: 'blue' },
    { value: 'fair', label: lang === 'th' ? 'ปานกลาง' : 'Fair', color: 'yellow' },
    { value: 'poor', label: lang === 'th' ? 'ต่ำ' : 'Poor', color: 'orange' },
    { value: 'damaged', label: lang === 'th' ? 'เสียหาย' : 'Damaged', color: 'red' },
  ];

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('hr_assets')
        .select('*')
        .order('asset_code', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, employee_code, first_name_en, last_name_en, first_name_th, last_name_th, nickname, company_entity')
        .eq('status', 'active')
        .order('first_name_en', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  function getEmptyFormData() {
    return {
      asset_code: '',
      asset_name: '',
      category: '',
      brand: '',
      model: '',
      serial_number: '',
      assigned_to: '',
      condition: 'new',
      status: 'available',
      purchase_price: '',
      purchase_date: '',
      warranty_end: '',
      notes: '',
    };
  }

  const getEmployeeName = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return '-';
    if (lang === 'th') {
      return `${emp.first_name_th} ${emp.last_name_th}`;
    }
    return `${emp.first_name_en} ${emp.last_name_en}`;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      available: 'green',
      assigned: 'blue',
      maintenance: 'yellow',
      disposed: 'gray',
    };
    return colors[status] || 'gray';
  };

  const getConditionBadgeColor = (condition) => {
    const colors = {
      new: 'green',
      good: 'blue',
      fair: 'yellow',
      poor: 'orange',
      damaged: 'red',
    };
    return colors[condition] || 'gray';
  };

  // Company-filtered employees
  const companyFilteredEmployees = useMemo(() => filterByCompany(employees), [employees, filterByCompany]);

  // Company-filtered assets (filter by assigned employee's company)
  const companyFilteredAssets = useMemo(() => {
    const filteredEmpIds = new Set(companyFilteredEmployees.map(e => e.id));
    return assets.filter(asset => !asset.assigned_to || filteredEmpIds.has(asset.assigned_to));
  }, [assets, companyFilteredEmployees]);

  const filteredAssets = useMemo(() => {
    return companyFilteredAssets.filter((asset) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        asset.asset_code?.toLowerCase().includes(searchLower) ||
        asset.asset_name?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower);

      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [companyFilteredAssets, searchTerm, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: companyFilteredAssets.length,
      assigned: companyFilteredAssets.filter((a) => a.status === 'assigned').length,
      available: companyFilteredAssets.filter((a) => a.status === 'available').length,
      maintenance: companyFilteredAssets.filter((a) => a.status === 'maintenance').length,
    };
  }, [companyFilteredAssets]);

  const conditionSummary = useMemo(() => {
    const summary = {};
    conditions.forEach((c) => {
      summary[c.value] = companyFilteredAssets.filter((a) => a.condition === c.value).length;
    });
    return Object.entries(summary)
      .filter(([, count]) => count > 0)
      .map(([condition, count]) => ({
        name: conditions.find((c) => c.value === condition)?.label || condition,
        value: count,
      }));
  }, [companyFilteredAssets]);

  const categoryDistribution = useMemo(() => {
    const dist = {};
    categories.forEach((c) => {
      dist[c.value] = companyFilteredAssets.filter((a) => a.category === c.value).length;
    });
    return Object.entries(dist)
      .filter(([, count]) => count > 0)
      .map(([cat, count]) => ({
        name: categories.find((c) => c.value === cat)?.label || cat,
        value: count,
      }));
  }, [companyFilteredAssets]);

  const handleOpenAddModal = () => {
    setSelectedAsset(null);
    setFormData(getEmptyFormData());
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (asset) => {
    setSelectedAsset(asset);
    setFormData({ ...asset });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.asset_code?.trim()) errors.asset_code = 'Required';
    if (!formData.asset_name?.trim()) errors.asset_name = 'Required';
    if (!formData.category) errors.category = 'Required';
    if (formData.purchase_price && isNaN(parseFloat(formData.purchase_price))) {
      errors.purchase_price = 'Must be a number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      };

      if (selectedAsset?.id) {
        await updateRow('hr_assets', selectedAsset.id, payload);
      } else {
        await insertRow('hr_assets', payload);
      }

      setShowAddModal(false);
      setSelectedAsset(null);
      setFormData(getEmptyFormData());
      await fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (asset) => {
    if (
      window.confirm(
        `${lang === 'th' ? 'ยืนยันการลบ' : 'Confirm delete'}\n${asset.asset_name} (${asset.asset_code})?`
      )
    ) {
      handleDelete(asset);
    }
  };

  const handleDelete = async (asset) => {
    try {
      await deleteRow('hr_assets', asset.id);
      await fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleExport = () => {
    const exportColumns = [
      {
        accessor: 'asset_code',
        header: lang === 'th' ? 'รหัสทรัพย์สิน' : 'Asset Code',
        width: 12
      },
      {
        accessor: 'asset_name',
        header: lang === 'th' ? 'ชื่อทรัพย์สิน' : 'Asset Name',
        width: 20
      },
      {
        accessor: (row) => categories.find(c => c.value === row.category)?.label || row.category,
        header: lang === 'th' ? 'หมวดหมู่' : 'Category',
        width: 14
      },
      {
        accessor: 'brand',
        header: lang === 'th' ? 'แบรนด์' : 'Brand',
        width: 12
      },
      {
        accessor: 'model',
        header: lang === 'th' ? 'รุ่น' : 'Model',
        width: 12
      },
      {
        accessor: 'serial_number',
        header: lang === 'th' ? 'หมายเลขซีเรียล' : 'Serial Number',
        width: 16
      },
      {
        accessor: (row) => getEmployeeName(row.assigned_to),
        header: lang === 'th' ? 'ผู้รับผิดชอบ' : 'Assigned To',
        width: 18
      },
      {
        accessor: (row) => conditions.find(c => c.value === row.condition)?.label || row.condition,
        header: lang === 'th' ? 'สภาพ' : 'Condition',
        width: 10
      },
      {
        accessor: (row) => statuses.find(s => s.value === row.status)?.label || row.status,
        header: lang === 'th' ? 'สถานะ' : 'Status',
        width: 12
      },
      {
        accessor: 'purchase_price',
        header: lang === 'th' ? 'ราคาซื้อ' : 'Purchase Price',
        width: 12
      },
      {
        accessor: 'purchase_date',
        header: lang === 'th' ? 'วันที่ซื้อ' : 'Purchase Date',
        width: 14
      },
      {
        accessor: 'warranty_end',
        header: lang === 'th' ? 'สิ้นสุดการรับประกัน' : 'Warranty End',
        width: 14
      },
      {
        accessor: 'notes',
        header: lang === 'th' ? 'หมายเหตุ' : 'Notes',
        width: 20
      },
    ];

    exportToExcel({
      data: assets,
      columns: exportColumns,
      filename: `assets-${lang === 'th' ? 'ทรัพย์สิน' : 'list'}`,
      sheetName: lang === 'th' ? 'ทรัพย์สิน' : 'Assets'
    });
  };

  const importColumns = [
    {
      header: lang === 'th' ? 'รหัสทรัพย์สิน' : 'Asset Code',
      headerEn: 'Asset Code',
      accessor: 'asset_code',
      dbField: 'asset_code',
      example: 'AST-001',
    },
    {
      header: lang === 'th' ? 'ชื่อทรัพย์สิน' : 'Asset Name',
      headerEn: 'Asset Name',
      accessor: 'asset_name',
      dbField: 'asset_name',
      example: 'MacBook Pro 14"',
    },
    {
      header: lang === 'th' ? 'หมวดหมู่' : 'Category',
      headerEn: 'Category',
      accessor: 'category',
      dbField: 'category',
      example: 'laptop',
    },
    {
      header: lang === 'th' ? 'แบรนด์' : 'Brand',
      headerEn: 'Brand',
      accessor: 'brand',
      dbField: 'brand',
      example: 'Apple',
    },
    {
      header: lang === 'th' ? 'รุ่น' : 'Model',
      headerEn: 'Model',
      accessor: 'model',
      dbField: 'model',
      example: 'M2 Pro',
    },
    {
      header: lang === 'th' ? 'หมายเลขซีเรียล' : 'Serial Number',
      headerEn: 'Serial Number',
      accessor: 'serial_number',
      dbField: 'serial_number',
      example: 'ABC123XYZ',
    },
    {
      header: lang === 'th' ? 'สถานะ' : 'Status',
      headerEn: 'Status',
      accessor: 'status',
      dbField: 'status',
      example: 'assigned',
    },
    {
      header: lang === 'th' ? 'สภาพ' : 'Condition',
      headerEn: 'Condition',
      accessor: 'condition',
      dbField: 'condition',
      example: 'good',
    },
    {
      header: lang === 'th' ? 'ราคาซื้อ' : 'Purchase Price',
      headerEn: 'Purchase Price',
      accessor: 'purchase_price',
      dbField: 'purchase_price',
      transform: (val) => parseFloat(val),
      example: '45000',
    },
    {
      header: lang === 'th' ? 'วันที่ซื้อ' : 'Purchase Date',
      headerEn: 'Purchase Date',
      accessor: 'purchase_date',
      dbField: 'purchase_date',
      example: '2023-01-15',
    },
    {
      header: lang === 'th' ? 'สิ้นสุดการรับประกัน' : 'Warranty End',
      headerEn: 'Warranty End',
      accessor: 'warranty_end',
      dbField: 'warranty_end',
      example: '2024-01-15',
    },
    {
      header: lang === 'th' ? 'หมายเหตุ' : 'Notes',
      headerEn: 'Notes',
      accessor: 'notes',
      dbField: 'notes',
      example: 'Assigned to John Doe',
    },
  ];

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleImport = async (mappedData) => {
    try {
      let insertedCount = 0;
      for (const row of mappedData) {
        const payload = {
          asset_code: row.asset_code || '',
          asset_name: row.asset_name || '',
          category: row.category || '',
          brand: row.brand || '',
          model: row.model || '',
          serial_number: row.serial_number || '',
          status: row.status || 'available',
          condition: row.condition || 'new',
          purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
          purchase_date: row.purchase_date || '',
          warranty_end: row.warranty_end || '',
          notes: row.notes || '',
          assigned_to: null,
        };

        await insertRow('hr_assets', payload);
        insertedCount++;
      }
      await fetchAssets();
      return insertedCount;
    } catch (error) {
      console.error('Error importing assets:', error);
      throw error;
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {lang === 'th' ? 'ทรัพย์สิน' : 'Assets'}
        </h1>
        <div className="flex gap-3 items-center">
          <ImportExportButtons
            onExport={handleExport}
            onImportClick={handleImportClick}
            lang={lang}
          />
          <Button onClick={handleOpenAddModal}>
            <Plus size={18} />
            {lang === 'th' ? 'เพิ่มทรัพย์สิน' : 'Add Asset'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label={lang === 'th' ? 'ทรัพย์สินทั้งหมด' : 'Total Assets'}
          value={stats.total}
          color="indigo"
        />
        <StatCard
          icon={Laptop}
          label={lang === 'th' ? 'มอบหมายแล้ว' : 'Assigned'}
          value={stats.assigned}
          color="blue"
        />
        <StatCard
          icon={Monitor}
          label={lang === 'th' ? 'ว่าง' : 'Available'}
          value={stats.available}
          color="green"
        />
        <StatCard
          icon={Package}
          label={lang === 'th' ? 'ซ่อมบำรุง' : 'Maintenance'}
          value={stats.maintenance}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card
          title={lang === 'th' ? 'การกระจายตามหมวดหมู่' : 'Category Distribution'}
        >
          {categoryDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-400">
              {lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}
            </div>
          )}
        </Card>

        {/* Condition Summary */}
        <Card
          title={lang === 'th' ? 'สรุปสภาพทรัพย์สิน' : 'Condition Summary'}
        >
          {conditionSummary.length > 0 ? (
            <div className="space-y-3">
              {conditionSummary.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}
            </div>
          )}
        </Card>
      </div>

      {/* Asset List */}
      <Card
        title={lang === 'th' ? 'รายการทรัพย์สิน' : 'Asset List'}
      >
        <div className="space-y-4 mb-4">
          <SearchInput
            placeholder={lang === 'th' ? 'ค้นหาตามชื่อ, รหัส, หรือซีเรียล...' : 'Search by name, code, or serial...'}
            value={searchTerm}
            onChange={setSearchTerm}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All Categories' },
                ...categories.map((c) => ({ value: c.value, label: c.label })),
              ]}
              placeholder={lang === 'th' ? 'เลือกหมวดหมู่' : 'Select Category'}
            />

            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All Status' },
                ...statuses.map((s) => ({ value: s.value, label: s.label })),
              ]}
              placeholder={lang === 'th' ? 'เลือกสถานะ' : 'Select Status'}
            />
          </div>
        </div>

        <Table
          columns={[
            { key: 'asset_code', header: lang === 'th' ? 'รหัส' : 'Code' },
            { key: 'asset_name', header: lang === 'th' ? 'ชื่อ' : 'Name' },
            { key: 'category', header: lang === 'th' ? 'หมวดหมู่' : 'Category' },
            { key: 'brand_model', header: lang === 'th' ? 'แบรนด์/รุ่น' : 'Brand/Model' },
            { key: 'assigned_to', header: lang === 'th' ? 'ผู้รับผิดชอบ' : 'Assigned To' },
            { key: 'condition', header: lang === 'th' ? 'สภาพ' : 'Condition' },
            { key: 'status', header: lang === 'th' ? 'สถานะ' : 'Status' },
            { key: 'purchase_price', header: lang === 'th' ? 'ราคา' : 'Price' },
            { key: 'actions', header: lang === 'th' ? 'จัดการ' : 'Actions' },
          ]}
          data={filteredAssets.map((asset) => ({
            id: asset.id,
            asset_code: asset.asset_code,
            asset_name: asset.asset_name,
            category: categories.find((c) => c.value === asset.category)?.label || asset.category,
            brand_model: asset.brand || asset.model ? `${asset.brand || ''} ${asset.model || ''}`.trim() : '-',
            assigned_to: getEmployeeName(asset.assigned_to),
            condition: (
              <Badge color={getConditionBadgeColor(asset.condition)}>
                {conditions.find((c) => c.value === asset.condition)?.label || asset.condition}
              </Badge>
            ),
            status: (
              <Badge color={getStatusBadgeColor(asset.status)}>
                {statuses.find((s) => s.value === asset.status)?.label || asset.status}
              </Badge>
            ),
            purchase_price: asset.purchase_price ? fmt(asset.purchase_price, 0) : '-',
            actions: (
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEditModal(asset)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={lang === 'th' ? 'แก้ไข' : 'Edit'}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteClick(asset)}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title={lang === 'th' ? 'ลบ' : 'Delete'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          }))}
          emptyText={lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          selectedAsset
            ? lang === 'th'
              ? 'แก้ไขทรัพย์สิน'
              : 'Edit Asset'
            : lang === 'th'
            ? 'เพิ่มทรัพย์สินใหม่'
            : 'Add New Asset'
        }
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={lang === 'th' ? 'รหัสทรัพย์สิน' : 'Asset Code'}
              name="asset_code"
              value={formData.asset_code}
              onChange={handleFormChange}
              disabled={!!selectedAsset}
              required
            />
            <Input
              label={lang === 'th' ? 'ชื่อทรัพย์สิน' : 'Asset Name'}
              name="asset_name"
              value={formData.asset_name}
              onChange={handleFormChange}
              required
            />

            <Select
              value={formData.category}
              onChange={(e) =>
                handleFormChange({ target: { name: 'category', value: e.target.value } })
              }
              options={categories}
              placeholder={lang === 'th' ? 'เลือกหมวดหมู่' : 'Select Category'}
              className="w-full"
            />

            <Input
              label={lang === 'th' ? 'แบรนด์' : 'Brand'}
              name="brand"
              value={formData.brand}
              onChange={handleFormChange}
            />

            <Input
              label={lang === 'th' ? 'รุ่น' : 'Model'}
              name="model"
              value={formData.model}
              onChange={handleFormChange}
            />

            <Input
              label={lang === 'th' ? 'หมายเลขซีเรียล' : 'Serial Number'}
              name="serial_number"
              value={formData.serial_number}
              onChange={handleFormChange}
            />

            <Select
              value={formData.assigned_to}
              onChange={(e) =>
                handleFormChange({ target: { name: 'assigned_to', value: e.target.value } })
              }
              options={[
                { value: '', label: lang === 'th' ? 'ไม่ได้มอบหมาย' : 'Not Assigned' },
                ...employees.map((emp) => ({
                  value: emp.id,
                  label:
                    lang === 'th'
                      ? `${emp.first_name_th} ${emp.last_name_th}${emp.nickname ? ' (' + emp.nickname + ')' : ''}`
                      : `${emp.first_name_en} ${emp.last_name_en}${emp.nickname ? ' (' + emp.nickname + ')' : ''}`,
                })),
              ]}
              placeholder={lang === 'th' ? 'เลือกพนักงาน' : 'Select Employee'}
              className="w-full"
            />

            <Select
              value={formData.condition}
              onChange={(e) =>
                handleFormChange({ target: { name: 'condition', value: e.target.value } })
              }
              options={conditions.map((c) => ({ value: c.value, label: c.label }))}
              placeholder={lang === 'th' ? 'เลือกสภาพ' : 'Select Condition'}
              className="w-full"
            />

            <Select
              value={formData.status}
              onChange={(e) =>
                handleFormChange({ target: { name: 'status', value: e.target.value } })
              }
              options={statuses}
              placeholder={lang === 'th' ? 'เลือกสถานะ' : 'Select Status'}
              className="w-full"
            />

            <Input
              label={lang === 'th' ? 'ราคาซื้อ' : 'Purchase Price'}
              name="purchase_price"
              type="number"
              step="0.01"
              value={formData.purchase_price}
              onChange={handleFormChange}
            />

            <Input
              label={lang === 'th' ? 'วันที่ซื้อ' : 'Purchase Date'}
              name="purchase_date"
              type="date"
              value={formData.purchase_date}
              onChange={handleFormChange}
            />

            <Input
              label={lang === 'th' ? 'สิ้นสุดการรับประกัน' : 'Warranty End'}
              name="warranty_end"
              type="date"
              value={formData.warranty_end}
              onChange={handleFormChange}
            />
          </div>

          <div>
            <Input
              label={lang === 'th' ? 'หมายเหตุ' : 'Notes'}
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder={lang === 'th' ? 'หมายเหตุเพิ่มเติม' : 'Additional notes'}
            />
          </div>

          {formErrors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
              {formErrors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? lang === 'th'
                  ? 'กำลังบันทึก...'
                  : 'Saving...'
                : lang === 'th'
                ? 'บันทึก'
                : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        columns={importColumns}
        tableName={lang === 'th' ? 'ทรัพย์สิน' : 'Assets'}
        lang={lang}
      />
    </div>
  );
}

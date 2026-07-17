import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useCompanyFilter } from '../lib/CompanyFilterContext';
import {
  Megaphone,
  Pin,
  Eye,
  Calendar,
  AlertCircle,
  Users,
  Paperclip,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { ImportModal, ImportExportButtons, exportToExcel } from '../components/ImportExport';

const CATEGORIES = {
  general: { label_en: 'General', label_th: 'ทั่วไป', color: 'bg-blue-100 text-blue-800' },
  policy: { label_en: 'Policy', label_th: 'นโยบาย', color: 'bg-purple-100 text-purple-800' },
  event: { label_en: 'Event', label_th: 'กิจกรรม', color: 'bg-green-100 text-green-800' },
  urgent: { label_en: 'Urgent', label_th: 'เร่งด่วน', color: 'bg-red-100 text-red-800' },
  welfare: { label_en: 'Welfare', label_th: 'สวัสดิการ', color: 'bg-cyan-100 text-cyan-800' },
  training: { label_en: 'Training', label_th: 'การอบรม', color: 'bg-yellow-100 text-yellow-800' },
};

const PRIORITY_CONFIG = {
  low: { icon: '●', color: 'text-gray-400' },
  normal: { icon: '●●', color: 'text-blue-500' },
  high: { icon: '●●●', color: 'text-orange-500' },
  urgent: { icon: '●●●●', color: 'text-red-600' },
};

const TEXT = {
  th: {
    title: 'ประกาศและข่าวสาร',
    newAnnouncement: 'ประกาศใหม่',
    all: 'ทั้งหมด',
    viewMore: 'อ่านเพิ่มเติม',
    viewLess: 'ย่อ',
    expires: 'หมดอายุ',
    views: 'ครั้งที่อ่าน',
    pinned: 'ประกาศปักหมุด',
    noAnnouncements: 'ไม่มีประกาศในขณะนี้',
    loadingError: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
    loading: 'กำลังโหลด...',
  },
  en: {
    title: 'Announcements',
    newAnnouncement: 'New Announcement',
    all: 'All',
    viewMore: 'Read More',
    viewLess: 'Show Less',
    expires: 'Expires',
    views: 'Views',
    pinned: 'Pinned',
    noAnnouncements: 'No announcements at this time',
    loadingError: 'Error loading announcements',
    loading: 'Loading...',
  },
};

export default function Announcements({ lang = 'en' }) {
  const { filterByCompany, filterByEmployeeCompany } = useCompanyFilter();
  const t = TEXT[lang] || TEXT.en;
  const { user, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedCategory]);

  async function fetchAnnouncements() {
    setLoading(true);
    setError(null);

    try {
      // Build query
      let query = supabase
        .from('hr_announcements')
        .select(
          `
          *,
          author:author_id(id, first_name_th, last_name_th, first_name_en, last_name_en, nickname)
        `
        )
        .eq('is_published', true);

      // Filter by category
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Order by pinned first, then by published date
      query = query
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Separate pinned and regular announcements
      const pinned = data.filter((a) => a.is_pinned);
      const regular = data.filter((a) => !a.is_pinned);

      setPinnedAnnouncements(pinned);
      setAnnouncements(regular);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(t.loadingError);
    } finally {
      setLoading(false);
    }
  }

  async function incrementViewCount(announcementId) {
    try {
      const announcement = [
        ...pinnedAnnouncements,
        ...announcements,
      ].find((a) => a.id === announcementId);

      if (announcement) {
        await supabase
          .from('hr_announcements')
          .update({ view_count: (announcement.view_count || 0) + 1 })
          .eq('id', announcementId);
      }
    } catch (err) {
      console.error('Error updating view count:', err);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (lang === 'th') {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getAuthorName(author) {
    if (!author) return 'Unknown';
    return lang === 'th'
      ? (`${author.first_name_th || ''} ${author.last_name_th || ''}`.trim() + (author.nickname ? ` (${author.nickname})` : ''))
      : `${author.first_name_en || ''} ${author.last_name_en || ''}`.trim();
  }

  function truncateContent(content, lines = 2) {
    const lineArray = content.split('\n');
    return lineArray.slice(0, lines).join('\n');
  }

  function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  // Export handler
  function handleExport() {
    const dataToExport = [...pinnedAnnouncements, ...announcements];

    const columns = [
      { header: lang === 'th' ? 'ชื่อเรื่อง' : 'Title', accessor: 'title', width: 25 },
      { header: lang === 'th' ? 'หมวดหมู่' : 'Category', accessor: (row) => {
        const cat = CATEGORIES[row.category];
        return lang === 'th' ? cat?.label_th : cat?.label_en;
      }, width: 15 },
      { header: lang === 'th' ? 'เนื้อหา' : 'Content', accessor: 'content', width: 40 },
      { header: lang === 'th' ? 'ลำดับความสำคัญ' : 'Priority', accessor: 'priority', width: 12 },
      { header: lang === 'th' ? 'วันที่เผยแพร่' : 'Published Date', accessor: (row) => formatDate(row.published_at), width: 15 },
      { header: lang === 'th' ? 'วันที่หมดอายุ' : 'Expires At', accessor: (row) => row.expires_at ? formatDate(row.expires_at) : '', width: 15 },
      { header: lang === 'th' ? 'สถานะ' : 'Status', accessor: (row) => row.is_published ? (lang === 'th' ? 'เผยแพร่' : 'Published') : (lang === 'th' ? 'ร่าง' : 'Draft'), width: 12 },
      { header: lang === 'th' ? 'ปักหมุด' : 'Pinned', accessor: (row) => row.is_pinned ? (lang === 'th' ? 'ใช่' : 'Yes') : (lang === 'th' ? 'ไม่' : 'No'), width: 10 },
    ];

    exportToExcel({
      data: dataToExport,
      columns: columns,
      filename: lang === 'th' ? 'ประกาศและข่าวสาร' : 'Announcements',
      sheetName: lang === 'th' ? 'ประกาศ' : 'Announcements',
    });
  }

  // Import handler
  async function handleImportData(mappedData) {
    try {
      const records = mappedData.map(item => ({
        title: item.title || '',
        content: item.content || '',
        category: item.category || 'general',
        priority: item.priority || 'normal',
        published_at: item.published_at || new Date().toISOString(),
        expires_at: item.expires_at || null,
        is_published: item.is_published !== undefined ? item.is_published : true,
        is_pinned: item.is_pinned !== undefined ? item.is_pinned : false,
        author_id: user?.id,
      }));

      const { data, error: insertError } = await supabase
        .from('hr_announcements')
        .insert(records)
        .select();

      if (insertError) throw insertError;

      // Refresh announcements
      await fetchAnnouncements();
      setShowImport(false);
      return records.length;
    } catch (err) {
      console.error('Error importing announcements:', err);
      throw err;
    }
  }

  // Import column mappings
  const importColumns = [
    {
      header: lang === 'th' ? 'ชื่อเรื่อง' : 'Title',
      headerEn: 'Title',
      dbField: 'title',
      accessor: 'title',
      example: lang === 'th' ? 'ประกาศเรื่องการปรับปรุงสวัสดิการ' : 'Welfare Improvement Notice',
      width: 25,
    },
    {
      header: lang === 'th' ? 'หมวดหมู่' : 'Category',
      headerEn: 'Category',
      dbField: 'category',
      accessor: 'category',
      example: lang === 'th' ? 'สวัสดิการ' : 'welfare',
      width: 15,
    },
    {
      header: lang === 'th' ? 'เนื้อหา' : 'Content',
      headerEn: 'Content',
      dbField: 'content',
      accessor: 'content',
      example: lang === 'th' ? 'รายละเอียดการปรับปรุง...' : 'Details of the improvement...',
      width: 40,
    },
    {
      header: lang === 'th' ? 'ลำดับความสำคัญ' : 'Priority',
      headerEn: 'Priority',
      dbField: 'priority',
      accessor: 'priority',
      example: 'normal',
      width: 12,
    },
    {
      header: lang === 'th' ? 'วันที่เผยแพร่' : 'Published Date',
      headerEn: 'Published Date',
      dbField: 'published_at',
      accessor: 'published_at',
      example: new Date().toISOString().split('T')[0],
      width: 15,
    },
    {
      header: lang === 'th' ? 'วันที่หมดอายุ' : 'Expires At',
      headerEn: 'Expires At',
      dbField: 'expires_at',
      accessor: 'expires_at',
      example: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      width: 15,
    },
    {
      header: lang === 'th' ? 'สถานะ' : 'Status',
      headerEn: 'Status',
      dbField: 'is_published',
      accessor: 'is_published',
      example: lang === 'th' ? 'เผยแพร่' : 'Published',
      transform: (val) => val === 'Published' || val === 'เผยแพร่' || val === true || val === 1,
      width: 12,
    },
    {
      header: lang === 'th' ? 'ปักหมุด' : 'Pinned',
      headerEn: 'Pinned',
      dbField: 'is_pinned',
      accessor: 'is_pinned',
      example: lang === 'th' ? 'ไม่' : 'No',
      transform: (val) => val === 'Yes' || val === 'ใช่' || val === true || val === 1,
      width: 10,
    },
  ];

  function handleExpandClick(announcementId) {
    setExpandedId(expandedId === announcementId ? null : announcementId);
    if (expandedId !== announcementId) {
      incrementViewCount(announcementId);
    }
  }

  const AnnouncementCard = ({ announcement, isPinned = false }) => {
    const isExpiredAnn = isExpired(announcement.expires_at);
    const isExpanded = expandedId === announcement.id;
    const categoryConfig = CATEGORIES[announcement.category] || CATEGORIES.general;
    const categoryLabel =
      lang === 'th' ? categoryConfig.label_th : categoryConfig.label_en;
    const priorityConfig = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.normal;
    const authorName = getAuthorName(announcement.author);

    const borderColor =
      announcement.priority === 'urgent'
        ? 'border-l-4 border-red-500'
        : isPinned && announcement.category === 'policy'
          ? 'border-l-4 border-blue-500'
          : 'border-l-4 border-gray-200';

    const bgColor =
      announcement.priority === 'urgent'
        ? 'bg-red-50'
        : isPinned && announcement.category === 'policy'
          ? 'bg-blue-50'
          : 'bg-white';

    return (
      <div
        key={announcement.id}
        className={`${bgColor} ${borderColor} rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
        onClick={() => handleExpandClick(announcement.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isPinned && (
                <Pin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded ${categoryConfig.color}`}
              >
                {categoryLabel}
              </span>
              <span className={`text-sm font-semibold ${priorityConfig.color}`}>
                {priorityConfig.icon}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {announcement.title}
            </h3>
          </div>

          <ChevronDown
            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
          />
        </div>

        {/* Content Preview or Full Content */}
        <div className="mb-3">
          {isExpanded ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {announcement.content}
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              {truncateContent(announcement.content)}
              {announcement.content.split('\n').length > 2 && '...'}
            </p>
          )}
        </div>

        {/* Attachment indicator */}
        {announcement.attachment_url && (
          <div className="flex items-center gap-2 mb-3 text-blue-600 text-xs">
            <Paperclip className="w-4 h-4" />
            <span>{lang === 'th' ? 'มีไฟล์แนบ' : 'Attachment'}</span>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(announcement.published_at)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{authorName}</span>
          </div>

          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>
              {announcement.view_count || 0} {t.views}
            </span>
          </div>

          {isExpiredAnn && (
            <div className="flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>{t.expires}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <>
                <ImportExportButtons
                  onExport={handleExport}
                  onImportClick={() => setShowImport(true)}
                  lang={lang}
                />
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  <Plus className="w-5 h-5" />
                  {t.newAnnouncement}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Category Filter Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              {t.all}
            </button>

            {Object.entries(CATEGORIES).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === key
                    ? `${config.color}`
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                }`}
              >
                {lang === 'th' ? config.label_th : config.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">{t.loading}</p>
            </div>
          </div>
        )}

        {/* Pinned Announcements Section */}
        {!loading && pinnedAnnouncements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Pin className="w-4 h-4 text-yellow-500" />
              {t.pinned}
            </h2>
            <div className="space-y-3">
              {pinnedAnnouncements.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  isPinned={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Announcements Feed */}
        {!loading && announcements.length > 0 && (
          <div>
            <div className="space-y-4">
              {announcements.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  isPinned={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && announcements.length === 0 && pinnedAnnouncements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">{t.noAnnouncements}</p>
          </div>
        )}
      </div>

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImportData}
        columns={importColumns}
        tableName={lang === 'th' ? 'ประกาศ' : 'Announcements'}
        lang={lang}
      />
    </div>
  );
}

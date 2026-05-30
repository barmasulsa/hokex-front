import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllBanners, createBanner, updateBanner, deleteBanner } from '../services/bannerService';
import { fetchViewCountStats, fetchSavedEventStats, type ViewCountStats, type SavedEventStats, type ViewCountStatsFilters } from '../services/eventService';
import { Region, REGION_VENUE_MAP } from '../types/core';
import { 
  getDetailedVisitorStats, 
  downloadStatsAsCSV, 
  downloadStatsAsJSON,
  clearAllStats,
  type DetailedVisitorStats 
} from '../utils/detailedAnalytics';
import type { Banner, BannerType } from '../types/banner';
import { RichTextEditor } from '../components/RichTextEditor';
import './BannerManagementPage.css';

type ManagementTab = 'image' | 'youtube' | 'text' | 'statistics' | 'viewcounts';

export function BannerManagementPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ManagementTab>('image'); // 탭 상태
  const [detailedStats, setDetailedStats] = useState<DetailedVisitorStats | null>(null);
  const [statsView, setStatsView] = useState<'daily' | 'hourly' | 'yearly'>('daily');
  const [loadingLatestStats, setLoadingLatestStats] = useState(false);
  const [viewCountStats, setViewCountStats] = useState<ViewCountStats[]>([]);
  const [loadingViewCounts, setLoadingViewCounts] = useState(false);
  const [savedEventStats, setSavedEventStats] = useState<SavedEventStats[]>([]);
  const [loadingSavedStats, setLoadingSavedStats] = useState(false);
  
  // 조회수 통계 필터
  const [viewCountLimit, setViewCountLimit] = useState<number>(50);
  const [viewCountCustomLimit, setViewCountCustomLimit] = useState<string>('50');
  const [viewCountRegion, setViewCountRegion] = useState<string>('전체');
  const [viewCountVenue, setViewCountVenue] = useState<string>('전체');
  const [statsType, setStatsType] = useState<'viewcount' | 'saved'>('viewcount');
  
  // 기간 필터
  const [datePeriod, setDatePeriod] = useState<'all' | '1day' | '1week' | '1month' | '3months' | '6months' | '1year' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 새 배너 폼 상태
  const [formData, setFormData] = useState({
    type: 'image' as BannerType,
    title: '',
    content: '',
    link_url: '',
    is_active: true,
    display_order: 0,
    show_as_popup: false,
    popup_start_date: '',
    popup_end_date: ''
  });

  // 관리자 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      alert('관리자만 접근할 수 있습니다.');
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  // 배너 목록 로드
  useEffect(() => {
    loadBanners();
  }, []);

  // 방문자 통계 가져오기
  useEffect(() => {
    const loadStats = async () => {
      const detailed = await getDetailedVisitorStats();
      setDetailedStats(detailed);
    };
    
    loadStats();
    
    // 1분마다 통계 업데이트
    const interval = setInterval(() => {
      loadStats();
    }, 60000); // 60초
    
    return () => clearInterval(interval);
  }, []);

  // 기간 필터에 따른 날짜 범위 계산
  const getDateRange = (): { startDate?: string; endDate?: string } => {
    if (datePeriod === 'all') {
      return {}; // 전체 기간 (필터 없음)
    }

    const now = new Date();
    const endDate = now.toISOString().split('T')[0]; // 오늘
    let startDate: string;

    switch (datePeriod) {
      case '1day':
        startDate = endDate; // 오늘만
        break;
      case '1week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case '1month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case '3months':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        break;
      case '6months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        startDate = sixMonthsAgo.toISOString().split('T')[0];
        break;
      case '1year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        startDate = yearAgo.toISOString().split('T')[0];
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return { startDate: customStartDate, endDate: customEndDate };
        }
        return {}; // 날짜 미입력 시 전체 기간
      default:
        return {};
    }

    return { startDate, endDate };
  };

  // 조회수 통계 로드 함수
  const loadViewCounts = async () => {
    console.log('[BannerManagement] loadViewCounts called');
    setLoadingViewCounts(true);
    
    const dateRange = getDateRange();
    console.log('[BannerManagement] dateRange:', dateRange);
    console.log('[BannerManagement] dateRange.startDate:', dateRange.startDate, 'type:', typeof dateRange.startDate);
    console.log('[BannerManagement] dateRange.endDate:', dateRange.endDate, 'type:', typeof dateRange.endDate);
    
    const filters: ViewCountStatsFilters = {
      region: viewCountRegion !== '전체' ? viewCountRegion : undefined,
      venue: viewCountVenue !== '전체' ? viewCountVenue : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
    console.log('[BannerManagement] Calling fetchViewCountStats with limit:', viewCountLimit, 'filters:', filters);
    console.log('[BannerManagement] filters.startDate:', filters.startDate, 'filters.endDate:', filters.endDate);
    const stats = await fetchViewCountStats(viewCountLimit, filters);
    console.log('[BannerManagement] Received stats:', stats.length, 'items');
    console.log('[BannerManagement] First 3 stats:', stats.slice(0, 3));
    setViewCountStats(stats);
    setLoadingViewCounts(false);
  };

  // 조회수 통계 가져오기
  useEffect(() => {
    if (activeTab === 'viewcounts') {
      loadViewCounts();
      
      // 1분마다 조회수 통계 업데이트
      const interval = setInterval(() => {
        loadViewCounts();
      }, 60000); // 60초
      
      return () => clearInterval(interval);
    }
  }, [activeTab, viewCountLimit, viewCountRegion, viewCountVenue, datePeriod, customStartDate, customEndDate]);

  // 찜 목록 통계 로드 함수
  const loadSavedStats = async () => {
    console.log('[BannerManagement] loadSavedStats called');
    setLoadingSavedStats(true);
    
    // 찜 목록은 실시간으로 DB에 저장되므로 플러시 불필요
    const dateRange = getDateRange();
    const filters: ViewCountStatsFilters = {
      region: viewCountRegion !== '전체' ? viewCountRegion : undefined,
      venue: viewCountVenue !== '전체' ? viewCountVenue : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
    console.log('[BannerManagement] Calling fetchSavedEventStats with limit:', viewCountLimit, 'filters:', filters);
    const stats = await fetchSavedEventStats(viewCountLimit, filters);
    console.log('[BannerManagement] Received saved stats:', stats.length, 'items');
    setSavedEventStats(stats);
    setLoadingSavedStats(false);
  };

  // 찜 목록 통계 가져오기
  useEffect(() => {
    if (activeTab === 'viewcounts' && statsType === 'saved') {
      loadSavedStats();
      
      // 1분마다 찜 통계 업데이트
      const interval = setInterval(() => {
        loadSavedStats();
      }, 60000); // 60초
      
      return () => clearInterval(interval);
    }
  }, [activeTab, statsType, viewCountLimit, viewCountRegion, viewCountVenue, datePeriod, customStartDate, customEndDate]);

  const loadBanners = async () => {
    setLoading(true);
    const data = await fetchAllBanners();
    setBanners(data);
    setLoading(false);
  };

  const handleCreate = (type: BannerType) => {
    setIsCreating(true);
    setEditingBanner(null);
    // 해당 타입의 배너 중 가장 큰 display_order를 찾아서 +1
    const sameBanners = banners.filter(b => b.type === type);
    const maxOrder = sameBanners.length > 0 
      ? Math.max(...sameBanners.map(b => b.display_order))
      : -1;
    
    setFormData({
      type: type,
      title: '',
      content: '',
      link_url: '',
      is_active: true,
      display_order: maxOrder + 1,
      show_as_popup: false,
      popup_start_date: '',
      popup_end_date: ''
    });
  };

  const handleDownloadCSV = () => {
    if (detailedStats) {
      downloadStatsAsCSV(detailedStats);
    }
  };

  const handleDownloadJSON = () => {
    if (detailedStats) {
      downloadStatsAsJSON(detailedStats);
    }
  };

  const handleClearStats = async () => {
    const cleared = await clearAllStats();
    if (cleared) {
      const detailed = await getDetailedVisitorStats();
      setDetailedStats(detailed);
    }
  };

  const handleRestoreStats = async () => {
    const { restoreStatsFromBackup } = await import('../utils/detailedAnalytics');
    const restored = restoreStatsFromBackup();
    if (restored) {
      const detailed = await getDetailedVisitorStats();
      setDetailedStats(detailed);
    }
  };

  const handleLoadLatestStats = async () => {
    setLoadingLatestStats(true);
    try {
      const detailed = await getDetailedVisitorStats();
      setDetailedStats(detailed);
      alert('최신 통계를 불러왔습니다.');
    } catch (err) {
      console.error('최신 통계 로드 실패:', err);
      alert('최신 통계 로드에 실패했습니다.');
    } finally {
      setLoadingLatestStats(false);
    }
  };

  // 조회수/찜 목록 통계 CSV 다운로드
  const handleDownloadViewCountCSV = () => {
    const data = statsType === 'viewcount' ? viewCountStats : savedEventStats;
    const type = statsType === 'viewcount' ? '조회수' : '찜목록';
    
    if (data.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // CSV 헤더
    const headers = ['순위', '행사명', '지역', '전시장', '시작일', '종료일', type];
    
    // CSV 데이터 생성
    const csvRows = [headers.join(',')];
    
    data.forEach((stat, index) => {
      const count = statsType === 'viewcount' 
        ? (stat as ViewCountStats).viewCount 
        : (stat as SavedEventStats).savedCount;
      
      const row = [
        index + 1,
        `"${stat.title.replace(/"/g, '""')}"`, // 쉼표와 따옴표 처리
        stat.region,
        stat.venue,
        stat.startDate.toISOString().slice(0, 10),
        stat.endDate.toISOString().slice(0, 10),
        count
      ];
      csvRows.push(row.join(','));
    });

    // CSV 파일 생성 및 다운로드
    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM 추가
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `행사_${type}_통계_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 조회수/찜 목록 통계 JSON 다운로드
  const handleDownloadViewCountJSON = () => {
    const data = statsType === 'viewcount' ? viewCountStats : savedEventStats;
    const type = statsType === 'viewcount' ? '조회수' : '찜목록';
    
    if (data.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // JSON 데이터 생성
    const jsonData = {
      exportDate: new Date().toISOString(),
      statsType: type,
      filters: {
        limit: viewCountLimit,
        region: viewCountRegion,
        venue: viewCountVenue
      },
      totalCount: data.length,
      data: data.map((stat, index) => {
        const count = statsType === 'viewcount' 
          ? (stat as ViewCountStats).viewCount 
          : (stat as SavedEventStats).savedCount;
        
        return {
          rank: index + 1,
          eventId: stat.eventId,
          title: stat.title,
          region: stat.region,
          venue: stat.venue,
          startDate: stat.startDate.toISOString().slice(0, 10),
          endDate: stat.endDate.toISOString().slice(0, 10),
          [statsType === 'viewcount' ? 'viewCount' : 'savedCount']: count,
          poster: stat.poster
        };
      })
    };

    // JSON 파일 생성 및 다운로드
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `행사_${type}_통계_${timestamp}.json`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsCreating(false);
    setFormData({
      type: banner.type,
      title: banner.title,
      content: banner.content,
      link_url: banner.link_url || '',
      is_active: banner.is_active,
      display_order: banner.display_order,
      show_as_popup: banner.show_as_popup || false,
      popup_start_date: banner.popup_start_date || '',
      popup_end_date: banner.popup_end_date || ''
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingBanner(null);
    setFormData({
      type: 'image',
      title: '',
      content: '',
      link_url: '',
      is_active: true,
      display_order: 0,
      show_as_popup: false,
      popup_start_date: '',
      popup_end_date: ''
    });
  };

  // YouTube URL에서 비디오 ID 추출
  const extractYoutubeId = (url: string): string => {
    // 이미 ID만 있는 경우
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
      return url;
    }

    // 다양한 YouTube URL 형식 지원
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url; // 추출 실패 시 원본 반환
  };

  // 이미지 파일 업로드 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setUploading(true);

    try {
      // Base64로 변환하여 content에 저장
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, content: base64String });
        setUploading(false);
      };
      reader.onerror = () => {
        alert('이미지 업로드에 실패했습니다.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    // YouTube 타입인 경우 비디오 ID 추출
    let content = formData.content;
    if (formData.type === 'youtube') {
      content = extractYoutubeId(formData.content);
    }

    // link_url 처리: 빈 문자열이면 명시적으로 undefined로 변환
    const linkUrl = formData.link_url?.trim() ? formData.link_url.trim() : undefined;

    if (isCreating) {
      const newBanner = await createBanner({
        type: formData.type,
        title: formData.title,
        content: content,
        link_url: linkUrl,
        is_active: formData.is_active,
        display_order: formData.display_order,
        show_as_popup: formData.show_as_popup,
        popup_start_date: formData.popup_start_date || undefined,
        popup_end_date: formData.popup_end_date || undefined
      });

      if (newBanner) {
        alert('배너가 생성되었습니다.');
        loadBanners();
        handleCancel();
      } else {
        alert('배너 생성에 실패했습니다.');
      }
    } else if (editingBanner) {
      const updated = await updateBanner(editingBanner.id, {
        type: formData.type,
        title: formData.title,
        content: content,
        link_url: linkUrl,
        is_active: formData.is_active,
        display_order: formData.display_order,
        show_as_popup: formData.show_as_popup,
        popup_start_date: formData.popup_start_date || undefined,
        popup_end_date: formData.popup_end_date || undefined
      });

      if (updated) {
        alert('배너가 수정되었습니다.');
        loadBanners();
        handleCancel();
      } else {
        alert('배너 수정에 실패했습니다.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 배너를 삭제하시겠습니까?')) {
      return;
    }

    const success = await deleteBanner(id);
    if (success) {
      alert('배너가 삭제되었습니다.');
      loadBanners();
    } else {
      alert('배너 삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const updated = await updateBanner(banner.id, {
      is_active: !banner.is_active
    });

    if (updated) {
      loadBanners();
    } else {
      alert('배너 상태 변경에 실패했습니다.');
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  // 타입별 배너 필터링
  const filteredBanners = activeTab !== 'statistics' 
    ? banners.filter(b => b.type === activeTab)
    : [];

  return (
    <div className="banner-management-page">
      <div className="page-header">
        <h1>배너 관리</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div className="banner-tabs">
        <button
          className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
        >
          이미지 배너
        </button>
        <button
          className={`tab-btn ${activeTab === 'youtube' ? 'active' : ''}`}
          onClick={() => setActiveTab('youtube')}
        >
          유튜브
        </button>
        <button
          className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          공지사항
        </button>
        <button
          className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 방문자 통계
        </button>
        <button
          className={`tab-btn ${activeTab === 'viewcounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('viewcounts')}
        >
          👁️ 행사 조회수
        </button>
      </div>

      {/* 통계 탭 */}
      {activeTab === 'statistics' && detailedStats && (
        <div className="statistics-tab-content">
          {/* 요약 통계 */}
          <div className="stats-summary">
            <h2>요약 통계</h2>
            <div className="stats-grid">
              <div className="stat-card-large">
                <div className="stat-label">총 방문 수</div>
                <div className="stat-value-large">{detailedStats.totalVisits.toLocaleString()}</div>
                <div className="stat-desc">
                  {detailedStats.firstVisitDate && `${detailedStats.firstVisitDate}부터`}
                </div>
              </div>
              <div className="stat-card-large">
                <div className="stat-label">오늘</div>
                <div className="stat-value-large">{detailedStats.today.toLocaleString()}</div>
                <div className="stat-desc">명 방문</div>
              </div>
              <div className="stat-card-large">
                <div className="stat-label">어제</div>
                <div className="stat-value-large">{detailedStats.yesterday.toLocaleString()}</div>
                <div className="stat-desc">명 방문</div>
              </div>
              <div className="stat-card-large">
                <div className="stat-label">최근 7일</div>
                <div className="stat-value-large">{detailedStats.last7Days.toLocaleString()}</div>
                <div className="stat-desc">명 방문</div>
              </div>
              <div className="stat-card-large">
                <div className="stat-label">최근 30일</div>
                <div className="stat-value-large">{detailedStats.last30Days.toLocaleString()}</div>
                <div className="stat-desc">명 방문</div>
              </div>
              <div className="stat-card-large">
                <div className="stat-label">최근 1년</div>
                <div className="stat-value-large">{detailedStats.last365Days.toLocaleString()}</div>
                <div className="stat-desc">명 방문</div>
              </div>
            </div>
          </div>

          {/* 데이터 다운로드 */}
          <div className="stats-actions">
            <h3>데이터 관리</h3>
            <div className="download-buttons">
              <button 
                className="btn-primary" 
                onClick={handleLoadLatestStats}
                disabled={loadingLatestStats}
              >
                {loadingLatestStats ? '⏳ 로딩 중...' : '🔄 최신 통계 보기'}
              </button>
              <button className="btn-download" onClick={handleDownloadCSV}>
                📥 CSV 다운로드
              </button>
              <button className="btn-download" onClick={handleDownloadJSON}>
                📥 JSON 다운로드
              </button>
              <button className="btn-secondary" onClick={handleRestoreStats}>
                ♻️ 백업에서 복구
              </button>
              <button className="btn-danger" onClick={handleClearStats}>
                🗑️ 통계 데이터 초기화
              </button>
            </div>
            <p className="stats-info-note">
              💡 통계는 30분마다 자동 업데이트됩니다. 최신 데이터를 즉시 확인하려면 "🔄 최신 통계 보기" 버튼을 클릭하세요.
            </p>
            <p className="stats-warning">
              ⚠️ 초기화 시 자동으로 백업됩니다. 실수로 삭제해도 복구 가능합니다.
            </p>
          </div>

          {/* 상세 통계 뷰 선택 */}
          <div className="stats-view-selector">
            <h3>상세 통계</h3>
            <div className="view-buttons">
              <button
                className={`view-btn ${statsView === 'hourly' ? 'active' : ''}`}
                onClick={() => setStatsView('hourly')}
              >
                시간대별 (오늘)
              </button>
              <button
                className={`view-btn ${statsView === 'daily' ? 'active' : ''}`}
                onClick={() => setStatsView('daily')}
              >
                일별 (최근 30일)
              </button>
              <button
                className={`view-btn ${statsView === 'yearly' ? 'active' : ''}`}
                onClick={() => setStatsView('yearly')}
              >
                일별 (최근 1년)
              </button>
            </div>
          </div>

          {/* 시간대별 통계 */}
          {statsView === 'hourly' && (
            <div className="stats-detail-section">
              <h3>오늘 시간대별 방문</h3>
              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>시간</th>
                      <th>방문 수</th>
                      <th>비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedStats.hourlyToday.map((h) => {
                      const percentage = detailedStats.today > 0 
                        ? ((h.count / detailedStats.today) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={h.hour}>
                          <td>{h.hour}시</td>
                          <td>{h.count.toLocaleString()}</td>
                          <td>
                            <div className="percentage-bar-container">
                              <div 
                                className="percentage-bar" 
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="percentage-text">{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 일별 통계 (최근 30일) */}
          {statsView === 'daily' && (
            <div className="stats-detail-section">
              <h3>최근 30일 일별 방문</h3>
              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>방문 수</th>
                      <th>비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedStats.dailyLast30Days.slice().reverse().map((d) => {
                      const maxCount = Math.max(...detailedStats.dailyLast30Days.map(x => x.count));
                      const percentage = maxCount > 0 
                        ? ((d.count / maxCount) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={d.date}>
                          <td>{d.date}</td>
                          <td>{d.count.toLocaleString()}</td>
                          <td>
                            <div className="percentage-bar-container">
                              <div 
                                className="percentage-bar" 
                                style={{ width: `${percentage}%` }}
                              />
                              <span className="percentage-text">{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 일별 통계 (최근 1년) */}
          {statsView === 'yearly' && (
            <div className="stats-detail-section">
              <h3>최근 1년 일별 방문</h3>
              <p className="stats-info-text">
                총 {detailedStats.dailyLast365Days.length}일 중 방문이 있었던 날: {' '}
                {detailedStats.dailyLast365Days.filter(d => d.count > 0).length}일
              </p>
              <div className="stats-table-container">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>방문 수</th>
                      <th>비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedStats.dailyLast365Days
                      .slice()
                      .reverse()
                      .filter(d => d.count > 0) // 방문이 있었던 날만 표시
                      .map((d) => {
                        const maxCount = Math.max(...detailedStats.dailyLast365Days.map(x => x.count));
                        const percentage = maxCount > 0 
                          ? ((d.count / maxCount) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <tr key={d.date}>
                            <td>{d.date}</td>
                            <td>{d.count.toLocaleString()}</td>
                            <td>
                              <div className="percentage-bar-container">
                                <div 
                                  className="percentage-bar" 
                                  style={{ width: `${percentage}%` }}
                                />
                                <span className="percentage-text">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 행사 조회수 통계 탭 */}
      {activeTab === 'viewcounts' && (
        <div className="view-count-stats-tab-content">
          <div className="view-count-stats-section">
            <h2>
              {statsType === 'viewcount' ? '👁️ 행사 조회수 통계' : '❤️ 행사 찜 목록 통계'}
            </h2>
            
            {/* 통계 타입 선택 */}
            <div className="stats-type-selector">
              <button
                className={`stats-type-btn ${statsType === 'viewcount' ? 'active' : ''}`}
                onClick={() => setStatsType('viewcount')}
              >
                👁️ 조회수
              </button>
              <button
                className={`stats-type-btn ${statsType === 'saved' ? 'active' : ''}`}
                onClick={() => setStatsType('saved')}
              >
                ❤️ 찜 목록
              </button>
            </div>

            {/* 필터 컨트롤 */}
            <div className="view-count-filters">
              {/* 상위 개수 선택 */}
              <div className="filter-group">
                <label>표시 개수:</label>
                <div className="limit-buttons">
                  <button
                    className={`limit-btn ${viewCountLimit === 3 ? 'active' : ''}`}
                    onClick={() => {
                      setViewCountLimit(3);
                      setViewCountCustomLimit('3');
                    }}
                  >
                    상위 3개
                  </button>
                  <button
                    className={`limit-btn ${viewCountLimit === 5 ? 'active' : ''}`}
                    onClick={() => {
                      setViewCountLimit(5);
                      setViewCountCustomLimit('5');
                    }}
                  >
                    상위 5개
                  </button>
                  <button
                    className={`limit-btn ${viewCountLimit === 10 ? 'active' : ''}`}
                    onClick={() => {
                      setViewCountLimit(10);
                      setViewCountCustomLimit('10');
                    }}
                  >
                    상위 10개
                  </button>
                  <button
                    className={`limit-btn ${viewCountLimit === 50 ? 'active' : ''}`}
                    onClick={() => {
                      setViewCountLimit(50);
                      setViewCountCustomLimit('50');
                    }}
                  >
                    상위 50개
                  </button>
                  <button
                    className={`limit-btn ${viewCountLimit === 100 ? 'active' : ''}`}
                    onClick={() => {
                      setViewCountLimit(100);
                      setViewCountCustomLimit('100');
                    }}
                  >
                    상위 100개
                  </button>
                </div>
                <div className="custom-limit-input">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={viewCountCustomLimit}
                    onChange={(e) => setViewCountCustomLimit(e.target.value)}
                    placeholder="직접 입력"
                  />
                  <button
                    className="apply-custom-limit-btn"
                    onClick={() => {
                      const num = parseInt(viewCountCustomLimit);
                      if (num > 0 && num <= 1000) {
                        setViewCountLimit(num);
                      } else {
                        alert('1~1000 사이의 숫자를 입력하세요.');
                      }
                    }}
                  >
                    적용
                  </button>
                </div>
              </div>

              {/* 기간 필터 */}
              <div className="filter-group">
                <label>기간:</label>
                <div className="period-buttons">
                  <button
                    className={`period-btn ${datePeriod === 'all' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('all')}
                  >
                    전체
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '1day' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('1day')}
                  >
                    일일
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '1week' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('1week')}
                  >
                    1주일
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '1month' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('1month')}
                  >
                    1개월
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '3months' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('3months')}
                  >
                    3개월
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '6months' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('6months')}
                  >
                    6개월
                  </button>
                  <button
                    className={`period-btn ${datePeriod === '1year' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('1year')}
                  >
                    1년
                  </button>
                  <button
                    className={`period-btn ${datePeriod === 'custom' ? 'active' : ''}`}
                    onClick={() => setDatePeriod('custom')}
                  >
                    직접 입력
                  </button>
                </div>
                {datePeriod === 'custom' && (
                  <div className="custom-date-input">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="시작일"
                    />
                    <span>~</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="종료일"
                    />
                  </div>
                )}
              </div>

              {/* 지역 필터 */}
              <div className="filter-group">
                <label>지역:</label>
                <select
                  value={viewCountRegion}
                  onChange={(e) => {
                    setViewCountRegion(e.target.value);
                    setViewCountVenue('전체'); // 지역 변경 시 전시장 초기화
                  }}
                  className="filter-select"
                >
                  <option value="전체">전체</option>
                  {Object.values(Region).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* 전시장 필터 */}
              <div className="filter-group">
                <label>전시장:</label>
                <select
                  value={viewCountVenue}
                  onChange={(e) => setViewCountVenue(e.target.value)}
                  className="filter-select"
                  disabled={viewCountRegion === '전체'}
                >
                  <option value="전체">전체</option>
                  {viewCountRegion !== '전체' && 
                    REGION_VENUE_MAP[viewCountRegion as Region]?.map(venue => (
                      <option key={venue} value={venue}>{venue}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <div className="view-count-download-section">
              <button 
                className="btn-primary" 
                onClick={() => {
                  if (statsType === 'viewcount') {
                    loadViewCounts();
                  } else {
                    loadSavedStats();
                  }
                }}
                disabled={statsType === 'viewcount' ? loadingViewCounts : loadingSavedStats}
              >
                {(statsType === 'viewcount' ? loadingViewCounts : loadingSavedStats) ? '⏳ 로딩 중...' : '🔄 즉시 업데이트'}
              </button>
              <button 
                className="btn-download" 
                onClick={handleDownloadViewCountCSV}
                disabled={statsType === 'viewcount' ? viewCountStats.length === 0 : savedEventStats.length === 0}
              >
                📥 CSV 다운로드
              </button>
              <button 
                className="btn-download" 
                onClick={handleDownloadViewCountJSON}
                disabled={statsType === 'viewcount' ? viewCountStats.length === 0 : savedEventStats.length === 0}
              >
                📥 JSON 다운로드
              </button>
            </div>

            <p className="stats-info-text">
              {statsType === 'viewcount' 
                ? `조회수가 높은 상위 ${viewCountLimit}개 행사를 표시합니다.`
                : `찜이 많은 상위 ${viewCountLimit}개 행사를 표시합니다.`
              } 1분마다 자동 업데이트됩니다.
            </p>

            {/* 조회수 통계 테이블 */}
            {statsType === 'viewcount' && (
              <>
                {loadingViewCounts ? (
                  <p>로딩 중...</p>
                ) : viewCountStats.length === 0 ? (
                  <p>조회수 데이터가 없습니다.</p>
                ) : (
                  <div className="view-count-table-container">
                    <table className="view-count-table">
                      <thead>
                        <tr>
                          <th>순위</th>
                          <th>행사명</th>
                          <th>지역</th>
                          <th>전시장</th>
                          <th>기간</th>
                          <th>조회수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewCountStats.map((stat, index) => (
                          <tr key={stat.eventId}>
                            <td className="rank-cell">
                              {index + 1 <= 3 ? (
                                <span className={`rank-badge rank-${index + 1}`}>
                                  {index + 1}위
                                </span>
                              ) : (
                                <span className="rank-number">{index + 1}</span>
                              )}
                            </td>
                            <td className="title-cell">
                              <a 
                                href={`/event/${stat.eventId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="event-link"
                              >
                                {stat.title}
                              </a>
                            </td>
                            <td>{stat.region}</td>
                            <td>{stat.venue}</td>
                            <td className="date-cell">
                              {stat.startDate.toISOString().slice(0, 10)} ~ {stat.endDate.toISOString().slice(0, 10)}
                            </td>
                            <td className="view-count-cell">
                              <span className="view-count-value">
                                {stat.viewCount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* 찜 목록 통계 테이블 */}
            {statsType === 'saved' && (
              <>
                {loadingSavedStats ? (
                  <p>로딩 중...</p>
                ) : savedEventStats.length === 0 ? (
                  <p>찜 목록 데이터가 없습니다.</p>
                ) : (
                  <div className="view-count-table-container">
                    <table className="view-count-table">
                      <thead>
                        <tr>
                          <th>순위</th>
                          <th>행사명</th>
                          <th>지역</th>
                          <th>전시장</th>
                          <th>기간</th>
                          <th>찜 수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedEventStats.map((stat, index) => (
                          <tr key={stat.eventId}>
                            <td className="rank-cell">
                              {index + 1 <= 3 ? (
                                <span className={`rank-badge rank-${index + 1}`}>
                                  {index + 1}위
                                </span>
                              ) : (
                                <span className="rank-number">{index + 1}</span>
                              )}
                            </td>
                            <td className="title-cell">
                              <a 
                                href={`/event/${stat.eventId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="event-link"
                              >
                                {stat.title}
                              </a>
                            </td>
                            <td>{stat.region}</td>
                            <td>{stat.venue}</td>
                            <td className="date-cell">
                              {stat.startDate.toISOString().slice(0, 10)} ~ {stat.endDate.toISOString().slice(0, 10)}
                            </td>
                            <td className="view-count-cell">
                              <span className="view-count-value">
                                ❤️ {stat.savedCount.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 배너 관리 섹션 (기존 코드) */}
      {activeTab !== 'statistics' && activeTab !== 'viewcounts' && (
        <div className="banner-management-section">
      {/* 새 배너 추가 버튼 */}
      <div className="add-banner-section">
        <button className="btn-primary" onClick={() => handleCreate(activeTab as BannerType)}>
          {activeTab === 'image' && '+ 이미지 배너 추가'}
          {activeTab === 'youtube' && '+ 유튜브 추가'}
          {activeTab === 'text' && '+ 공지사항 추가'}
        </button>
      </div>

      {/* 배너 폼 */}
      {(isCreating || editingBanner) && (
        <div className="banner-form-container">
          <h2>
            {isCreating ? '새 ' : ''}
            {formData.type === 'image' && '이미지 배너'}
            {formData.type === 'youtube' && '유튜브'}
            {formData.type === 'text' && '공지사항'}
            {isCreating ? ' 추가' : ' 수정'}
          </h2>
          <form onSubmit={handleSubmit} className="banner-form">

            <div className="form-group">
              <label>제목</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-control"
                placeholder="배너 제목"
              />
            </div>

            <div className="form-group">
              <label>
                {formData.type === 'image' && '이미지'}
                {formData.type === 'youtube' && 'YouTube URL'}
                {formData.type === 'text' && '공지 내용'}
              </label>
              {formData.type === 'text' ? (
                <RichTextEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  placeholder="공지 내용을 입력하세요 (텍스트 서식, 이미지 삽입 가능)"
                />
              ) : formData.type === 'image' ? (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="form-control"
                    disabled={uploading}
                  />
                  {uploading && <p className="upload-status">업로드 중...</p>}
                  {formData.content && !uploading && (
                    <div className="image-preview">
                      <img src={formData.content} alt="미리보기" />
                      <button
                        type="button"
                        className="btn-remove-image"
                        onClick={() => setFormData({ ...formData, content: '' })}
                      >
                        이미지 제거
                      </button>
                    </div>
                  )}
                  <p className="form-help-text">또는 이미지 URL을 직접 입력:</p>
                  <input
                    type="text"
                    value={formData.content.startsWith('data:') ? '' : formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="form-control"
                    placeholder="https://example.com/image.jpg"
                    disabled={uploading || formData.content.startsWith('data:')}
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="form-control"
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ 또는 dQw4w9WgXcQ"
                />
              )}
            </div>

            {(formData.type === 'image' || formData.type === 'text') && (
              <div className="form-group">
                <label>링크 URL (선택사항)</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="form-control"
                  placeholder={formData.type === 'image' ? '클릭 시 이동할 URL' : '제목 클릭 시 이동할 URL (없으면 모달로 내용 표시)'}
                />
                {formData.type === 'text' && (
                  <p className="form-help-text">
                    💡 링크 URL을 입력하면 공지사항 제목 클릭 시 해당 URL로 바로 이동합니다. 
                    비워두면 모달로 공지 내용을 표시합니다.
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label>표시 순서</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="form-control"
                min="0"
              />
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                활성화
              </label>
            </div>

            {(formData.type === 'image' || formData.type === 'text') && (
              <>
                <div className="form-group-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.show_as_popup}
                      onChange={(e) => setFormData({ ...formData, show_as_popup: e.target.checked })}
                    />
                    팝업으로 표시 (홈페이지 접속 시 자동으로 표시)
                  </label>
                </div>

                {formData.show_as_popup && (
                  <div className="form-group">
                    <label>팝업 게시 기간 (선택사항)</label>
                    <div className="date-range-inputs">
                      <input
                        type="date"
                        value={formData.popup_start_date}
                        onChange={(e) => setFormData({ ...formData, popup_start_date: e.target.value })}
                        className="form-control"
                        placeholder="시작일"
                      />
                      <span className="date-separator">~</span>
                      <input
                        type="date"
                        value={formData.popup_end_date}
                        onChange={(e) => setFormData({ ...formData, popup_end_date: e.target.value })}
                        className="form-control"
                        placeholder="종료일"
                      />
                    </div>
                    <p className="form-help-text">
                      💡 기간을 설정하지 않으면 항상 표시됩니다. 기간을 설정하면 해당 기간에만 팝업이 표시됩니다.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {isCreating ? '생성' : '수정'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 배너 목록 */}
      <div className="banner-list">
        <h2>
          {activeTab === 'image' && '이미지 배너 목록'}
          {activeTab === 'youtube' && '유튜브 목록'}
          {activeTab === 'text' && '공지사항 목록'}
        </h2>
        {loading ? (
          <p>로딩 중...</p>
        ) : filteredBanners.length === 0 ? (
          <p>등록된 배너가 없습니다.</p>
        ) : (
          <table className="banner-table">
            <thead>
              <tr>
                <th>순서</th>
                <th>제목</th>
                <th>내용</th>
                {activeTab === 'text' && <th>조회수</th>}
                {activeTab === 'image' && <th>링크 URL</th>}
                <th>팝업</th>
                <th>게시 기간</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanners.map((banner) => (
                <tr key={banner.id}>
                  <td>{banner.display_order}</td>
                  <td>{banner.title}</td>
                  <td className="content-cell">
                    {banner.type === 'image' && banner.content.startsWith('data:') ? (
                      <span>업로드된 이미지</span>
                    ) : banner.type === 'text' ? (
                      banner.content.substring(0, 50) + (banner.content.length > 50 ? '...' : '')
                    ) : (
                      banner.content.substring(0, 30) + (banner.content.length > 30 ? '...' : '')
                    )}
                  </td>
                  {activeTab === 'text' && (
                    <td className="view-count-cell">
                      {(banner as any).view_count || 0}
                    </td>
                  )}
                  {activeTab === 'image' && (
                    <td className="content-cell">
                      {banner.link_url ? (
                        <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                          {banner.link_url.substring(0, 30)}...
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  <td>
                    <span className={`status-badge ${banner.show_as_popup ? 'active' : 'inactive'}`}>
                      {banner.show_as_popup ? '팝업' : '-'}
                    </span>
                  </td>
                  <td className="date-range-cell">
                    {banner.show_as_popup && (banner.popup_start_date || banner.popup_end_date) ? (
                      <span className="date-range-text">
                        {banner.popup_start_date || '시작일 없음'} ~ {banner.popup_end_date || '종료일 없음'}
                      </span>
                    ) : banner.show_as_popup ? (
                      <span className="date-range-text">항상 표시</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      className={`status-badge ${banner.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(banner)}
                    >
                      {banner.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(banner)}>
                      수정
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(banner.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </div>
      )}
    </div>
  );
}

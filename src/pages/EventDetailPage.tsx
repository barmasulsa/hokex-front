import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchEventById, updateEvent, fetchEventHistory, revertEventChange } from '../services/eventService';
import type { EventRecord } from '../types/core';
import { calculateStatusBadge, calculateDaysUntilStart } from '../utils/badgeCalculator';
import { Calendar, MapPin, ExternalLink, Share2, Copy, Edit2, Check, X, Image, History, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

  // 킨텍스 전용: 운영시간 포맷팅 (날짜 + 시간)
const SONGDO_DEFAULT_POSTER = '/images/songdo-default-poster.jpg';
const KDJ_DEFAULT_POSTER = '/images/thumb.jpg';
const HICO_DEFAULT_POSTER = '/images/hico-default.png';

// 구미코 카테고리별 기본 포스터
const GUMICO_EXHIBITION_POSTER = '/images/gumico_exhibition.png';
const GUMICO_CONVENTION_POSTER = '/images/gumico_convention.png';
const GUMICO_EVENT_POSTER = '/images/gumico_event.png';

// 대전컨벤션센터 카테고리별 기본 포스터
const DCC_EXHIBITION_POSTER = '/images/dcc-exhibition.png';
const DCC_CONFERENCE_POSTER = '/images/dcc-conference.png';
const DCC_EVENT_POSTER = '/images/dcc-event.png';

// 수원메쎄 기본 포스터
const SUWONMESSE_DEFAULT_POSTER = '/images/suwonmesse-default.png';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();
  
  // URL 편집 상태
  const [editingVenueUrl, setEditingVenueUrl] = useState(false);
  const [editingWebsiteUrl, setEditingWebsiteUrl] = useState(false);
  const [tempVenueUrl, setTempVenueUrl] = useState('');
  const [tempWebsiteUrl, setTempWebsiteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 포스터 편집 상태
  const [editingPoster, setEditingPoster] = useState(false);
  const [tempPosterUrl, setTempPosterUrl] = useState('');
  
  // 변경 이력 모달
  const [showHistory, setShowHistory] = useState(false);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  
  // 텍스트 필드 편집 상태
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [editingOrganizer, setEditingOrganizer] = useState(false);
  const [tempOrganizer, setTempOrganizer] = useState('');
  const [editingSupervisor, setEditingSupervisor] = useState(false);
  const [tempSupervisor, setTempSupervisor] = useState('');
  const [editingAdmissionFee, setEditingAdmissionFee] = useState(false);
  const [tempAdmissionFee, setTempAdmissionFee] = useState('');
  const [editingExhibitItems, setEditingExhibitItems] = useState(false);
  const [tempExhibitItems, setTempExhibitItems] = useState('');
  const [editingOperatingHours, setEditingOperatingHours] = useState(false);
  const [tempOperatingHours, setTempOperatingHours] = useState('');
  const [editingVenueHall, setEditingVenueHall] = useState(false);
  const [tempVenueHall, setTempVenueHall] = useState('');
  
  // 날짜 편집 상태
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [tempEndDate, setTempEndDate] = useState('');
  
  // 카테고리 편집 상태
  const [editingCategory, setEditingCategory] = useState(false);
  const [tempCategories, setTempCategories] = useState<Array<'전시' | '회의' | '행사/공연'>>([]);

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      
      setLoading(true);
      const eventData = await fetchEventById(id);
      console.log('Event data loaded:', eventData); // 디버그: 전체 이벤트 데이터
      console.log('venueEventPageUrl:', eventData?.venueEventPageUrl); // 디버그: URL 확인
      setEvent(eventData);
      setLoading(false);
    }
    
    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="event-detail-page">
        <div style={{ padding: '100px 20px', textAlign: 'center' }}>
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-not-found">
        <h2>행사를 찾을 수 없습니다</h2>
        <Link to="/">홈으로 돌아가기</Link>
      </div>
    );
  }

  // 포스터 URL 결정: 포스터 없으면 venue별 기본 이미지
  const getPosterUrl = () => {
    if (!event.poster || event.poster.trim() === '') {
      // 송도컨벤시아
      if (event.venue === '송도컨벤시아') return SONGDO_DEFAULT_POSTER;
      
      // 김대중컨벤션센터
      if (event.venue === '김대중컨벤션센터') return KDJ_DEFAULT_POSTER;
      
      // 경주화백컨벤션센터
      if (event.venue === '경주화백컨벤션센터') return HICO_DEFAULT_POSTER;
      
      // 구미코: 카테고리별 기본 포스터
      if (event.venue === '구미코') {
        const category = Array.isArray(event.category) ? event.category[0] : event.category;
        if (category === '전시') return GUMICO_EXHIBITION_POSTER;
        if (category === '회의') return GUMICO_CONVENTION_POSTER;
        if (category === '행사/공연') return GUMICO_EVENT_POSTER;
        return GUMICO_CONVENTION_POSTER;
      }
      
      // 대전컨벤션센터: 카테고리별 기본 포스터
      if (event.venue === '대전컨벤션센터') {
        const category = Array.isArray(event.category) ? event.category[0] : event.category;
        if (category === '전시') return DCC_EXHIBITION_POSTER;
        if (category === '회의') return DCC_CONFERENCE_POSTER;
        if (category === '행사/공연') return DCC_EVENT_POSTER;
        return DCC_CONFERENCE_POSTER;
      }
      
      // 수원메쎄
      if (event.venue === '수원메쎄') return SUWONMESSE_DEFAULT_POSTER;
      
      // 다른 venue는 빈 문자열 반환 (포스터 없음)
      return '';
    }
    return event.poster;
  };

  const posterUrl = getPosterUrl();

  const badge = calculateStatusBadge(event);
  const daysUntilStart = calculateDaysUntilStart(event);

  // D-Day 배지 텍스트 생성
  const getBadgeText = () => {
    console.log('Badge:', badge, 'Days until start:', daysUntilStart); // 디버그 로그
    // COMING SOON이나 D-Day일 때 일수 표시
    if (badge === 'D-Day' || badge === 'COMING SOON') {
      return `D-${daysUntilStart}`;
    }
    return badge;
  };

  const formatDateRange = () => {
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    
    const startStr = `${event.startDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.startDate)}`;
    const endStr = `${event.endDate.toISOString().slice(0, 10).replace(/-/g, '.')} ${generateDayString(event.endDate)}`;
    return `${startStr} ~ ${endStr}`;
  };

  // 킨텍스 전용: 운영시간 포맷팅 (날짜 + 시간)
  const formatKintexOperatingHours = () => {
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    
    const formatDate = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}${generateDayString(date)}`;
    };
    
    const dateRange = `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
    const timeInfo = event.operatingHours || '';
    
    // 시간 정보가 없으면 날짜만 반환
    if (!timeInfo.trim()) {
      return dateRange;
    }
    
    return `${dateRange}\n${timeInfo}`;
  };

  // 벡스코 전용: 운영시간 포맷팅 (날짜 + 시간)
  const formatBexcoOperatingHours = () => {
    const generateDayString = (date: Date) => {
      const days = ['(일)', '(월)', '(화)', '(수)', '(목)', '(금)', '(토)'];
      return days[date.getDay()];
    };
    
    const formatDate = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}${generateDayString(date)}`;
    };
    
    const dateRange = `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
    
    // operatingHours가 없으면 날짜만 반환
    if (!event.operatingHours || !event.operatingHours.trim()) {
      return dateRange;
    }
    
    // operatingHours에서 시간 정보 추출
    // 예: "2026.10.01 ~ 2026.10.04 10시 ~ 18시" -> "10시 ~ 18시"
    const timeMatch = event.operatingHours.match(/(\d{1,2})\s*시\s*~\s*(\d{1,2})\s*시/);
    if (timeMatch) {
      const startHour = timeMatch[1].padStart(2, '0');
      const endHour = timeMatch[2].padStart(2, '0');
      return `${dateRange}\n${startHour}:00 ~ ${endHour}:00`;
    }
    
    // 시간 패턴이 없으면 원본 operatingHours 사용
    return `${dateRange}\n${event.operatingHours}`;
  };

  const handleAddToCalendar = () => {
    alert('캘린더 추가 기능 (Google/Apple/Outlook)');
  };

  const handleShare = () => {
    alert('카카오톡 공유 기능');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('링크가 복사되었습니다');
  };

  // URL 편집 시작
  const startEditVenueUrl = () => {
    setTempVenueUrl(event?.venueEventPageUrl || '');
    setEditingVenueUrl(true);
  };

  const startEditWebsiteUrl = () => {
    setTempWebsiteUrl(event?.websiteUrl || event?.targetLink || '');
    setEditingWebsiteUrl(true);
  };

  // URL 저장
  const saveVenueUrl = async () => {
    if (!event || !id) return;
    
    setSaving(true);
    try {
      await updateEvent(id, { venueEventPageUrl: tempVenueUrl });
      setEvent({ ...event, venueEventPageUrl: tempVenueUrl });
      setEditingVenueUrl(false);
      alert('전시장 행사 페이지 URL이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update venue URL:', error);
      alert('URL 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveWebsiteUrl = async () => {
    if (!event || !id) return;
    
    setSaving(true);
    try {
      await updateEvent(id, { websiteUrl: tempWebsiteUrl });
      setEvent({ ...event, websiteUrl: tempWebsiteUrl });
      setEditingWebsiteUrl(false);
      alert('공식 웹사이트 URL이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update website URL:', error);
      alert('URL 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // URL 편집 취소
  const cancelEditVenueUrl = () => {
    setEditingVenueUrl(false);
    setTempVenueUrl('');
  };

  const cancelEditWebsiteUrl = () => {
    setEditingWebsiteUrl(false);
    setTempWebsiteUrl('');
  };

  // 포스터 편집 시작
  const startEditPoster = () => {
    setTempPosterUrl(event?.poster || '');
    setEditingPoster(true);
  };

  // 포스터 저장
  const savePoster = async () => {
    if (!event || !id) return;
    
    setSaving(true);
    try {
      await updateEvent(id, { poster: tempPosterUrl });
      setEvent({ ...event, poster: tempPosterUrl });
      setEditingPoster(false);
      alert('포스터 URL이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update poster:', error);
      alert('포스터 URL 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 포스터 편집 취소
  const cancelEditPoster = () => {
    setEditingPoster(false);
    setTempPosterUrl('');
  };

  // 변경 이력 불러오기
  const loadHistory = async () => {
    if (!id) return;
    const history = await fetchEventHistory(id);
    setEventHistory(history);
    setShowHistory(true);
  };

  // 변경 되돌리기
  const handleRevert = async (historyId: string) => {
    if (!id) return;
    
    if (!confirm('이 변경사항을 되돌리시겠습니까?')) return;
    
    const success = await revertEventChange(id, historyId);
    if (success) {
      alert('변경사항이 되돌려졌습니다');
      window.location.reload();
    } else {
      alert('되돌리기에 실패했습니다');
    }
  };

  // 텍스트 필드 편집 시작
  const startEditDescription = () => {
    setTempDescription(event?.description || '');
    setEditingDescription(true);
  };

  const startEditOrganizer = () => {
    setTempOrganizer(event?.organizer || '');
    setEditingOrganizer(true);
  };

  const startEditSupervisor = () => {
    setTempSupervisor(event?.supervisor || '');
    setEditingSupervisor(true);
  };

  const startEditAdmissionFee = () => {
    setTempAdmissionFee(event?.admissionFee || '');
    setEditingAdmissionFee(true);
  };

  const startEditExhibitItems = () => {
    setTempExhibitItems(event?.exhibitItems || '');
    setEditingExhibitItems(true);
  };

  const startEditOperatingHours = () => {
    setTempOperatingHours(event?.operatingHours || '');
    setEditingOperatingHours(true);
  };

  const startEditVenueHall = () => {
    setTempVenueHall(event?.venueHall || '');
    setEditingVenueHall(true);
  };

  // 날짜 편집 시작
  const startEditStartDate = () => {
    setTempStartDate(event?.startDate.toISOString().split('T')[0] || '');
    setEditingStartDate(true);
  };

  const startEditEndDate = () => {
    setTempEndDate(event?.endDate.toISOString().split('T')[0] || '');
    setEditingEndDate(true);
  };

  // 텍스트 필드 저장
  const saveDescription = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { description: tempDescription });
      setEvent({ ...event, description: tempDescription });
      setEditingDescription(false);
      alert('행사 개요가 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update description:', error);
      alert('행사 개요 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveOrganizer = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { organizer: tempOrganizer });
      setEvent({ ...event, organizer: tempOrganizer });
      setEditingOrganizer(false);
      alert('주최가 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update organizer:', error);
      alert('주최 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveSupervisor = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { supervisor: tempSupervisor });
      setEvent({ ...event, supervisor: tempSupervisor });
      setEditingSupervisor(false);
      alert('주관이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update supervisor:', error);
      alert('주관 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveAdmissionFee = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { admissionFee: tempAdmissionFee });
      setEvent({ ...event, admissionFee: tempAdmissionFee });
      setEditingAdmissionFee(false);
      alert('입장료가 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update admission fee:', error);
      alert('입장료 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveExhibitItems = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { exhibitItems: tempExhibitItems });
      setEvent({ ...event, exhibitItems: tempExhibitItems });
      setEditingExhibitItems(false);
      alert('전시품목이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update exhibit items:', error);
      alert('전시품목 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveOperatingHours = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { operatingHours: tempOperatingHours });
      setEvent({ ...event, operatingHours: tempOperatingHours });
      setEditingOperatingHours(false);
      alert('운영시간이 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update operating hours:', error);
      alert('운영시간 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveVenueHall = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      await updateEvent(id, { venueHall: tempVenueHall });
      setEvent({ ...event, venueHall: tempVenueHall });
      setEditingVenueHall(false);
      alert('행사장소가 업데이트되었습니다');
    } catch (error) {
      console.error('Failed to update venue hall:', error);
      alert('행사장소 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 날짜 저장
  const saveStartDate = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      const newStartDate = new Date(tempStartDate);
      await updateEvent(id, { startDate: newStartDate });
      setEvent({ ...event, startDate: newStartDate });
      setEditingStartDate(false);
      alert('시작일이 업데이트되었습니다. 행사가 새로운 날짜로 이동되었습니다.');
    } catch (error) {
      console.error('Failed to update start date:', error);
      alert('시작일 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const saveEndDate = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      const newEndDate = new Date(tempEndDate);
      await updateEvent(id, { endDate: newEndDate });
      setEvent({ ...event, endDate: newEndDate });
      setEditingEndDate(false);
      alert('종료일이 업데이트되었습니다. 행사가 새로운 날짜로 이동되었습니다.');
    } catch (error) {
      console.error('Failed to update end date:', error);
      alert('종료일 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 텍스트 필드 편집 취소
  const cancelEditDescription = () => {
    setEditingDescription(false);
    setTempDescription('');
  };

  const cancelEditOrganizer = () => {
    setEditingOrganizer(false);
    setTempOrganizer('');
  };

  const cancelEditSupervisor = () => {
    setEditingSupervisor(false);
    setTempSupervisor('');
  };

  const cancelEditAdmissionFee = () => {
    setEditingAdmissionFee(false);
    setTempAdmissionFee('');
  };

  const cancelEditExhibitItems = () => {
    setEditingExhibitItems(false);
    setTempExhibitItems('');
  };

  const cancelEditOperatingHours = () => {
    setEditingOperatingHours(false);
    setTempOperatingHours('');
  };

  const cancelEditVenueHall = () => {
    setEditingVenueHall(false);
    setTempVenueHall('');
  };

  // 날짜 편집 취소
  const cancelEditStartDate = () => {
    setEditingStartDate(false);
    setTempStartDate('');
  };

  const cancelEditEndDate = () => {
    setEditingEndDate(false);
    setTempEndDate('');
  };

  // 카테고리 편집 시작
  const startEditCategory = () => {
    const currentCategories = Array.isArray(event?.category) ? event.category : [event?.category];
    setTempCategories(currentCategories as Array<'전시' | '회의' | '행사/공연'>);
    setEditingCategory(true);
  };

  // 카테고리 추가
  const addCategory = (category: '전시' | '회의' | '행사/공연') => {
    if (!tempCategories.includes(category)) {
      setTempCategories([...tempCategories, category]);
    }
  };

  // 카테고리 제거
  const removeCategory = (category: '전시' | '회의' | '행사/공연') => {
    if (tempCategories.length > 1) {
      setTempCategories(tempCategories.filter(c => c !== category));
    } else {
      alert('최소 1개의 카테고리는 필요합니다.');
    }
  };

  // 카테고리 저장
  const saveCategory = async () => {
    if (!event || !id || tempCategories.length === 0) return;
    setSaving(true);
    try {
      await updateEvent(id, { category: tempCategories as any });
      setEvent({ ...event, category: tempCategories as any });
      setEditingCategory(false);
      alert('카테고리가 업데이트되었습니다.');
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('카테고리 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 카테고리 편집 취소
  const cancelEditCategory = () => {
    setEditingCategory(false);
  };

  // 편집 가능한 텍스트 필드 렌더 헬퍼
  const renderEditableField = (
    label: string,
    value: string | undefined,
    isEditing: boolean,
    tempValue: string,
    onEdit: () => void,
    onSave: () => void,
    onCancel: () => void,
    onChange: (value: string) => void,
    minHeight: string = '80px'
  ) => {
    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <h3>{label}</h3>
          {isAdmin && !isEditing && (
            <button
              onClick={onEdit}
              style={{
                padding: '4px 8px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <Edit2 size={14} /> 수정
            </button>
          )}
        </div>
        {isEditing ? (
          <div>
            <textarea
              value={tempValue}
              onChange={(e) => onChange(e.target.value)}
              style={{
                width: '100%',
                minHeight: minHeight,
                padding: '10px',
                border: '2px solid #007bff',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={onSave}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Check size={16} /> {saving ? '저장 중..' : '저장'}
              </button>
              <button
                onClick={onCancel}
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <X size={16} /> 취소
              </button>
            </div>
          </div>
        ) : (
          <p style={{ whiteSpace: 'pre-wrap' }}>{value || '미상'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="event-detail-page">
      {/* Hero Section */}
      <div className="event-hero" style={{ backgroundImage: `url(${posterUrl})` }}>
        <div className="event-hero-overlay"></div>
        <div className="event-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {editingCategory ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.95)', padding: '15px', borderRadius: '8px' }}>
                {/* 현재 선택된 카테고리들 */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tempCategories.map((cat) => (
                    <div
                      key={cat}
                      style={{
                        padding: '8px 12px',
                        background: '#007bff',
                        color: 'white',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px'
                      }}
                    >
                      {cat}
                      <button
                        onClick={() => removeCategory(cat)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* 카테고리 추가 버튼들 */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['전시', '회의', '행사/공연'] as const).map((cat) => (
                    !tempCategories.includes(cat) && (
                      <button
                        key={cat}
                        onClick={() => addCategory(cat)}
                        style={{
                          padding: '6px 12px',
                          background: '#e9ecef',
                          color: '#495057',
                          border: '1px dashed #6c757d',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        + {cat}
                      </button>
                    )
                  ))}
                </div>
                
                {/* 저장/취소 버튼 */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                  <button
                    onClick={saveCategory}
                    disabled={saving || tempCategories.length === 0}
                    style={{
                      padding: '8px 16px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (saving || tempCategories.length === 0) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <Check size={14} />
                    저장
                  </button>
                  <button
                    onClick={cancelEditCategory}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '14px'
                    }}
                  >
                    <X size={14} />
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 다중 카테고리 배지 표시 */}
                {Array.isArray(event.category) ? (
                  event.category.map((cat, index) => (
                    <div key={`${event.id}-cat-${index}`} className="event-hero-badge">{cat}</div>
                  ))
                ) : (
                  <div className="event-hero-badge">{event.category}</div>
                )}
                {isAdmin && (
                  <button
                    onClick={startEditCategory}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#007bff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>
          <h1 className="event-hero-title">{event.title}</h1>
          <div className="event-hero-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editingStartDate || editingEndDate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.95)', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: '#333', fontWeight: 'bold', minWidth: '60px' }}>시작일:</label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        border: '2px solid #007bff',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: '#333', fontWeight: 'bold', minWidth: '60px' }}>종료일:</label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        border: '2px solid #007bff',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={async () => {
                        await saveStartDate();
                        await saveEndDate();
                      }}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} /> 저장
                    </button>
                    <button
                      onClick={() => {
                        cancelEditStartDate();
                        cancelEditEndDate();
                      }}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={14} /> 취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span><Calendar size={20} /> {formatDateRange()}</span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        startEditStartDate();
                        startEditEndDate();
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        color: '#007bff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <Edit2 size={12} /> 날짜 수정
                    </button>
                  )}
                </>
              )}
            </div>
            <span><MapPin size={20} /> {event.venue}, {event.region}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-add-calendar" onClick={handleAddToCalendar}>
              <Calendar size={20} /> Add to Calendar
            </button>
            {isAdmin && (
              <>
                {editingPoster ? (
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={tempPosterUrl}
                      onChange={(e) => setTempPosterUrl(e.target.value)}
                      placeholder="포스터 URL 입력"
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #007bff',
                        borderRadius: '4px',
                        fontSize: '14px',
                        minWidth: '300px'
                      }}
                    />
                    <button
                      onClick={savePoster}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={cancelEditPoster}
                      disabled={saving}
                      style={{
                        padding: '6px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditPoster}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.9)',
                      color: '#007bff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    <Image size={16} /> 포스터 변경
                  </button>
                )}
                <button
                  onClick={loadHistory}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: '#007bff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  <History size={16} /> 변경 이력
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="event-content">
        <div className="event-main">
          {/* Event Info Section - Layout varies by venue */}
          {event.venue === '세텍' ? (
            /* SETEC Layout: Details first, then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                event.operatingHours || formatDateRange(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}

              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}
            </section>
          ) : event.venue === '킨텍스' ? (
            /* KINTEX Layout: Description, then details */
            <section className="event-section">
              {renderEditableField(
                '행사 소개',
                event.description || '정보 없음',
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}

              {renderEditableField(
                '운영 시간',
                event.operatingHours ? formatKintexOperatingHours() : formatDateRange(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}
            </section>
          ) : event.venue === '벡스코' ? (
            /* BEXCO Layout: Details first (always show all fields), then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                formatBexcoOperatingHours(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최/주관',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}

              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}
            </section>
          ) : event.venue === '창원컨벤션센터' ? (
            /* CECO Layout: Details first with manager/contact split, then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                event.operatingHours || formatDateRange(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}

              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}
            </section>
          ) : event.venue === '엑스코' ? (
            /* EXCO Layout: Description first, then details */
            <section className="event-section">
              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}

              <h2 style={{ marginTop: event.description ? '40px' : '0' }}>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                event.operatingHours || formatDateRange(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '관람 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}

              {event.exhibitProducts && (
                <div style={{ marginTop: '20px' }}>
                  <h3>전시제품</h3>
                  <p>{event.exhibitProducts}</p>
                </div>
              )}
            </section>
          ) : event.venue === '수원메쎄' ? (
            /* SUWONMESSE Layout: Details first (always show all fields), then description */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                formatDateRange() + (event.operatingHours ? `\n${event.operatingHours}` : ''),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer || '미상',
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems || '미상',
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}

              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}
            </section>
          ) : event.venue === '수원컨벤션센터' ? (
            /* SCC Layout: Details first (always show all fields), then description - with "주최주관" label, NO exhibit items */
            <section className="event-section">
              <h2>행사 정보</h2>
              
              {renderEditableField(
                '운영 시간',
                formatDateRange() + (event.operatingHours ? `\n${event.operatingHours}` : ''),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee || '미상',
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최주관',
                event.organizer || '미상',
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '행사 소개',
                event.description,
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}
            </section>
          ) : (
            /* COEX and other venues: Description first, then details */
            <section className="event-section">
              {renderEditableField(
                '행사 소개',
                event.description || '정보 없음',
                editingDescription,
                tempDescription,
                startEditDescription,
                saveDescription,
                cancelEditDescription,
                setTempDescription,
                '120px'
              )}

              {renderEditableField(
                '운영 시간',
                event.operatingHours || formatDateRange(),
                editingOperatingHours,
                tempOperatingHours,
                startEditOperatingHours,
                saveOperatingHours,
                cancelEditOperatingHours,
                setTempOperatingHours,
                '80px'
              )}

              {renderEditableField(
                '입장료',
                event.admissionFee,
                editingAdmissionFee,
                tempAdmissionFee,
                startEditAdmissionFee,
                saveAdmissionFee,
                cancelEditAdmissionFee,
                setTempAdmissionFee,
                '60px'
              )}

              {renderEditableField(
                '행사 장소',
                event.venue + (event.venueHall ? ` - ${event.venueHall}` : ''),
                editingVenueHall,
                tempVenueHall,
                startEditVenueHall,
                saveVenueHall,
                cancelEditVenueHall,
                setTempVenueHall,
                '60px'
              )}

              {renderEditableField(
                '주최',
                event.organizer,
                editingOrganizer,
                tempOrganizer,
                startEditOrganizer,
                saveOrganizer,
                cancelEditOrganizer,
                setTempOrganizer,
                '60px'
              )}

              {renderEditableField(
                '주관',
                event.supervisor,
                editingSupervisor,
                tempSupervisor,
                startEditSupervisor,
                saveSupervisor,
                cancelEditSupervisor,
                setTempSupervisor,
                '60px'
              )}

              {renderEditableField(
                '전시품목',
                event.exhibitItems,
                editingExhibitItems,
                tempExhibitItems,
                startEditExhibitItems,
                saveExhibitItems,
                cancelEditExhibitItems,
                setTempExhibitItems,
                '80px'
              )}
            </section>
          )}

          {/* External Links */}
          <section className="event-section">
            <h2>관련 링크</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flexDirection: 'column' }}>
              {/* 경주화백컨벤션센터는 HICO 홈페이지 링크 표시 */}
              {event.venue === '경주화백컨벤션센터' ? (
                <a href="https://www.hico.or.kr/" target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                  <ExternalLink size={20} /> 전시장 홈페이지
                </a>
              ) : (
                <div>
                  {editingVenueUrl ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={tempVenueUrl}
                        onChange={(e) => setTempVenueUrl(e.target.value)}
                        placeholder="전시장 행사 페이지 URL"
                        style={{
                          padding: '10px',
                          border: '2px solid #007bff',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minWidth: '300px',
                          flex: 1
                        }}
                      />
                      <button
                        onClick={saveVenueUrl}
                        disabled={saving}
                        style={{
                          padding: '10px 16px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Check size={16} /> 저장
                      </button>
                      <button
                        onClick={cancelEditVenueUrl}
                        disabled={saving}
                        style={{
                          padding: '10px 16px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <X size={16} /> 취소
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {event.venueEventPageUrl ? (
                        <a href={event.venueEventPageUrl} target="_blank" rel="noopener noreferrer" className="btn-venue-page">
                          <ExternalLink size={20} /> 전시장 행사 페이지
                        </a>
                      ) : (
                        <div style={{ color: '#999', padding: '10px' }}>
                          전시장 행사 페이지 정보가 없습니다
                        </div>
                      )}
                      {isAdmin && (
                        <button
                          onClick={startEditVenueUrl}
                          style={{
                            padding: '8px 12px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '14px'
                          }}
                        >
                          <Edit2 size={14} /> 수정
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                {editingWebsiteUrl ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={tempWebsiteUrl}
                      onChange={(e) => setTempWebsiteUrl(e.target.value)}
                      placeholder="공식 웹사이트 URL"
                      style={{
                        padding: '10px',
                        border: '2px solid #007bff',
                        borderRadius: '4px',
                        fontSize: '14px',
                        minWidth: '300px',
                        flex: 1
                      }}
                    />
                    <button
                      onClick={saveWebsiteUrl}
                      disabled={saving}
                      style={{
                        padding: '10px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Check size={16} /> 저장
                    </button>
                    <button
                      onClick={cancelEditWebsiteUrl}
                      disabled={saving}
                      style={{
                        padding: '10px 16px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <X size={16} /> 취소
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {(event.websiteUrl || event.targetLink) ? (
                      <a href={event.websiteUrl || event.targetLink} target="_blank" rel="noopener noreferrer" className="btn-official-website">
                        <ExternalLink size={20} /> 공식 웹사이트 방문
                      </a>
                    ) : (
                      <div style={{ color: '#999', padding: '10px' }}>
                        공식 웹사이트 정보가 없습니다
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        onClick={startEditWebsiteUrl}
                        style={{
                          padding: '8px 12px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '14px'
                        }}
                      >
                        <Edit2 size={14} /> 수정
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="event-sidebar">
          {/* Share */}
          <div className="sidebar-card">
            <h3>공유하기</h3>
            <div className="share-buttons">
              <button onClick={handleShare} className="btn-share">
                <Share2 size={20} /> 카카오톡
              </button>
              <button onClick={handleCopyLink} className="btn-share">
                <Copy size={20} /> 링크 복사
              </button>
            </div>
          </div>

          {/* Status Badge */}
          {badge && (
            <div className="sidebar-card">
              <div className={`status-badge-large badge-${badge.toLowerCase().replace(/[\s-]+/g, '')}`}>
                {getBadgeText()}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Footer */}
      <footer className="event-footer">
        <div className="footer-links">
          <a href="#">개인정보 처리방침</a>
          <a href="#">이용약관</a>
          <a href="#">고객 지원</a>
          <a href="#">글로벌 네트워크</a>
        </div>
        <p>© 2024 HOKEX MICE Architectural Curator. All rights reserved.</p>
      </footer>

      {/* 변경 이력 모달 */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>변경 이력</h2>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            {eventHistory.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                변경 이력이 없습니다
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {eventHistory.map((history) => (
                  <div
                    key={history.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '15px',
                      background: '#f9f9f9'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '16px', color: '#333' }}>
                          {history.field_name === 'title' && '제목'}
                          {history.field_name === 'poster' && '포스터'}
                          {history.field_name === 'startDate' && '시작일'}
                          {history.field_name === 'endDate' && '종료일'}
                          {history.field_name === 'venueEventPageUrl' && '전시장 행사 페이지 URL'}
                          {history.field_name === 'websiteUrl' && '공식 웹사이트 URL'}
                          {history.field_name === 'description' && '행사 개요'}
                          {history.field_name === 'organizer' && '주최'}
                          {history.field_name === 'supervisor' && '주관'}
                          {history.field_name === 'admissionFee' && '입장료'}
                          {history.field_name === 'exhibitItems' && '전시품목'}
                          {history.field_name === 'operatingHours' && '운영시간'}
                          {history.field_name === 'venueHall' && '행사장소'}
                          {history.field_name === 'category' && '카테고리'}
                        </strong>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                          {new Date(history.changed_at).toLocaleString('ko-KR')}
                          {history.user_profiles && ` • ${history.user_profiles.email}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevert(history.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px'
                        }}
                      >
                        <RotateCcw size={14} /> 되돌리기
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>이전 값:</div>
                        <div style={{ 
                          padding: '8px', 
                          background: '#fff', 
                          borderRadius: '4px', 
                          fontSize: '14px',
                          wordBreak: 'break-word',
                          maxHeight: '100px',
                          overflow: 'auto'
                        }}>
                          {history.old_value || '(없음)'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>새 값:</div>
                        <div style={{ 
                          padding: '8px', 
                          background: '#e8f5e9', 
                          borderRadius: '4px', 
                          fontSize: '14px',
                          wordBreak: 'break-word',
                          maxHeight: '100px',
                          overflow: 'auto'
                        }}>
                          {history.new_value || '(없음)'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

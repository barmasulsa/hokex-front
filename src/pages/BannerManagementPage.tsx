import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllBanners, createBanner, updateBanner, deleteBanner } from '../services/bannerService';
import type { Banner, BannerType } from '../types/banner';
import './BannerManagementPage.css';

export function BannerManagementPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<BannerType>('image'); // 탭 상태

  // 새 배너 폼 상태
  const [formData, setFormData] = useState({
    type: 'image' as BannerType,
    title: '',
    content: '',
    link_url: '',
    is_active: true,
    display_order: 0
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

  const loadBanners = async () => {
    setLoading(true);
    const data = await fetchAllBanners();
    setBanners(data);
    setLoading(false);
  };

  const handleCreate = (type: BannerType) => {
    setIsCreating(true);
    setEditingBanner(null);
    setFormData({
      type: type,
      title: '',
      content: '',
      link_url: '',
      is_active: true,
      display_order: banners.filter(b => b.type === type).length
    });
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
      display_order: banner.display_order
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
      display_order: 0
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

    if (isCreating) {
      const newBanner = await createBanner({
        type: formData.type,
        title: formData.title,
        content: content,
        link_url: formData.link_url || undefined,
        is_active: formData.is_active,
        display_order: formData.display_order
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
        link_url: formData.link_url || undefined,
        is_active: formData.is_active,
        display_order: formData.display_order
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
  const filteredBanners = banners.filter(b => b.type === activeTab);

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
      </div>

      {/* 새 배너 추가 버튼 */}
      <div className="add-banner-section">
        <button className="btn-primary" onClick={() => handleCreate(activeTab)}>
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
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="form-control"
                  rows={4}
                  placeholder="공지 내용을 입력하세요"
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

            {formData.type === 'image' && (
              <div className="form-group">
                <label>링크 URL (선택사항)</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="form-control"
                  placeholder="클릭 시 이동할 URL"
                />
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
                {activeTab === 'image' && <th>링크 URL</th>}
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
  );
}

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

  const handleCreate = () => {
    setIsCreating(true);
    setEditingBanner(null);
    setFormData({
      type: 'image',
      title: '',
      content: '',
      link_url: '',
      is_active: true,
      display_order: banners.length
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    if (isCreating) {
      const newBanner = await createBanner({
        type: formData.type,
        title: formData.title,
        content: formData.content,
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
        content: formData.content,
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

  return (
    <div className="banner-management-page">
      <div className="page-header">
        <h1>배너 관리</h1>
        <button className="btn-primary" onClick={handleCreate}>
          새 배너 추가
        </button>
      </div>

      {/* 배너 폼 */}
      {(isCreating || editingBanner) && (
        <div className="banner-form-container">
          <h2>{isCreating ? '새 배너 추가' : '배너 수정'}</h2>
          <form onSubmit={handleSubmit} className="banner-form">
            <div className="form-group">
              <label>배너 타입</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as BannerType })}
                className="form-control"
              >
                <option value="image">이미지</option>
                <option value="youtube">YouTube</option>
                <option value="text">텍스트 공지</option>
              </select>
            </div>

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
                {formData.type === 'image' && '이미지 URL'}
                {formData.type === 'youtube' && 'YouTube 동영상 ID'}
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
              ) : (
                <input
                  type="text"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="form-control"
                  placeholder={
                    formData.type === 'image'
                      ? 'https://example.com/image.jpg'
                      : 'dQw4w9WgXcQ (YouTube URL의 v= 뒤 부분)'
                  }
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
        <h2>배너 목록</h2>
        {loading ? (
          <p>로딩 중...</p>
        ) : banners.length === 0 ? (
          <p>등록된 배너가 없습니다.</p>
        ) : (
          <table className="banner-table">
            <thead>
              <tr>
                <th>순서</th>
                <th>타입</th>
                <th>제목</th>
                <th>내용</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id}>
                  <td>{banner.display_order}</td>
                  <td>
                    {banner.type === 'image' && '이미지'}
                    {banner.type === 'youtube' && 'YouTube'}
                    {banner.type === 'text' && '텍스트'}
                  </td>
                  <td>{banner.title}</td>
                  <td className="content-cell">
                    {banner.type === 'text' ? (
                      banner.content.substring(0, 50) + (banner.content.length > 50 ? '...' : '')
                    ) : (
                      banner.content.substring(0, 30) + (banner.content.length > 30 ? '...' : '')
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
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function DeletedEventsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [deletedEvents, setDeletedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 관리자만 접근 가능
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/');
    }
  }, [user, authLoading, isAdmin, navigate]);

  // 삭제된 행사 목록 가져오기
  useEffect(() => {
    async function loadDeletedEvents() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });

        if (error) throw error;
        setDeletedEvents(data || []);
      } catch (error) {
        console.error('삭제된 행사 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin) {
      loadDeletedEvents();
    }
  }, [isAdmin]);

  // 행사 복구
  const handleRestore = async (eventId: string, title: string) => {
    if (!confirm(`"${title}"\n\n이 행사를 복구하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: null })
        .eq('id', eventId);

      if (error) throw error;

      // 로컬 상태에서 제거
      setDeletedEvents(prev => prev.filter(event => event.id !== eventId));
      alert('✓ 행사가 복구되었습니다.');
    } catch (error: any) {
      console.error('복구 실패:', error);
      alert('❌ 행사 복구에 실패했습니다:\n' + error.message);
    }
  };

  // 영구 삭제
  const handlePermanentDelete = async (eventId: string, title: string) => {
    const firstConfirm = confirm(`"${title}"\n\n⚠️ 경고: 이 행사를 영구적으로 삭제하시겠습니까?\n\n영구 삭제 후에는 복구할 수 없습니다.`);
    if (!firstConfirm) return;

    const secondConfirm = confirm('⚠️⚠️ 최종 확인\n\n정말로 영구 삭제하시겠습니까?\n복구가 불가능합니다!');
    if (!secondConfirm) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // 로컬 상태에서 제거
      setDeletedEvents(prev => prev.filter(event => event.id !== eventId));
      alert('✓ 행사가 영구 삭제되었습니다.');
    } catch (error: any) {
      console.error('영구 삭제 실패:', error);
      alert('❌ 영구 삭제에 실패했습니다:\n' + error.message);
    }
  };

  if (authLoading || !isAdmin) {
    return null;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>🗑️ 삭제된 행사 관리</h1>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ← 홈으로
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          <p>로딩 중...</p>
        </div>
      ) : deletedEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          <p>삭제된 행사가 없습니다.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem', color: '#666' }}>
            총 {deletedEvents.length}개의 삭제된 행사
          </div>
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>행사명</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>전시장</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>기간</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>삭제 시간</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {deletedEvents.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '1rem' }}>{event.title}</td>
                    <td style={{ padding: '1rem' }}>{event.venue}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#666' }}>
                      {event.start_date} ~ {event.end_date}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#999' }}>
                      {new Date(event.deleted_at).toLocaleString('ko-KR')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRestore(event.id, event.title)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          marginRight: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        ↻ 복구
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(event.id, event.title)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#DC3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        🗑️ 영구삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

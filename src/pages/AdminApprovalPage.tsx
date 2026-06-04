import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminApprovalPage.css';

interface PendingApproval {
  id: string;
  email: string;
  reason: string;
  error_message: string;
  request_count: number;
  first_requested_at: string;
  last_requested_at: string;
}

interface ApprovedEmail {
  id: string;
  email: string;
  approved_by: string;
  approved_at: string;
  notes: string | null;
}

export function AdminApprovalPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  
  const [pendingList, setPendingList] = useState<PendingApproval[]>([]);
  const [approvedList, setApprovedList] = useState<ApprovedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 관리자 권한 체크
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 대기 중인 승인 요청 로드
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_approvals')
        .select('*')
        .order('last_requested_at', { ascending: false });

      if (pendingError) throw pendingError;

      // 승인된 이메일 목록 로드
      const { data: approvedData, error: approvedError } = await supabase
        .from('approved_emails')
        .select('*')
        .order('approved_at', { ascending: false });

      if (approvedError) throw approvedError;

      setPendingList(pendingData || []);
      setApprovedList(approvedData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('데이터를 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // 승인 처리
  const handleApprove = async (email: string, notes?: string) => {
    setError('');
    setSuccessMessage('');

    try {
      // 1. approved_emails에 추가
      const { error: insertError } = await supabase
        .from('approved_emails')
        .insert({
          email,
          notes: notes || null,
        });

      if (insertError) throw insertError;

      // 2. pending_approvals에서 제거
      const { error: deleteError } = await supabase
        .from('pending_approvals')
        .delete()
        .eq('email', email);

      if (deleteError) throw deleteError;

      setSuccessMessage(`✅ ${email} 승인 완료!`);
      
      // 데이터 새로고침
      await loadData();
    } catch (err: any) {
      console.error('Error approving email:', err);
      setError('승인 처리 실패: ' + err.message);
    }
  };

  // 대기 목록에서 제거
  const handleRemovePending = async (email: string) => {
    if (!confirm(`${email}을(를) 대기 목록에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pending_approvals')
        .delete()
        .eq('email', email);

      if (error) throw error;

      setSuccessMessage(`${email}을(를) 대기 목록에서 제거했습니다.`);
      await loadData();
    } catch (err: any) {
      console.error('Error removing pending:', err);
      setError('제거 실패: ' + err.message);
    }
  };

  // 승인 목록에서 제거
  const handleRemoveApproved = async (email: string) => {
    if (!confirm(`${email}의 승인을 취소하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('approved_emails')
        .delete()
        .eq('email', email);

      if (error) throw error;

      setSuccessMessage(`${email}의 승인을 취소했습니다.`);
      await loadData();
    } catch (err: any) {
      console.error('Error removing approved:', err);
      setError('승인 취소 실패: ' + err.message);
    }
  };

  if (loading || !isAdmin) {
    return <div className="admin-approval-page">권한을 확인하는 중...</div>;
  }

  return (
    <div className="admin-approval-page">
      <div className="admin-header">
        <h1>🔐 관리자 승인 시스템</h1>
        <p>스팸 차단으로 로그인하지 못한 사용자를 승인하여 로그인할 수 있게 합니다.</p>
        <button onClick={loadData} disabled={isLoading}>
          🔄 새로고침
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="approval-sections">
        {/* 대기 중인 승인 요청 */}
        <section className="pending-section">
          <h2>⏳ 대기 중인 승인 요청 ({pendingList.length})</h2>
          
          {isLoading ? (
            <p>로딩 중...</p>
          ) : pendingList.length === 0 ? (
            <p className="empty-message">대기 중인 요청이 없습니다.</p>
          ) : (
            <div className="approval-list">
              {pendingList.map((item) => (
                <div key={item.id} className="approval-card pending-card">
                  <div className="card-header">
                    <h3>{item.email}</h3>
                    <span className={`reason-badge ${item.reason.toLowerCase()}`}>
                      {item.reason}
                    </span>
                  </div>
                  
                  <div className="card-body">
                    <p><strong>시도 횟수:</strong> {item.request_count}회</p>
                    <p><strong>첫 시도:</strong> {new Date(item.first_requested_at).toLocaleString('ko-KR')}</p>
                    <p><strong>마지막 시도:</strong> {new Date(item.last_requested_at).toLocaleString('ko-KR')}</p>
                    {item.error_message && (
                      <p className="error-detail">
                        <strong>에러:</strong> {item.error_message}
                      </p>
                    )}
                  </div>

                  <div className="card-actions">
                    <button 
                      className="approve-btn"
                      onClick={() => {
                        const notes = prompt('승인 메모 (선택사항):');
                        if (notes !== null) { // null은 취소, 빈 문자열은 OK
                          handleApprove(item.email, notes);
                        }
                      }}
                    >
                      ✅ 승인
                    </button>
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemovePending(item.email)}
                    >
                      ❌ 제거
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 승인된 이메일 목록 */}
        <section className="approved-section">
          <h2>✅ 승인된 이메일 ({approvedList.length})</h2>
          
          {isLoading ? (
            <p>로딩 중...</p>
          ) : approvedList.length === 0 ? (
            <p className="empty-message">승인된 이메일이 없습니다.</p>
          ) : (
            <div className="approval-list">
              {approvedList.map((item) => (
                <div key={item.id} className="approval-card approved-card">
                  <div className="card-header">
                    <h3>{item.email}</h3>
                  </div>
                  
                  <div className="card-body">
                    <p><strong>승인일:</strong> {new Date(item.approved_at).toLocaleString('ko-KR')}</p>
                    {item.notes && (
                      <p><strong>메모:</strong> {item.notes}</p>
                    )}
                  </div>

                  <div className="card-actions">
                    <button 
                      className="remove-btn"
                      onClick={() => handleRemoveApproved(item.email)}
                    >
                      🗑️ 승인 취소
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

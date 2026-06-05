import { useAuth } from '../contexts/AuthContext'
import { AnalyticsStats } from '../components/AnalyticsStats'
import { Navigate } from 'react-router-dom'
import './AdminAnalyticsPage.css'

export function AdminAnalyticsPage() {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="admin-analytics-page">
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  // 관리자가 아니면 홈으로 리다이렉트
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="admin-analytics-page">
      <div className="page-header">
        <h1>📊 방문자 통계 대시보드</h1>
        <p className="page-description">
          Google Analytics를 통해 수집된 실시간 방문자 통계를 확인할 수 있습니다.
        </p>
      </div>

      <div className="analytics-container">
        <AnalyticsStats />
      </div>

      <div className="info-section">
        <h3>💡 통계 정보</h3>
        <ul>
          <li><strong>대한민국 방문자:</strong> 한국에서 접속한 사용자 (기본 표시)</li>
          <li><strong>해외 방문자:</strong> 한국 외 지역에서 접속한 사용자</li>
          <li><strong>데이터 소스:</strong> Google Analytics 4 (GA4)</li>
          <li><strong>업데이트:</strong> 실시간 (🔄 버튼으로 수동 새로고침 가능)</li>
        </ul>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useGoogleAnalytics } from '../hooks/useGoogleAnalytics'
import './AnalyticsStats.css'

type TabType = 'domestic' | 'international'

export function AnalyticsStats() {
  const [activeTab, setActiveTab] = useState<TabType>('domestic')
  const { data, loading, error, refetch } = useGoogleAnalytics('both')

  if (loading) {
    return (
      <div className="analytics-stats">
        <div className="loading">
          <div className="spinner"></div>
          <p>방문자 통계를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-stats">
        <div className="error">
          <p>⚠️ 통계를 불러오는데 실패했습니다</p>
          <p className="error-message">{error}</p>
          <button onClick={refetch} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const domesticStats = data?.domestic
  const internationalStats = data?.international
  const currentStats = activeTab === 'domestic' ? domesticStats : internationalStats

  return (
    <div className="analytics-stats">
      <div className="analytics-header">
        <h2>📊 방문자 통계</h2>
        <button onClick={refetch} className="refresh-button" title="새로고침">
          🔄
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'domestic' ? 'active' : ''}`}
          onClick={() => setActiveTab('domestic')}
        >
          🇰🇷 대한민국
          {domesticStats && (
            <span className="tab-count">({domesticStats.today.toLocaleString()})</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'international' ? 'active' : ''}`}
          onClick={() => setActiveTab('international')}
        >
          🌍 해외
          {internationalStats && (
            <span className="tab-count">({internationalStats.today.toLocaleString()})</span>
          )}
        </button>
      </div>

      {/* 통계 그리드 */}
      {currentStats && (
        <div className="stats-grid">
          <StatCard
            label="오늘"
            value={currentStats.today}
            icon="📅"
            highlight
          />
          <StatCard
            label="어제"
            value={currentStats.yesterday}
            icon="🕐"
          />
          <StatCard
            label="최근 7일"
            value={currentStats.last7Days}
            icon="📊"
          />
          <StatCard
            label="최근 15일"
            value={currentStats.last15Days}
            icon="📈"
          />
          <StatCard
            label="최근 30일"
            value={currentStats.last30Days}
            icon="📆"
          />
          <StatCard
            label="최근 3개월"
            value={currentStats.last3Months}
            icon="🗓️"
          />
          <StatCard
            label="최근 6개월"
            value={currentStats.last6Months}
            icon="📅"
          />
          <StatCard
            label="최근 1년"
            value={currentStats.last365Days}
            icon="🎯"
          />
          <StatCard
            label="전체"
            value={currentStats.allTime}
            icon="🏆"
            highlight
          />
        </div>
      )}

      {/* 비교 요약 */}
      {domesticStats && internationalStats && (
        <div className="comparison-summary">
          <h3>📌 요약</h3>
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-label">오늘 전체 방문자</div>
              <div className="summary-value">
                {(domesticStats.today + internationalStats.today).toLocaleString()}
              </div>
              <div className="summary-breakdown">
                국내: {domesticStats.today.toLocaleString()} | 
                해외: {internationalStats.today.toLocaleString()}
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">최근 30일 전체</div>
              <div className="summary-value">
                {(domesticStats.last30Days + internationalStats.last30Days).toLocaleString()}
              </div>
              <div className="summary-breakdown">
                국내: {domesticStats.last30Days.toLocaleString()} | 
                해외: {internationalStats.last30Days.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon?: string
  highlight?: boolean
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString()}</div>
    </div>
  )
}

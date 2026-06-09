import { useState, useEffect } from 'react';
import { 
  getDetailedVisitorStatistics, 
  getHourlyVisitorStats,
  getDailyVisitorStats,
  downloadStatsAsCSV,
  type DetailedVisitorStats,
  type HourlyStats,
  type DailyStats
} from '../utils/visitorCounter';
import { PresenceManager } from '../utils/onlinePresence';
import './VisitorStatisticsDashboard.css';

export function VisitorStatisticsDashboard() {
  const [stats, setStats] = useState<DetailedVisitorStats | null>(null);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedDaysRange, setSelectedDaysRange] = useState<number>(30);

  // 실시간 온라인 사용자 추적
  useEffect(() => {
    const presenceManager = new PresenceManager();
    presenceManager.start((count) => {
      setOnlineCount(count);
    });

    return () => {
      presenceManager.stop();
    };
  }, []);

  // 통계 데이터 로드
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, hourlyData, dailyData] = await Promise.all([
        getDetailedVisitorStatistics(),
        getHourlyVisitorStats(),
        getDailyVisitorStats('hokex.xyz', selectedDaysRange)
      ]);
      
      if (statsData) {
        setStats(statsData);
        setHourlyStats(hourlyData);
        setDailyStats(dailyData);
        setLastUpdated(new Date());
      } else {
        setError('통계 데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('[VisitorStatistics] 로드 실패:', err);
      setError('통계 데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadStats();
  }, [selectedDaysRange]);

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [selectedDaysRange]);

  // CSV 다운로드 핸들러
  const handleDownload = () => {
    if (stats) {
      downloadStatsAsCSV(stats, hourlyStats, dailyStats);
    }
  };

  if (loading) {
    return (
      <div className="visitor-stats-dashboard">
        <div className="loading-message">
          <div className="spinner"></div>
          <p>통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="visitor-stats-dashboard">
        <div className="error-message">
          <p>❌ {error || '데이터를 불러올 수 없습니다.'}</p>
          <button onClick={loadStats} className="retry-btn">다시 시도</button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString('ko-KR');
  const formatDate = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="visitor-stats-dashboard">
      <div className="dashboard-header">
        <h2>📊 방문자 통계 대시보드</h2>
        <div className="header-info">
          <span className="last-updated">
            마지막 업데이트: {formatDate(lastUpdated)}
          </span>
          <button onClick={loadStats} className="refresh-btn" title="새로고침">
            🔄 새로고침
          </button>
          <button onClick={handleDownload} className="download-btn" title="CSV 다운로드" disabled={!stats}>
            📥 CSV 다운로드
          </button>
        </div>
      </div>

      {/* 실시간 접속자 */}
      <div className="stats-section realtime-section">
        <div className="stat-card realtime-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">
              <span className="online-indicator pulsing"></span>
              현재 접속
            </div>
            <div className="stat-value realtime-value">{formatNumber(onlineCount)}</div>
            <div className="stat-unit">명 온라인</div>
          </div>
        </div>
      </div>

      {/* 주요 통계 (오늘, 어제, 전체) */}
      <div className="stats-section primary-stats">
        <div className="stat-card today-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">오늘 방문자</div>
            <div className="stat-value">{formatNumber(stats.stats.today)}</div>
            <div className="stat-unit">명</div>
          </div>
        </div>

        <div className="stat-card yesterday-card">
          <div className="stat-icon">⏮️</div>
          <div className="stat-content">
            <div className="stat-label">어제 방문자</div>
            <div className="stat-value">{formatNumber(stats.stats.yesterday)}</div>
            <div className="stat-unit">명</div>
          </div>
        </div>

        <div className="stat-card total-card">
          <div className="stat-icon">🌍</div>
          <div className="stat-content">
            <div className="stat-label">총 방문자</div>
            <div className="stat-value highlight">{formatNumber(stats.stats.total)}</div>
            <div className="stat-unit">명</div>
          </div>
        </div>
      </div>

      {/* 시간대별 통계 */}
      <div className="stats-section hourly-stats-section">
        <h3>⏰ 시간대별 방문자 (오늘)</h3>
        <div className="hourly-chart">
          {hourlyStats.map((h) => {
            const maxCount = Math.max(...hourlyStats.map(s => s.count), 1);
            const heightPercent = (h.count / maxCount) * 100;
            return (
              <div key={h.hour} className="hourly-bar-container">
                <div className="hourly-bar" style={{ height: `${heightPercent}%` }}>
                  <span className="hourly-count">{h.count > 0 ? h.count : ''}</span>
                </div>
                <div className="hourly-label">{h.hour}시</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 날짜별 통계 */}
      <div className="stats-section daily-stats-section">
        <div className="section-header-with-filter">
          <h3>📈 날짜별 방문자</h3>
          <select 
            value={selectedDaysRange} 
            onChange={(e) => setSelectedDaysRange(Number(e.target.value))}
            className="days-range-select"
          >
            <option value={7}>최근 7일</option>
            <option value={14}>최근 14일</option>
            <option value={30}>최근 30일</option>
            <option value={60}>최근 60일</option>
            <option value={90}>최근 90일</option>
          </select>
        </div>
        <div className="daily-chart">
          {dailyStats.map((d) => {
            const maxCount = Math.max(...dailyStats.map(s => s.count), 1);
            const heightPercent = (d.count / maxCount) * 100;
            return (
              <div key={d.date} className="daily-bar-container">
                <div className="daily-bar" style={{ height: `${heightPercent}%` }}>
                  <span className="daily-count">{d.count > 0 ? d.count : ''}</span>
                </div>
                <div className="daily-label">{d.date.substring(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 기간별 통계 */}
      <div className="stats-section period-stats">
        <h3>📈 기간별 방문자 통계</h3>
        <div className="period-stats-grid">
          <div className="stat-card period-card">
            <div className="stat-label">최근 7일</div>
            <div className="stat-value">{formatNumber(stats.stats.last_7_days)}</div>
            <div className="stat-unit">명</div>
          </div>

          <div className="stat-card period-card">
            <div className="stat-label">최근 30일</div>
            <div className="stat-value">{formatNumber(stats.stats.last_30_days)}</div>
            <div className="stat-unit">명</div>
          </div>

          <div className="stat-card period-card">
            <div className="stat-label">최근 3개월</div>
            <div className="stat-value">{formatNumber(stats.stats.last_3_months)}</div>
            <div className="stat-unit">명</div>
          </div>

          <div className="stat-card period-card">
            <div className="stat-label">최근 6개월</div>
            <div className="stat-value">{formatNumber(stats.stats.last_6_months)}</div>
            <div className="stat-unit">명</div>
          </div>

          <div className="stat-card period-card">
            <div className="stat-label">최근 1년</div>
            <div className="stat-value">{formatNumber(stats.stats.last_1_year)}</div>
            <div className="stat-unit">명</div>
          </div>
        </div>
      </div>

      {/* 도메인 정보 */}
      <div className="stats-footer">
        <p>🌐 도메인: <strong>{stats.domain}</strong></p>
        <p>⏰ 집계 시각: {new Date(stats.timestamp).toLocaleString('ko-KR')}</p>
      </div>
    </div>
  );
}

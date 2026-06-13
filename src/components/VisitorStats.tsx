import { useState, useEffect } from 'react';
import { getDetailedVisitorStatistics } from '../utils/visitorCounter';
import { Users, TrendingUp } from 'lucide-react';
import './VisitorStats.css';

interface VisitorStatsData {
  today: number;
  yesterday: number;
  last7days: number;
  last30days: number;
}

export function VisitorStats() {
  const [stats, setStats] = useState<VisitorStatsData>({
    today: 0,
    yesterday: 0,
    last7days: 0,
    last30days: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        
        // getDetailedVisitorStatistics() 함수 사용 (관리자 페이지와 동일)
        const data = await getDetailedVisitorStatistics('hokex.xyz');

        if (data && data.stats) {
          setStats({
            today: data.stats.today || 0,
            yesterday: data.stats.yesterday || 0,
            last7days: data.stats.last_7_days || 0,
            last30days: data.stats.last_30_days || 0
          });
        }
      } catch (error) {
        console.error('방문자 통계 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    
    // 1분마다 통계 갱신
    const interval = setInterval(fetchStats, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="visitor-stats-card">
        <div className="visitor-stats-header">
          <Users size={20} />
          <h3>방문자 통계</h3>
        </div>
        <div className="visitor-stats-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="visitor-stats-card">
      <div className="visitor-stats-header">
        <Users size={20} />
        <h3>방문자 통계</h3>
      </div>
      
      <div className="visitor-stats-grid">
        <div className="stat-item">
          <div className="stat-label">오늘 방문</div>
          <div className="stat-value">{stats.today.toLocaleString()}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">어제 방문</div>
          <div className="stat-value">{stats.yesterday.toLocaleString()}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">최근 7일</div>
          <div className="stat-value">{stats.last7days.toLocaleString()}</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-label">최근 30일</div>
          <div className="stat-value">{stats.last30days.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="visitor-stats-footer">
        <TrendingUp size={14} />
        <span>실시간 통계</span>
      </div>
    </div>
  );
}

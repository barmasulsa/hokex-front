// 관리자용 세부 방문자 통계 유틸리티

export interface HourlyVisit {
  hour: number; // 0-23
  count: number;
}

export interface DailyVisit {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface DetailedVisitorStats {
  // 기본 통계
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  last365Days: number;
  
  // 시간대별 통계 (오늘)
  hourlyToday: HourlyVisit[];
  
  // 일별 통계 (최근 30일)
  dailyLast30Days: DailyVisit[];
  
  // 일별 통계 (최근 1년)
  dailyLast365Days: DailyVisit[];
  
  // 총 방문 수
  totalVisits: number;
  
  // 데이터 수집 시작일
  firstVisitDate: string | null;
}

const STORAGE_KEY = 'visitor_history_detailed';

interface VisitRecord {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  count: number;
}

// 방문 기록 저장 (시간대별)
export function recordDetailedVisit() {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const hour = now.getHours(); // 0-23
  
  const records = getVisitRecords();
  
  // 해당 날짜와 시간의 기록 찾기
  const key = `${date}-${hour}`;
  const existingIndex = records.findIndex(r => `${r.date}-${r.hour}` === key);
  
  if (existingIndex >= 0) {
    records[existingIndex].count++;
  } else {
    records.push({ date, hour, count: 1 });
  }
  
  // 1년 이전 데이터 삭제
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const filteredRecords = records.filter(r => new Date(r.date) >= oneYearAgo);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
}

// 방문 기록 가져오기
function getVisitRecords(): VisitRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 세부 통계 계산
export function getDetailedVisitorStats(): DetailedVisitorStats {
  const records = getVisitRecords();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 어제 날짜
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // 기준 날짜들
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // 기본 통계 계산
  let todayCount = 0;
  let yesterdayCount = 0;
  let last7DaysCount = 0;
  let last30DaysCount = 0;
  let last365DaysCount = 0;
  let totalVisits = 0;
  
  // 시간대별 통계 (오늘)
  const hourlyToday: HourlyVisit[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0
  }));
  
  // 일별 통계 맵
  const dailyMap = new Map<string, number>();
  
  records.forEach(record => {
    const recordDate = new Date(record.date);
    totalVisits += record.count;
    
    // 오늘
    if (record.date === today) {
      todayCount += record.count;
      hourlyToday[record.hour].count += record.count;
    }
    
    // 어제
    if (record.date === yesterdayStr) {
      yesterdayCount += record.count;
    }
    
    // 최근 7일
    if (recordDate >= sevenDaysAgo) {
      last7DaysCount += record.count;
    }
    
    // 최근 30일
    if (recordDate >= thirtyDaysAgo) {
      last30DaysCount += record.count;
      const current = dailyMap.get(record.date) || 0;
      dailyMap.set(record.date, current + record.count);
    }
    
    // 최근 1년
    if (recordDate >= oneYearAgo) {
      last365DaysCount += record.count;
      if (!dailyMap.has(record.date)) {
        dailyMap.set(record.date, record.count);
      }
    }
  });
  
  // 일별 통계 배열로 변환 (최근 30일)
  const dailyLast30Days: DailyVisit[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyLast30Days.push({
      date: dateStr,
      count: dailyMap.get(dateStr) || 0
    });
  }
  
  // 일별 통계 배열로 변환 (최근 1년)
  const dailyLast365Days: DailyVisit[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyLast365Days.push({
      date: dateStr,
      count: dailyMap.get(dateStr) || 0
    });
  }
  
  // 첫 방문 날짜
  const firstVisitDate = records.length > 0
    ? records.reduce((earliest, record) => {
        return record.date < earliest ? record.date : earliest;
      }, records[0].date)
    : null;
  
  return {
    today: todayCount,
    yesterday: yesterdayCount,
    last7Days: last7DaysCount,
    last30Days: last30DaysCount,
    last365Days: last365DaysCount,
    hourlyToday,
    dailyLast30Days,
    dailyLast365Days,
    totalVisits,
    firstVisitDate
  };
}

// CSV 다운로드 함수
export function downloadStatsAsCSV(stats: DetailedVisitorStats) {
  const lines: string[] = [];
  
  // 헤더
  lines.push('HOKEX 방문자 통계 리포트');
  lines.push(`생성일시: ${new Date().toLocaleString('ko-KR')}`);
  lines.push('');
  
  // 요약 통계
  lines.push('=== 요약 통계 ===');
  lines.push(`총 방문 수,${stats.totalVisits}`);
  lines.push(`데이터 수집 시작일,${stats.firstVisitDate || 'N/A'}`);
  lines.push(`오늘,${stats.today}`);
  lines.push(`어제,${stats.yesterday}`);
  lines.push(`최근 7일,${stats.last7Days}`);
  lines.push(`최근 30일,${stats.last30Days}`);
  lines.push(`최근 1년,${stats.last365Days}`);
  lines.push('');
  
  // 오늘 시간대별 통계
  lines.push('=== 오늘 시간대별 방문 ===');
  lines.push('시간,방문 수');
  stats.hourlyToday.forEach(h => {
    lines.push(`${h.hour}시,${h.count}`);
  });
  lines.push('');
  
  // 최근 30일 일별 통계
  lines.push('=== 최근 30일 일별 방문 ===');
  lines.push('날짜,방문 수');
  stats.dailyLast30Days.forEach(d => {
    lines.push(`${d.date},${d.count}`);
  });
  lines.push('');
  
  // 최근 1년 일별 통계
  lines.push('=== 최근 1년 일별 방문 ===');
  lines.push('날짜,방문 수');
  stats.dailyLast365Days.forEach(d => {
    lines.push(`${d.date},${d.count}`);
  });
  
  // CSV 파일 생성 및 다운로드
  const csvContent = lines.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `hokex_visitor_stats_${new Date().toISOString().split('T')[0]}.csv`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// JSON 다운로드 함수
export function downloadStatsAsJSON(stats: DetailedVisitorStats) {
  const data = {
    generatedAt: new Date().toISOString(),
    stats
  };
  
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `hokex_visitor_stats_${new Date().toISOString().split('T')[0]}.json`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 통계 데이터 초기화 (관리자 전용)
export function clearAllStats() {
  if (confirm('모든 방문자 통계 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('visitor_history'); // 기존 통계도 삭제
    alert('모든 통계 데이터가 삭제되었습니다.');
    return true;
  }
  return false;
}

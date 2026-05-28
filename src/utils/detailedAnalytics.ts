// 관리자용 세부 방문자 통계 유틸리티
import { createClient } from '@supabase/supabase-js';

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

// Supabase 클라이언트 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 세션 내 중복 호출 방지 플래그
let hasRecordedThisSession = false;

// 디버그 정보를 콘솔에만 출력 (화면 표시 제거)
function showDebugInfo(message: string, isError = false) {
  if (isError) {
    console.error(message);
  } else {
    console.log(message);
  }
}

// 방문 기록 저장 (시간대별) - 하루에 한 번만 카운트
export function recordDetailedVisit() {
  // 이미 이번 세션에서 기록했으면 중복 실행 방지
  if (hasRecordedThisSession) {
    showDebugInfo('Already recorded in this session, skipping');
    return;
  }
  
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const hour = now.getHours(); // 0-23
  
  showDebugInfo(`현재 시간: ${date} ${hour}시`);
  
  // 오늘 이미 방문했는지 확인
  const lastVisitDate = localStorage.getItem('last_visit_date');
  showDebugInfo(`localStorage last_visit_date: ${lastVisitDate || '없음'}`);
  
  if (lastVisitDate === date) {
    // 오늘 이미 방문했으면 카운트하지 않음
    showDebugInfo('Already visited today, skipping');
    hasRecordedThisSession = true; // 세션 플래그 설정
    return;
  }
  
  // 오늘 첫 방문이므로 기록
  showDebugInfo(`✅ Recording new visit for ${date} ${hour}시`);
  localStorage.setItem('last_visit_date', date);
  hasRecordedThisSession = true; // 세션 플래그 설정
  
  // localStorage에 저장 (즉시, 동기)
  const records = getVisitRecords();
  const key = `${date}-${hour}`;
  const existingIndex = records.findIndex(r => `${r.date}-${r.hour}` === key);
  
  if (existingIndex >= 0) {
    records[existingIndex].count++;
    showDebugInfo(`localStorage: 기존 기록 업데이트 (count: ${records[existingIndex].count})`);
  } else {
    records.push({ date, hour, count: 1 });
    showDebugInfo(`localStorage: 새 기록 추가`);
  }
  
  // 1년 이전 데이터 삭제
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const filteredRecords = records.filter(r => new Date(r.date) >= oneYearAgo);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredRecords));
  showDebugInfo(`localStorage 저장 완료`);
  
  // DB에 비동기 저장 (백그라운드, await 없음)
  showDebugInfo(`DB 저장 시작...`);
  recordToDBAsync(date, hour).catch(err => {
    showDebugInfo(`❌ DB 저장 실패: ${err.message}`, true);
  });
}

// DB에 비동기로 저장 (사용자는 기다리지 않음)
async function recordToDBAsync(date: string, hour: number) {
  try {
    showDebugInfo(`DB RPC 호출: increment_visitor_stat`);
    
    // RPC 함수 호출: increment_visitor_stat
    // 이 함수는 UPSERT를 수행하여 중복 방지
    const { error } = await supabase.rpc('increment_visitor_stat', {
      p_visit_date: date,
      p_visit_hour: hour
    });
    
    if (error) {
      showDebugInfo(`❌ DB RPC 실패: ${error.message}`, true);
      showDebugInfo(`에러 코드: ${error.code || 'N/A'}`, true);
      showDebugInfo(`에러 상세: ${JSON.stringify(error)}`, true);
    } else {
      showDebugInfo(`✅ DB 저장 성공!`);
    }
  } catch (err: any) {
    // 에러 무시 (통계만 누락, 사이트는 정상)
    showDebugInfo(`❌ DB 저장 예외: ${err.message}`, true);
  }
}

// 기존 localStorage 데이터를 DB로 마이그레이션
export async function migrateOldDataToDB() {
  try {
    // 기존 visitor_history 데이터 가져오기
    const oldData = localStorage.getItem('visitor_history');
    if (!oldData) {
      console.log('마이그레이션할 기존 데이터가 없습니다.');
      return { success: true, migrated: 0 };
    }
    
    const visits: Record<string, number> = JSON.parse(oldData);
    let migratedCount = 0;
    
    // 각 날짜별 데이터를 DB에 저장
    for (const [date, count] of Object.entries(visits)) {
      if (count > 0) {
        // 시간대는 알 수 없으므로 12시(정오)로 설정
        const { error } = await supabase
          .from('visitor_stats')
          .upsert(
            {
              visit_date: date,
              visit_hour: 12,
              visit_count: count
            },
            {
              onConflict: 'visit_date,visit_hour',
              ignoreDuplicates: false
            }
          );
        
        if (!error) {
          migratedCount++;
        }
      }
    }
    
    console.log(`마이그레이션 완료: ${migratedCount}개 날짜 데이터 저장됨`);
    
    // 마이그레이션 완료 표시
    localStorage.setItem('visitor_data_migrated', 'true');
    
    return { success: true, migrated: migratedCount };
  } catch (err) {
    console.error('마이그레이션 실패:', err);
    return { success: false, migrated: 0, error: err };
  }
}

// 방문 기록 가져오기
function getVisitRecords(): VisitRecord[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 캐시된 통계 가져오기 (빠름, 5분마다 업데이트)
export async function getCachedVisitorStats(): Promise<{ today: number; yesterday: number; last7Days: number; last30Days: number }> {
  try {
    const { data, error } = await supabase
      .from('visitor_stats_cache')
      .select('today, yesterday, last_7_days, last_30_days')
      .eq('cache_key', 'summary')
      .single();
    
    if (error || !data) {
      console.error('캐시 조회 실패:', error);
      return { today: 0, yesterday: 0, last7Days: 0, last30Days: 0 };
    }
    
    return {
      today: data.today,
      yesterday: data.yesterday,
      last7Days: data.last_7_days,
      last30Days: data.last_30_days
    };
  } catch (err) {
    console.error('캐시 조회 중 에러:', err);
    return { today: 0, yesterday: 0, last7Days: 0, last30Days: 0 };
  }
}

// 세부 통계 계산 (DB 기반)
export async function getDetailedVisitorStats(): Promise<DetailedVisitorStats> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 어제 날짜
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // 기준 날짜들
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
  
  try {
    // DB에서 최근 1년 데이터 조회
    const { data: records, error } = await supabase
      .from('visitor_stats')
      .select('visit_date, visit_hour, visit_count')
      .gte('visit_date', oneYearAgoStr)
      .order('visit_date', { ascending: true });
    
    if (error) {
      console.error('DB 조회 실패:', error);
      // 에러 시 빈 통계 반환
      return getEmptyStats();
    }
    
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
    
    records?.forEach(record => {
      const recordDate = record.visit_date;
      const count = record.visit_count;
      totalVisits += count;
      
      // 오늘
      if (recordDate === today) {
        todayCount += count;
        hourlyToday[record.visit_hour].count += count;
      }
      
      // 어제
      if (recordDate === yesterdayStr) {
        yesterdayCount += count;
      }
      
      // 최근 7일
      if (recordDate >= sevenDaysAgoStr) {
        last7DaysCount += count;
      }
      
      // 최근 30일
      if (recordDate >= thirtyDaysAgoStr) {
        last30DaysCount += count;
        const current = dailyMap.get(recordDate) || 0;
        dailyMap.set(recordDate, current + count);
      }
      
      // 최근 1년
      last365DaysCount += count;
      if (!dailyMap.has(recordDate)) {
        dailyMap.set(recordDate, count);
      } else {
        dailyMap.set(recordDate, dailyMap.get(recordDate)! + count);
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
    const firstVisitDate = records && records.length > 0
      ? records[0].visit_date
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
  } catch (err) {
    console.error('통계 조회 중 에러:', err);
    return getEmptyStats();
  }
}

// 빈 통계 반환 (에러 시)
function getEmptyStats(): DetailedVisitorStats {
  const hourlyToday: HourlyVisit[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0
  }));
  
  const now = new Date();
  const dailyLast30Days: DailyVisit[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dailyLast30Days.push({
      date: date.toISOString().split('T')[0],
      count: 0
    });
  }
  
  const dailyLast365Days: DailyVisit[] = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dailyLast365Days.push({
      date: date.toISOString().split('T')[0],
      count: 0
    });
  }
  
  return {
    today: 0,
    yesterday: 0,
    last7Days: 0,
    last30Days: 0,
    last365Days: 0,
    hourlyToday,
    dailyLast30Days,
    dailyLast365Days,
    totalVisits: 0,
    firstVisitDate: null
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

// 통계 데이터 백업 (삭제 전 자동 백업)
function backupStatsToLocalStorage() {
  const timestamp = new Date().toISOString();
  const backup = {
    timestamp,
    visitor_history_detailed: localStorage.getItem(STORAGE_KEY),
    visitor_history: localStorage.getItem('visitor_history'),
    last_visit_date: localStorage.getItem('last_visit_date')
  };
  
  localStorage.setItem('visitor_stats_backup', JSON.stringify(backup));
  return backup;
}

// 백업에서 복구
export function restoreStatsFromBackup() {
  const backupStr = localStorage.getItem('visitor_stats_backup');
  if (!backupStr) {
    alert('복구할 백업 데이터가 없습니다.');
    return false;
  }
  
  try {
    const backup = JSON.parse(backupStr);
    
    if (backup.visitor_history_detailed) {
      localStorage.setItem(STORAGE_KEY, backup.visitor_history_detailed);
    }
    if (backup.visitor_history) {
      localStorage.setItem('visitor_history', backup.visitor_history);
    }
    if (backup.last_visit_date) {
      localStorage.setItem('last_visit_date', backup.last_visit_date);
    }
    
    const backupDate = new Date(backup.timestamp).toLocaleString('ko-KR');
    alert(`백업 데이터가 복구되었습니다.\n백업 시간: ${backupDate}`);
    return true;
  } catch (err) {
    console.error('복구 실패:', err);
    alert('백업 데이터 복구에 실패했습니다.');
    return false;
  }
}

// 통계 데이터 초기화 (관리자 전용)
export async function clearAllStats() {
  // 1단계: 첫 번째 확인
  if (!confirm('⚠️ 경고: 모든 방문자 통계 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
    return false;
  }
  
  // 2단계: 두 번째 확인 (실수 방지)
  const confirmText = prompt(
    '정말로 삭제하시겠습니까?\n\n삭제하려면 "삭제"를 입력하세요.\n\n(삭제 전 자동으로 백업됩니다)'
  );
  
  if (confirmText !== '삭제') {
    alert('삭제가 취소되었습니다.');
    return false;
  }
  
  try {
    // 3단계: 자동 백업
    const backup = backupStatsToLocalStorage();
    console.log('백업 완료:', backup.timestamp);
    
    // 4단계: localStorage 삭제
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('visitor_history');
    localStorage.removeItem('last_visit_date');
    
    // 5단계: DB 삭제 (선택적)
    const deleteDB = confirm('DB에 저장된 통계 데이터도 삭제하시겠습니까?\n\n(권장하지 않음: DB 데이터는 유지하는 것이 좋습니다)');
    
    if (deleteDB) {
      const { error } = await supabase
        .from('visitor_stats')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 데이터 삭제
      
      if (error) {
        console.error('DB 삭제 실패:', error);
        alert('localStorage는 삭제되었지만 DB 삭제에 실패했습니다.\n\n백업에서 복구할 수 있습니다.');
      } else {
        alert('모든 통계 데이터가 삭제되었습니다.\n\n백업에서 복구할 수 있습니다.');
      }
    } else {
      alert('localStorage 통계 데이터가 삭제되었습니다.\n(DB 데이터는 유지됨)\n\n백업에서 복구할 수 있습니다.');
    }
    
    return true;
  } catch (err) {
    console.error('삭제 중 에러:', err);
    alert('삭제 중 오류가 발생했습니다.');
    return false;
  }
}

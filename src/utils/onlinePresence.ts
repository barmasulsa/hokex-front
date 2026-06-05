// 현재 접속 인원 추적 유틸리티 (Supabase Realtime)

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// 세션 ID 생성 또는 가져오기
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('hokex_session_id');
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('hokex_session_id', sessionId);
  }
  
  return sessionId;
}

// 현재 접속자 수 가져오기
export async function getOnlineCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('online_users')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', new Date(Date.now() - 30000).toISOString()); // 30초 이내
    
    if (error) {
      console.error('Error fetching online count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Error in getOnlineCount:', error);
    return 0;
  }
}

// 접속 기록 (upsert)
export async function recordPresence(): Promise<void> {
  const sessionId = getSessionId();
  
  try {
    const { error } = await supabase
      .from('online_users')
      .upsert(
        {
          session_id: sessionId,
          last_seen: new Date().toISOString()
        },
        {
          onConflict: 'session_id'
        }
      );
    
    if (error) {
      console.error('Error recording presence:', error);
    }
  } catch (error) {
    console.error('Error in recordPresence:', error);
  }
}

// 접속 종료 (세션 삭제)
export async function removePresence(): Promise<void> {
  const sessionId = getSessionId();
  
  try {
    const { error } = await supabase
      .from('online_users')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) {
      console.error('Error removing presence:', error);
    }
  } catch (error) {
    console.error('Error in removePresence:', error);
  }
}

// 비활성 세션 정리 (클라이언트 측에서도 실행)
export async function cleanupInactiveSessions(): Promise<void> {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    
    const { error } = await supabase
      .from('online_users')
      .delete()
      .lt('last_seen', thirtySecondsAgo);
    
    if (error) {
      console.error('Error cleaning up inactive sessions:', error);
    }
  } catch (error) {
    console.error('Error in cleanupInactiveSessions:', error);
  }
}

// Realtime 구독 설정
export function subscribeToOnlineUsers(
  onCountChange: (count: number) => void
): RealtimeChannel {
  // 고유한 채널 이름 생성 (타임스탬프 포함)
  const channelName = `online_users_changes_${Date.now()}`;
  
  // 채널 생성 및 이벤트 리스너 등록 (subscribe 전에)
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'online_users'
      },
      async () => {
        // 변경 발생 시 현재 접속자 수 다시 가져오기
        const count = await getOnlineCount();
        onCountChange(count);
      }
    )
    .subscribe(); // 리스너 등록 후 구독
  
  return channel;
}

// Presence 관리 클래스
export class PresenceManager {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private channel: RealtimeChannel | null = null;
  
  // 시작
  async start(onCountChange: (count: number) => void): Promise<void> {
    // 초기 접속 기록
    await recordPresence();
    
    // 초기 카운트 가져오기
    const initialCount = await getOnlineCount();
    onCountChange(initialCount);
    
    // 10초마다 heartbeat (활동 기록)
    this.heartbeatInterval = setInterval(() => {
      recordPresence();
    }, 10000);
    
    // 30초마다 비활성 세션 정리
    this.cleanupInterval = setInterval(() => {
      cleanupInactiveSessions();
    }, 30000);
    
    // Realtime 구독
    this.channel = subscribeToOnlineUsers(onCountChange);
    
    // 페이지 종료 시 세션 삭제
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  // 정지
  async stop(): Promise<void> {
    // Heartbeat 중지
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Cleanup 중지
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Realtime 구독 해제
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    // 세션 삭제
    await removePresence();
    
    // 이벤트 리스너 제거
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
  
  private handleBeforeUnload = () => {
    // 페이지 종료 시 세션 삭제 시도 (비동기이지만 최선을 다함)
    removePresence();
  };
}

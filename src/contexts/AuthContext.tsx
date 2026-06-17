import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  nickname: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  adminModeEnabled: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signInWithNaver: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  resetNickname: () => Promise<void>;
  unsubscribe: () => Promise<any>;
  signOut: () => Promise<void>;
  toggleAdminMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminModeEnabled, setAdminModeEnabled] = useState(() => {
    // localStorage에서 관리자 모드 상태 복원 (SSR 안전)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminModeEnabled');
      return saved === 'true';
    }
    return false;
  });

  // 사용자 프로필 가져오기
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // 세션 변경 감지
  useEffect(() => {
    // 초기 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUserProfile(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 세션 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change event:', event);
      
      // 매직 링크나 OTP 로그인 시도 시 이미 로그인된 사용자가 있는지 확인
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const currentUser = user;
        const newUser = newSession?.user;
        
        // 현재 로그인된 사용자와 새로 로그인하려는 사용자가 다른 경우
        if (currentUser && newUser && currentUser.id !== newUser.id) {
          console.warn('Attempted login as different user while already logged in');
          
          // 새 세션을 거부하고 기존 세션 유지
          await supabase.auth.signOut();
          
          // 사용자에게 경고 메시지 표시
          alert(
            '다른 계정의 로그인 링크입니다.\n' +
            '현재 로그인된 계정을 유지합니다.\n\n' +
            '다른 계정으로 전환하려면 먼저 로그아웃해주세요.'
          );
          
          // 기존 세션 유지 (상태 변경 없음)
          return;
        }
      }
      
      // 정상적인 세션 업데이트
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (newSession?.user) {
        fetchUserProfile(newSession.user.id).then(profile => {
          setUserProfile(profile);
        });
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 구글 로그인
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // 카카오 로그인
  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error('Error signing in with Kakao:', error);
      throw error;
    }
  };

  // 네이버 로그인 (커스텀 OAuth 필요)
  const signInWithNaver = async () => {
    // TODO: 네이버는 Supabase에서 기본 지원하지 않으므로 커스텀 OAuth 구현 필요
    console.warn('Naver login not yet implemented');
    alert('네이버 로그인은 아직 구현되지 않았습니다.');
  };

  // 스티비 구독자 확인
  const checkSubscription = async (email: string): Promise<boolean> => {
    try {
      console.log('Checking subscription for:', email);
      
      const { data, error } = await supabase.functions.invoke('check-stibee-subscriber', {
        body: { email },
      });

      console.log('Edge Function response:', data);

      if (error) {
        console.error('Error checking subscription:', error);
        return false;
      }

      const isSubscriber = data?.isSubscriber === true;
      console.log('Is subscriber:', isSubscriber, 'Status:', data?.status);
      
      return isSubscriber;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  };

  // 비밀번호 로그인 - 구독자만 허용
  const signInWithPassword = async (email: string, password: string) => {
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }

    // 2. 비밀번호 로그인 진행
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing in with password:', error);
      throw error;
    }
  };

  // 비밀번호 재설정 이메일 전송 - 구독자만 허용
  const resetPassword = async (email: string) => {
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }

    // 비밀번호 재설정 이메일 전송
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  // 비밀번호 업데이트 (로그인된 사용자만)
  const updatePassword = async (newPassword: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  // 닉네임 업데이트 (자동으로 "판다" 붙임)
  const updateNickname = async (nickname: string) => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    // 공백만 입력한 경우 체크
    if (nickname.trim() === '') {
      throw new Error('INVALID_NICKNAME_WHITESPACE');
    }

    // 사용자 입력 그대로 + "판다" 붙이기
    // 공백 있으면: "레서 " → "레서 판다"
    // 공백 없으면: "레서" → "레서판다"
    const nicknameWithPanda = nickname + '판다';

    // 관리자 여부 확인
    const isUserAdmin = userProfile?.is_admin ?? false;

    // 금지된 닉네임 목록 체크 (판다 붙인 후 체크, 관리자 제외)
    const forbiddenNicknames = ['판다', '카페인판다', '슬픈 판다', '슬픈판다'];
    
    // hokex 포함 여부 체크 (대소문자 구분 없이)
    const containsHokex = nicknameWithPanda.toLowerCase().includes('hokex') || 
                          nicknameWithPanda.includes('호켁스');
    
    if (!isUserAdmin && (forbiddenNicknames.includes(nicknameWithPanda) || containsHokex)) {
      throw new Error('INVALID_NICKNAME');
    }

    // 중복 체크
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('nickname', nicknameWithPanda)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러 (중복 없음)
      console.error('Error checking nickname:', checkError);
      throw checkError;
    }

    if (existingUser && existingUser.id !== user.id) {
      throw new Error('NICKNAME_TAKEN');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ nickname: nicknameWithPanda })
      .eq('id', user.id);
    
    if (error) {
      console.error('Error updating nickname:', error);
      // 409 Conflict 에러는 UNIQUE constraint 위반 (닉네임 중복)
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        throw new Error('NICKNAME_TAKEN');
      }
      throw error;
    }

    // 로컬 상태 업데이트
    if (userProfile) {
      setUserProfile({ ...userProfile, nickname: nicknameWithPanda });
    }
  };

  // 닉네임 초기화 (null로 설정)
  const resetNickname = async () => {
    if (!user) {
      throw new Error('로그인이 필요합니다');
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ nickname: null })
      .eq('id', user.id);
    
    if (error) {
      console.error('Error resetting nickname:', error);
      throw error;
    }

    // 로컬 상태 업데이트
    if (userProfile) {
      setUserProfile({ ...userProfile, nickname: null });
    }
  };

  // OTP 기능 비활성화됨 - 문서와 Edge Function 코드는 보존
  // const sendOTPCode = async (email: string): Promise<{ expiresIn: number }> => { ... }
  // const verifyOTPCode = async (email: string, code: string): Promise<void> => { ... }

  // Magic Link 로그인 (이메일 전용) - 구독자만 허용
  const signInWithMagicLink = async (email: string) => {
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }

    // 2. Magic Link 전송
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: import.meta.env.VITE_APP_URL || window.location.origin,
      },
    });
    
    if (error) {
      console.error('Error sending magic link:', error);
      throw error;
    }
  };

  // 구독 해지 (계정 삭제 포함)
  const unsubscribe = async () => {
    if (!user?.email) {
      throw new Error('No user email found');
    }

    try {
      const { data, error } = await supabase.functions.invoke('unsubscribe-stibee', {
        body: { email: user.email },
      });

      if (error) {
        console.error('Error unsubscribing:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error('Unsubscribe failed');
      }

      // 자동 로그아웃 (계정이 삭제되었으므로)
      await supabase.auth.signOut();
      
      return data;
    } catch (error) {
      console.error('Error in unsubscribe:', error);
      throw error;
    }
  };

  // 로그아웃
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // 관리자 모드 토글
  const toggleAdminMode = () => {
    setAdminModeEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('adminModeEnabled', String(newValue));
      return newValue;
    });
  };

  // 닉네임이 필요한지 확인 (로그인했지만 닉네임이 없는 경우)
  const needsNickname = !!(user && userProfile && !userProfile.nickname);

  const value = {
    user,
    session,
    userProfile,
    isAdmin: (userProfile?.is_admin ?? false) && adminModeEnabled,
    adminModeEnabled,
    loading,
    needsNickname,
    signInWithGoogle,
    signInWithKakao,
    signInWithNaver,
    signInWithPassword,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    updateNickname,
    resetNickname,
    unsubscribe,
    signOut,
    toggleAdminMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

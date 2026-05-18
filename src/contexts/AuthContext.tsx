import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
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

  // 스티비 구독자 확인 (임시 비활성화)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkSubscription = async (email: string): Promise<boolean> => {
    try {
      console.log('Checking subscription for:', email);
      
      const { data, error } = await supabase.functions.invoke('check-stibee-subscriber', {
        body: { email },
      });

      console.log('Edge Function response:', { data, error });
      console.log('Raw Stibee data:', data?.rawData); // 디버깅용

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
    // 임시: Stibee 체크 비활성화 (API 응답 구조 확인 필요)
    console.warn('⚠️ Stibee subscription check temporarily disabled');
    
    /*
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }
    */

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
    // 임시: Stibee 체크 비활성화 (API 응답 구조 확인 필요)
    console.warn('⚠️ Stibee subscription check temporarily disabled');
    
    /*
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }
    */

    // 비밀번호 재설정 이메일 전송
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  // Magic Link 로그인 (이메일 전용) - 구독자만 허용
  const signInWithMagicLink = async (email: string) => {
    // 임시: Stibee 체크 비활성화 (API 응답 구조 확인 필요)
    console.warn('⚠️ Stibee subscription check temporarily disabled');
    
    /*
    // 1. 먼저 스티비 구독자인지 확인
    const isSubscriber = await checkSubscription(email);
    
    if (!isSubscriber) {
      throw new Error('SUBSCRIBER_ONLY');
    }
    */

    // Magic Link 전송
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    
    if (error) {
      console.error('Error sending magic link:', error);
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

  const value = {
    user,
    session,
    userProfile,
    isAdmin: (userProfile?.is_admin ?? false) && adminModeEnabled,
    adminModeEnabled,
    loading,
    signInWithGoogle,
    signInWithKakao,
    signInWithNaver,
    signInWithPassword,
    signInWithMagicLink,
    resetPassword,
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type Profile = {
  id: string;
  user_type: 'company' | 'affiliate';
  full_name: string;
  email: string;
  avatar_url: string;
  created_at: string;
  is_super_admin?: boolean;
  payment_method?: string | null;
  payment_details?: any;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, userType: 'company' | 'affiliate', companyName?: string, businessCategory?: string, recruiterCode?: string) => Promise<{ error: any; userId?: string; companyId?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setProfile(data);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('Auth state changed:', event, 'session:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: 'company' | 'affiliate',
    companyName?: string,
    businessCategory?: string,
    recruiterCode?: string
  ) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { error: authError };
    }

    let recruitedBy = null;
    if (recruiterCode && recruiterCode.length > 0 && userType === 'affiliate') {
      const { data: recruiterData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'affiliate')
        .ilike('id', `${recruiterCode.toLowerCase()}%`)
        .maybeSingle();

      if (recruiterData) {
        recruitedBy = recruiterData.id;
      }
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      user_type: userType,
      full_name: fullName,
      email: email,
      recruited_by: recruitedBy,
    });

    if (profileError) {
      return { error: profileError };
    }

    let companyId: string | undefined;
    if (userType === 'company' && authData.user) {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          user_id: authData.user.id,
          company_name: companyName || fullName,
          business_category: businessCategory || 'other',
        })
        .select('id')
        .single();

      if (companyData && !companyError) {
        companyId = companyData.id;
      }
    }

    return { error: null, userId: authData.user.id, companyId };
  };

  const signOut = async () => {
    console.log('AuthContext: signOut called');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: signOut error:', error);
        throw error;
      }
      console.log('AuthContext: signOut successful');
      setProfile(null);
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('AuthContext: signOut exception:', error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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

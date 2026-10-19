import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const isPhoneAuthEnabled = import.meta.env.VITE_ENABLE_PHONE_AUTH === 'true';
  const isConfigured = isSupabaseConfigured();

  // Load user profile details from public.profiles
  async function loadProfile(userId, fallbackUser) {
    if (!userId) return;
    
    // Check if we have Supabase connected
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          setProfile(data);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch user profile from DB:', err);
      }
    }

    // Fallback to metadata from OAuth or email
    const meta = fallbackUser?.user_metadata || {};
    let savedLocal = null;
    try {
      savedLocal = JSON.parse(localStorage.getItem('studypilot.profile.v1') || 'null');
    } catch (e) {}

    const fallbackProfile = {
      id: userId,
      display_name: savedLocal?.display_name || meta.full_name || meta.name || fallbackUser?.email?.split('@')[0] || 'Student',
      avatar_url: meta.avatar_url || meta.picture || null,
      timezone: 'Asia/Kolkata',
      course: savedLocal?.course || '',
      academic_year: savedLocal?.academic_year || '',
    };
    setProfile(fallbackProfile);
  }

  useEffect(() => {
    if (!isConfigured || !supabase) {
      // Local fallback initial state
      let savedLocal = null;
      try {
        savedLocal = JSON.parse(localStorage.getItem('studypilot.profile.v1') || 'null');
      } catch (e) {}
      if (savedLocal) {
        setProfile(savedLocal);
      } else {
        setProfile({
          id: 'demo-student',
          display_name: 'Student',
          course: 'Computer Science',
          academic_year: '2nd Year',
          timezone: 'Asia/Kolkata',
        });
      }
      setLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval error:', error);
        setAuthError(error.message);
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user);
      }
      setLoading(false);
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        await loadProfile(currentSession.user.id, currentSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!supabase) {
      throw new Error('Supabase is not configured. Please check your .env settings.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  const signUpWithEmail = async (email, password) => {
    setAuthError(null);
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  const updateProfile = async ({ displayName, course, academicYear, avatarUrl }) => {
    setAuthError(null);
    const trimmedName = String(displayName || '').trim();
    if (!trimmedName) {
      throw new Error('Display name cannot be empty.');
    }

    const payload = {
      display_name: trimmedName,
      course: course ? String(course).trim() : null,
      academic_year: academicYear ? String(academicYear).trim() : null,
      updated_at: new Date().toISOString(),
    };

    if (avatarUrl !== undefined) {
      payload.avatar_url = avatarUrl ? String(avatarUrl).trim() : null;
    }

    if (supabase && user) {
      let { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            ...payload,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        // If course or academic_year column is missing in older DB schema, retry without them
        console.warn('Upsert error on profiles, retrying with core fields:', error.message);
        const fallbackPayload = {
          id: user.id,
          display_name: trimmedName,
          updated_at: payload.updated_at,
        };
        if (payload.avatar_url !== undefined) {
          fallbackPayload.avatar_url = payload.avatar_url;
        }

        const retry = await supabase
          .from('profiles')
          .upsert(fallbackPayload, { onConflict: 'id' })
          .select()
          .single();

        if (retry.error) {
          console.error('Error updating profile in Supabase:', retry.error);
          throw new Error(retry.error.message || 'Failed to update profile.');
        }

        data = {
          ...retry.data,
          course: payload.course,
          academic_year: payload.academic_year,
        };
        error = null;
      }

      setProfile(data);
      try {
        localStorage.setItem('studypilot.profile.v1', JSON.stringify(data));
      } catch (e) {}
      return data;
    } else {
      // Local demo mode fallback
      const updated = {
        ...(profile || {}),
        id: user?.id || 'demo-student',
        ...payload,
      };
      setProfile(updated);
      try {
        localStorage.setItem('studypilot.profile.v1', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    }
  };

  const signInWithOtp = async (phone) => {
    setAuthError(null);
    if (!isPhoneAuthEnabled) {
      throw new Error('Phone authentication is disabled until an SMS provider is configured.');
    }
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const verifyOtp = async (phone, token) => {
    setAuthError(null);
    if (!isPhoneAuthEnabled) {
      throw new Error('Phone authentication is disabled.');
    }
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    setAuthError(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    authError,
    setAuthError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    updateProfile,
    signInWithOtp,
    verifyOtp,
    signOut,
    isPhoneAuthEnabled,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

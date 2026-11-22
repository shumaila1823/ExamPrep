import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/client';
import { ensureProfile, fetchProfile } from '../services/profileService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoadedFor, setProfileLoadedFor] = useState(null);

  // 1. Restore the session and keep it in sync with Supabase Auth.
  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data?.session ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setInitializing(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (active) setSession(newSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  // 2. Load the profile (role, name, country) whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoadedFor(null);
      return undefined;
    }
    let active = true;
    ensureProfile(user)
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setProfileLoadedFor(userId);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const signUp = useCallback(async ({ email, password, fullName, country }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), country: country || null },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw error;
    // When email confirmation is OFF, Supabase returns a session immediately.
    if (data.session) setSession(data.session);
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    setSession(data.session);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    const fresh = await fetchProfile(userId);
    setProfile(fresh);
    return fresh;
  }, [userId]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      initializing,
      profileLoading: Boolean(userId) && profileLoadedFor !== userId,
      isAuthenticated: Boolean(session),
      isAdmin: profile?.role === 'admin',
      displayName: profile?.full_name || user?.user_metadata?.full_name || user?.email || 'Student',
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
      setProfile,
    }),
    [
      session,
      user,
      profile,
      initializing,
      userId,
      profileLoadedFor,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

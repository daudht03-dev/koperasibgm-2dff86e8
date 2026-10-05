import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";
import { lovable } from "@/integrations/lovable";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any; redirected?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Reads the last session saved by the Supabase client, even if unrefreshed (offline fallback). */
const readStoredSession = async (): Promise<Session | null> => {
  try {
    const projectRef = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.match(
      /https:\/\/([^.]+)\.supabase\.co/,
    )?.[1];
    if (!projectRef) return null;
    const raw = await brokeredPreviewStorage().getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.session ?? parsed) as Session | null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserRole = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    const hasAdminRole = !!data && !error;
    setIsAdmin(hasAdminRole);
    return hasAdminRole;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check role after setting user
        if (session?.user) {
          setTimeout(() => checkUserRole(session.user.id), 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Get initial session. getSession() can REJECT when offline (e.g. an expired
    // token needs a network refresh), so fall back to the last stored session
    // and ALWAYS stop loading on every path.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          checkUserRole(session.user.id);
        }

        setLoading(false);
      })
      .catch(async () => {
        const stored = await readStoredSession();
        setSession(stored);
        setUser(stored?.user ?? null);

        if (stored?.user) {
          setTimeout(() => checkUserRole(stored.user.id), 0);
        }

        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Check role immediately after successful login
    if (!error && data.user) {
      await checkUserRole(data.user.id);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if ((result as any).error) return { error: (result as any).error };
      if ((result as any).redirected) return { error: null, redirected: true };

      const { data } = await supabase.auth.getUser();
      if (data.user) await checkUserRole(data.user.id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
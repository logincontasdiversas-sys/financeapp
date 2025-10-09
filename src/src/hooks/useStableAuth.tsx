import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { localStorageService } from "@/services/localStorageService";
import { logger } from "@/utils/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isOffline: boolean;
}

const StableAuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isOffline: false,
});

export const useStableAuth = () => {
  const context = useContext(StableAuthContext);
  if (!context) {
    throw new Error("useStableAuth must be used within a StableAuthProvider");
  }
  return context;
};

const OFFLINE_USER_KEY = 'offline_user_session';

export const StableAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Fallback localStorage para modo offline
  const loadOfflineSession = useCallback(() => {
    try {
      const offlineSession = localStorage.getItem(OFFLINE_USER_KEY);
      if (offlineSession && !navigator.onLine) {
        const parsedSession = JSON.parse(offlineSession);
        logger.info('STABLE_AUTH', 'Loading offline session fallback', { userId: parsedSession.user?.id });
        setUser(parsedSession.user);
        setSession(parsedSession);
        return parsedSession;
      }
    } catch (error) {
      logger.error('STABLE_AUTH', 'Failed to load offline session', { error });
    }
    return null;
  }, []);

  // Salvar sessão para fallback offline
  const saveOfflineSession = useCallback((session: Session | null) => {
    try {
      if (session) {
        localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(session));
        logger.debug('STABLE_AUTH', 'Session saved for offline fallback');
      } else {
        localStorage.removeItem(OFFLINE_USER_KEY);
      }
    } catch (error) {
      logger.error('STABLE_AUTH', 'Failed to save offline session', { error });
    }
  }, []);

  // Detectar mudanças de conexão
  useEffect(() => {
    const handleOnline = () => {
      logger.info('STABLE_AUTH', 'Connection restored - syncing auth state');
      setIsOffline(false);
      // Revalidar sessão quando voltar online
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        saveOfflineSession(session);
      });
    };

    const handleOffline = () => {
      logger.warn('STABLE_AUTH', 'Connection lost - switching to offline mode');
      setIsOffline(true);
      loadOfflineSession();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadOfflineSession, saveOfflineSession]);

  useEffect(() => {
    logger.info('STABLE_AUTH', 'Initializing stable auth system');

    // Tentar carregar sessão offline primeiro se estiver offline
    if (!navigator.onLine) {
      const offlineSession = loadOfflineSession();
      if (offlineSession) {
        setLoading(false);
        return;
      }
    }

    // Set up auth state listener com tratamento de erro
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.info('STABLE_AUTH', 'Auth state changed', { 
          event, 
          email: session?.user?.email,
          isOffline 
        });

        try {
          setSession(session);
          setUser(session?.user ?? null);
          saveOfflineSession(session);
          
          if (event === 'SIGNED_IN' && session?.user) {
            logger.info('STABLE_AUTH', 'User signed in successfully', { 
              userId: session.user.id 
            });
          } else if (event === 'SIGNED_OUT') {
            logger.info('STABLE_AUTH', 'User signed out');
            localStorage.removeItem(OFFLINE_USER_KEY);
          }
        } catch (error) {
          logger.error('STABLE_AUTH', 'Error handling auth state change', { error });
        } finally {
          setLoading(false);
        }
      }
    );

    // Get initial session com retry
    const getInitialSession = async (retries = 3) => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        logger.info('STABLE_AUTH', 'Initial session loaded', { 
          email: session?.user?.email 
        });
        
        setSession(session);
        setUser(session?.user ?? null);
        saveOfflineSession(session);
        setLoading(false);
      } catch (error) {
        logger.error('STABLE_AUTH', 'Failed to get initial session', { 
          error, 
          retries 
        });
        
        if (retries > 0 && navigator.onLine) {
          setTimeout(() => getInitialSession(retries - 1), 2000);
        } else {
          // Tentar fallback offline
          const offlineSession = loadOfflineSession();
          if (!offlineSession) {
            setLoading(false);
          }
        }
      }
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, [loadOfflineSession, saveOfflineSession, isOffline]);

  const signOut = async () => {
    logger.info('STABLE_AUTH', 'Initiating sign out');
    
    try {
      // Limpar dados locais do usuário antes de fazer logout
      if (user) {
        localStorageService.clearUserData(user.id);
        logger.debug('STABLE_AUTH', 'Local user data cleared', { userId: user.id });
      }
      
      localStorage.removeItem(OFFLINE_USER_KEY);
      await supabase.auth.signOut();
      
      logger.info('STABLE_AUTH', 'Sign out completed successfully');
    } catch (error) {
      logger.error('STABLE_AUTH', 'Error during sign out', { error });
      // Mesmo com erro, limpar estado local
      setUser(null);
      setSession(null);
      localStorage.removeItem(OFFLINE_USER_KEY);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isOffline,
  };

  return (
    <StableAuthContext.Provider value={value}>
      {children}
    </StableAuthContext.Provider>
  );
};
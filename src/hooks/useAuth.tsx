import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { localStorageService } from "@/services/localStorageService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminData: any;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  adminData: null,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);

  // Função para verificar admin status (apenas no login)
  const checkAdminStatus = async (userId: string) => {
    try {
      console.log("[AUTH] Verificando status de admin para:", userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, role, is_admin')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error("[AUTH] Erro ao verificar admin:", error);
        console.log("[AUTH] Usuário não encontrado na tabela profiles - acesso negado");
        
        // Se usuário não existe na tabela profiles, fazer logout
        await supabase.auth.signOut();
        
        setIsAdmin(false);
        setAdminData(null);
        return;
      }

      console.log("[AUTH] Dados do perfil:", profile);
      const adminStatus = profile?.is_admin === true || profile?.role === 'admin';
      console.log("[AUTH] É admin:", adminStatus);
      
      setIsAdmin(adminStatus);
      setAdminData(profile);
    } catch (error) {
      console.error("[AUTH] Erro ao verificar admin status:", error);
      setIsAdmin(false);
      setAdminData(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH] Auth state changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Verificar admin status apenas no login
        if (event === 'SIGNED_IN' && session?.user) {
          await checkAdminStatus(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setAdminData(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[AUTH] Initial session:", session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Verificar admin status na sessão inicial
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Limpar dados locais do usuário antes de fazer logout
    if (user) {
      localStorageService.clearUserData(user.id);
    }
    
    // Limpar dados de admin
    setIsAdmin(false);
    setAdminData(null);
    
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    adminData,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
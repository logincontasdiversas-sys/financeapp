import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AUTH_CALLBACK] Processando callback de autenticação...');
        
        // Obter a sessão atual do Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AUTH_CALLBACK] Erro ao obter sessão:', sessionError);
          setError('Erro ao processar autenticação. Tente novamente.');
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[AUTH_CALLBACK] Usuário autenticado:', session.user.email);
          
          // Atualizar estado de autenticação
          await refreshAuth();
          
          // Redirecionar para o dashboard
          navigate('/', { replace: true });
        } else {
          console.log('[AUTH_CALLBACK] Nenhuma sessão encontrada, redirecionando para login...');
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('[AUTH_CALLBACK] Erro inesperado:', err);
        setError('Erro inesperado ao processar autenticação.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, refreshAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Processando autenticação...</h2>
          <p className="text-muted-foreground">Aguarde enquanto confirmamos sua conta.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-destructive mb-4">Erro na Autenticação</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/auth')}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
            >
              Ir para o Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

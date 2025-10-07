import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AUTH_CALLBACK] Processando callback de autenticação...');
        console.log('[AUTH_CALLBACK] URL atual:', window.location.href);
        console.log('[AUTH_CALLBACK] Hash:', window.location.hash);
        console.log('[AUTH_CALLBACK] Search params:', window.location.search);
        
        // Verificar se é redefinição de senha (parâmetro na URL)
        const urlParams = new URLSearchParams(window.location.search);
        const isPasswordReset = urlParams.get('type') === 'recovery' || urlParams.get('type') === 'signup';
        console.log('[AUTH_CALLBACK] É redefinição de senha:', isPasswordReset);
        
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
          console.log('[AUTH_CALLBACK] Email confirmado:', session.user.email_confirmed_at);
          console.log('[AUTH_CALLBACK] Último login:', session.user.last_sign_in_at);
          console.log('[AUTH_CALLBACK] Criado em:', session.user.created_at);
          
          // SEMPRE mostrar formulário de redefinição de senha no callback
          // Isso garante que o usuário defina sua senha após o primeiro acesso
          console.log('[AUTH_CALLBACK] Mostrando formulário de redefinição de senha');
          setIsFirstAccess(true);
          setLoading(false);
          return; // Não redirecionar, mostrar formulário
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setIsUpdatingPassword(true);

    try {
      // Validar senhas
      if (password.length < 6) {
        setPasswordError('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      if (password !== confirmPassword) {
        setPasswordError('As senhas não coincidem');
        return;
      }

      console.log('[AUTH_CALLBACK] Atualizando senha do usuário...');

      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('[AUTH_CALLBACK] Erro ao atualizar senha:', updateError);
        setPasswordError('Erro ao atualizar senha. Tente novamente.');
        return;
      }

      console.log('[AUTH_CALLBACK] Senha atualizada com sucesso!');
      setSuccess(true);
      
      // Atualizar estado de autenticação
      await refreshAuth();
      
      // Aguardar um pouco e redirecionar para dashboard
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('[AUTH_CALLBACK] Erro inesperado ao atualizar senha:', err);
      setPasswordError('Erro inesperado. Tente novamente.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Conta Criada com Sucesso!</CardTitle>
            <CardDescription>
              Sua senha foi definida com sucesso. Você será redirecionado para o dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-destructive">Erro na Autenticação</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Tentar Novamente
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulário de redefinição de senha (apenas para primeiro acesso)
  if (!isFirstAccess) {
    return null; // Não renderizar nada se não for primeiro acesso
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao FinanceApp!</CardTitle>
          <CardDescription>
            Sua conta foi criada com sucesso! Agora defina sua senha para começar a usar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isUpdatingPassword || !password || !confirmPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Atualizando...
                </>
              ) : (
                'Criar Senha e Continuar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

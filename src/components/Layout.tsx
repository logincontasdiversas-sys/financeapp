import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminMenu } from "@/components/AdminMenu";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Link } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading, user } = useAuth();
  const { isIncomplete, missingFields } = useProfileStatus();
  const { toast } = useToast();
  const { supported, permission, subscribe, requestPermission, saveSubscription, subscribing } = usePushNotifications();
  const HAS_VAPID = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // Função para atualizar o nome (chamada externamente)
  const updateDisplayName = (newName: string | null) => {
    setDisplayName(newName);
  };

  // Expor a função globalmente para ser chamada de outras páginas
  useEffect(() => {
    (window as any).updateDisplayName = updateDisplayName;
  }, []);

  // Buscar nome de exibição do usuário
  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user?.id) return;
      
      try {
        console.log('[LAYOUT] Buscando nome de exibição para user:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('[LAYOUT] Erro ao buscar nome de exibição:', error);
          return;
        }
        
        console.log('[LAYOUT] Nome encontrado:', data?.display_name);
        setDisplayName(data?.display_name || null);
      } catch (error) {
        console.error('[LAYOUT] Erro ao buscar nome de exibição:', error);
      }
    };

    fetchDisplayName();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logout realizado com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-gradient-card backdrop-blur-sm flex items-center justify-between px-4 sm:px-6">
            {/* Botão do menu lateral - apenas em desktop */}
            <div className="hidden sm:flex items-center">
              <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-primary" />
            </div>
            
            {/* Ícone de perfil no lugar do menu lateral - apenas em mobile */}
            <div className="flex sm:hidden items-center">
              <Link 
                to="/perfil" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors relative"
              >
                <User className="h-5 w-5" />
                {isIncomplete && (
                  <div className="-ml-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {missingFields.length}
                  </div>
                )}
              </Link>
            </div>
            
            {/* Logo e marca centralizados */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FinanceApp
              </h1>
            </div>
            
            {/* Informações do usuário apenas em desktop/notebook */}
            <div className="hidden lg:flex items-center gap-3">
              <SyncStatus />
              <AdminMenu />
              {supported && HAS_VAPID && permission !== "granted" && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={subscribing}
                  onClick={async () => {
                    const perm = await requestPermission();
                    if (perm !== "granted") {
                      toast({ title: "Permissão negada", description: "Ative as notificações nas configurações do navegador.", variant: "destructive" });
                      return;
                    }
                    try {
                      const sub = await subscribe();
                      if (user?.id) await saveSubscription(user.id);
                      if (sub) toast({ title: "Notificações ativadas!" });
                    } catch (e: any) {
                      toast({ title: "Erro ao ativar push", description: e.message, variant: "destructive" });
                    }
                  }}
                >
                  Ativar Push
                </Button>
              )}
              <Link 
                to="/perfil" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors relative"
              >
                <User className="h-4 w-4" />
                <span>{displayName ? `Seja Bem Vindo ${displayName}` : "Meu Perfil"}</span>
                {isIncomplete && (
                  <div className="-ml-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {missingFields.length}
                  </div>
                )}
              </Link>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 px-0 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-4 sm:p-6 bg-gradient-to-br from-background to-muted/20">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
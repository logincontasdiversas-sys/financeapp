import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { loading, user } = useAuth();
  const { toast } = useToast();
  const { supported, permission, subscribe, requestPermission, saveSubscription, subscribing } = usePushNotifications();
  const HAS_VAPID = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);

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
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-gradient-card backdrop-blur-sm flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-primary" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  FinanceApp
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <SyncStatus />
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
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
          
          <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/20">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
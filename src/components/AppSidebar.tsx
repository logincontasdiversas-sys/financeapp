import React from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  CreditCard, 
  FolderOpen,
  Target,
  CreditCard as Debt,
  List,
  ClipboardCheck,
  Settings,
  User,
  LogOut,
  Bell
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncStatus } from "@/components/SyncStatus";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const SHOW_PRD = import.meta.env.DEV || import.meta.env.VITE_SHOW_PRD === "true";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Receitas", url: "/receitas", icon: TrendingUp },
  { title: "Despesas", url: "/despesas", icon: TrendingDown },
  { title: "Movimentações", url: "/movimentacoes", icon: List },
  { title: "Bancos", url: "/bancos", icon: Building2 },
  { title: "Cartões", url: "/cartoes", icon: CreditCard },
  { title: "Categorias", url: "/categorias", icon: FolderOpen },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Dívidas", url: "/dividas", icon: Debt },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  ...(SHOW_PRD ? [{ title: "PRD", url: "/prd", icon: ClipboardCheck }] : []),
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useAuth();
  const { toast } = useToast();
  const { supported, permission, subscribe, requestPermission, saveSubscription, subscribing } = usePushNotifications();
  const HAS_VAPID = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY);
  
  const isCollapsed = state === "collapsed";

  // Fechar sidebar automaticamente quando a rota muda (apenas no mobile)
  React.useEffect(() => {
    setOpenMobile(false);
  }, [currentPath, setOpenMobile]);

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

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-semibold px-3 py-2">
            {!isCollapsed && "Menu Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={({ isActive: linkIsActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          linkIsActive || isActive(item.url)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Seção do Usuário - apenas em mobile/tablet */}
        <SidebarGroup className="mt-auto lg:hidden">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Informações do usuário */}
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground">
                  <User className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                    </div>
                  )}
                </div>
              </SidebarMenuItem>

              {/* Status de sincronização */}
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-3 py-2">
                  <SyncStatus />
                  {!isCollapsed && <span className="text-sm text-sidebar-foreground">Sincronização</span>}
                </div>
              </SidebarMenuItem>

              {/* Notificações Push */}
              {supported && HAS_VAPID && permission !== "granted" && (
                <SidebarMenuItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={subscribing}
                    className="w-full justify-start gap-3 px-3 py-2 h-auto"
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
                    <Bell className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm">Ativar Push</span>}
                  </Button>
                </SidebarMenuItem>
              )}

              {/* Toggle do tema */}
              <SidebarMenuItem>
                <div className="flex items-center gap-3 px-3 py-2">
                  <ThemeToggle />
                  {!isCollapsed && <span className="text-sm text-sidebar-foreground">Tema</span>}
                </div>
              </SidebarMenuItem>

              {/* Logout */}
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 px-3 py-2 h-auto text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">Sair</span>}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
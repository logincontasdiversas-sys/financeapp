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
  Settings
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";

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
      </SidebarContent>
    </Sidebar>
  );
}
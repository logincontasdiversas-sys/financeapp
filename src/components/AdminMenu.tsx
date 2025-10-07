import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from './ui/dropdown-menu';
import { 
  Settings, 
  Shield, 
  Phone, 
  Users, 
  Database,
  ChevronDown
} from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';

export function AdminMenu() {
  const { isAdmin, loading } = useAdminAuth();
  const location = useLocation();

  // Debug: Log do status do admin
  console.log('[ADMIN_MENU] Status:', { isAdmin, loading });

  // Se ainda carregando, mostrar indicador
  if (loading) {
    console.log('[ADMIN_MENU] Ainda carregando...');
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        Verificando permissões...
      </div>
    );
  }

  // Se não é admin, não mostrar menu
  if (!isAdmin) {
    console.log('[ADMIN_MENU] Usuário não é admin - menu não exibido');
    return null;
  }

  console.log('[ADMIN_MENU] Usuário é admin - exibindo menu');

  const adminMenuItems = [
    {
      title: 'Usuários WhatsApp',
      href: '/admin/whatsapp',
      icon: Phone,
      description: 'Gerenciar usuários do bot WhatsApp'
    },
    {
      title: 'Gerenciar Usuários',
      href: '/admin/users-management',
      icon: Users,
      description: 'Cadastrar e gerenciar usuários do sistema'
    },
    {
      title: 'Gerenciar Admins',
      href: '/admin/users',
      icon: Shield,
      description: 'Controle de permissões administrativas'
    },
    {
      title: 'Correções',
      href: '/admin/correction',
      icon: Database,
      description: 'Ferramentas de correção de dados'
    }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administração
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Painel Administrativo</p>
          <p className="text-xs text-muted-foreground">
            Acesso restrito a administradores
          </p>
        </div>
        <DropdownMenuSeparator />
        
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link 
                to={item.href}
                className={`flex items-center gap-3 p-3 ${
                  isActive(item.href) ? 'bg-accent' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    {isActive(item.href) && (
                      <Badge variant="secondary" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-xs text-muted-foreground">
            🔒 Acesso restrito a administradores
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

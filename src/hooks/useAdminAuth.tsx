import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';

export function useAdminAuth() {
  const { user, isAdmin, adminData, loading } = useAuth();
  const [adminLoading, setAdminLoading] = useState(true);

  // Usar dados já verificados no useAuth (sem consultas extras)
  const adminUser = adminData;

  // Sincronizar loading state
  useEffect(() => {
    if (!loading) {
      // Pequeno delay para garantir que os dados foram carregados
      const timer = setTimeout(() => {
        setAdminLoading(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isAdmin, adminData]);

  const hasPermission = (permission: string) => {
    if (!isAdmin) return false;
    
    // Lista de permissões específicas para admin
    const adminPermissions = [
      'whatsapp_users.view',
      'whatsapp_users.create',
      'whatsapp_users.update',
      'whatsapp_users.delete',
      'admin.dashboard',
      'admin.settings'
    ];

    return adminPermissions.includes(permission);
  };

  return {
    adminUser,
    isAdmin,
    loading: adminLoading,
    hasPermission
  };
}

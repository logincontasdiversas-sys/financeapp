import { useAuth } from './useAuth';

export function useAdminAuth() {
  const { user, isAdmin, adminData, loading } = useAuth();

  // Usar dados já verificados no useAuth (sem consultas extras)
  const adminUser = adminData;

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
    loading,
    hasPermission
  };
}

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  permission?: string;
  fallbackPath?: string;
}

export function AdminRoute({ 
  children, 
  permission, 
  fallbackPath = "/" 
}: AdminRouteProps) {
  const { isAdmin, loading, hasPermission } = useAdminAuth();

  // Mostrar loading enquanto verifica permissões
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Verificando permissões...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não é admin, redirecionar
  if (!isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Se tem permissão específica, verificar
  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você não tem permissão para acessar esta área.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se passou em todas as verificações, mostrar conteúdo
  return <>{children}</>;
}

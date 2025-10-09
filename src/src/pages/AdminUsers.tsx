import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../components/ui/dialog';
import { 
  Loader2, 
  Search, 
  User, 
  Shield, 
  Calendar,
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Users,
  Crown
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface User {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_admin: boolean;
  role: string;
  whatsapp_active: boolean;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);
  const { toast } = useToast();

  // Carregar dados
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar usuários da tabela profiles
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          display_name, 
          email,
          phone_number,
          is_admin, 
          role,
          whatsapp_active,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_admin: !currentStatus,
          role: !currentStatus ? 'admin' : 'user'
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Atualizar estado local
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { 
              ...user, 
              is_admin: !currentStatus,
              role: !currentStatus ? 'admin' : 'user'
            }
          : user
      ));

      toast({
        title: "Sucesso",
        description: `Usuário ${!currentStatus ? 'promovido a admin' : 'removido de admin'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar permissões do usuário",
        variant: "destructive"
      });
    }
  };

  const promoteUserByEmail = async () => {
    if (!newAdminEmail.trim()) {
      toast({
        title: "Erro",
        description: "Digite um email válido",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsPromoting(true);

      // Buscar usuário por email
      const { data: userData, error: findError } = await supabase
        .from('users')
        .select('id, email, is_admin, role')
        .eq('email', newAdminEmail.trim())
        .single();

      if (findError || !userData) {
        throw new Error('Usuário não encontrado');
      }

      // Promover a admin
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          is_admin: true,
          role: 'admin'
        })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `Usuário ${newAdminEmail} promovido a administrador`
      });
      
      // Recarregar dados
      await loadUsers();
      
      // Limpar formulário e fechar dialog
      setNewAdminEmail('');
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao promover usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao promover usuário",
        variant: "destructive"
      });
    } finally {
      setIsPromoting(false);
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number?.includes(searchTerm)
  );

  const adminUsers = users.filter(user => user.is_admin).length;
  const totalUsers = users.length;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6" />
            Gerenciar Administradores
          </h1>
          <p className="text-muted-foreground">
            Controle de permissões e acesso administrativo
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Promover a Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promover Usuário a Administrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email do Usuário</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={promoteUserByEmail} 
                disabled={isPromoting}
                className="w-full"
              >
                {isPromoting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Promover a Admin'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Total de Usuários</span>
            </div>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Administradores</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{adminUsers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Usuários Comuns</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalUsers - adminUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.auth_users?.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_admin}
                          onCheckedChange={() => toggleAdminStatus(user.user_id, user.is_admin)}
                        />
                        <Badge variant={user.is_admin ? "default" : "secondary"}>
                          {user.is_admin ? 'Admin' : 'Usuário'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge variant="destructive" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          Usuário
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Aviso sobre o sistema */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Apenas administradores podem acessar o painel de administração. 
          Use com cuidado ao promover usuários a administradores.
        </AlertDescription>
      </Alert>
    </div>
  );
}

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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { 
  Loader2, 
  Plus, 
  Search, 
  Phone, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Users
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '../hooks/use-toast';

interface WhatsAppUser {
  id: string;
  phone_number: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
  tenant_name?: string;
}

interface Tenant {
  id: string;
  name: string;
}

export default function AdminWhatsApp() {
  const [users, setUsers] = useState<WhatsAppUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    phone_number: '',
    tenant_id: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar usuários WhatsApp
      const { data: usersData, error: usersError } = await supabase
        .from('whatsapp_users')
        .select(`
          id,
          phone_number,
          tenant_id,
          is_active,
          created_at,
          last_activity,
          tenants!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Carregar tenants para o formulário
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name');

      if (tenantsError) throw tenantsError;

      setUsers(usersData || []);
      setTenants(tenantsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos usuários WhatsApp",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('whatsapp_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      // Atualizar estado local
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ));

      toast({
        title: "Sucesso",
        description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário",
        variant: "destructive"
      });
    }
  };

  const addNewUser = async () => {
    if (!newUser.phone_number || !newUser.tenant_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAdding(true);

      // Usar função do Supabase para registrar
      const { data, error } = await supabase
        .rpc('register_whatsapp_user', {
          p_tenant_id: newUser.tenant_id,
          p_phone_number: newUser.phone_number
        });

      if (error) throw error;

      const result = data[0];
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Usuário WhatsApp adicionado com sucesso"
        });
        
        // Recarregar dados
        await loadData();
        
        // Limpar formulário e fechar dialog
        setNewUser({ phone_number: '', tenant_id: '' });
        setIsDialogOpen(false);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Erro ao adicionar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar usuário WhatsApp",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      // Atualizar estado local
      setUsers(prev => prev.filter(user => user.id !== userId));

      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário",
        variant: "destructive"
      });
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => 
    user.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tenants?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = users.filter(user => user.is_active).length;
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
            <Phone className="h-6 w-6" />
            Usuários WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários autorizados a usar o bot WhatsApp
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Usuário WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="(XX) 99999-9999"
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone_number: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="tenant">Usuário do Sistema</Label>
                <Select 
                  value={newUser.tenant_id} 
                  onValueChange={(value) => setNewUser(prev => ({ ...prev, tenant_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={addNewUser} 
                disabled={isAdding}
                className="w-full"
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Adicionar'
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
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Usuários Ativos</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Usuários Inativos</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{totalUsers - activeUsers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Buscar por número ou usuário..."
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
          <CardTitle>Lista de Usuários WhatsApp</CardTitle>
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
                  <TableHead>Número WhatsApp</TableHead>
                  <TableHead>Usuário do Sistema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {user.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.tenants?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                        />
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {user.last_activity 
                          ? new Date(user.last_activity).toLocaleDateString('pt-BR')
                          : 'Nunca'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeUser(user.id)}
                      >
                        Remover
                      </Button>
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
          <strong>Importante:</strong> Apenas usuários com status "Ativo" podem usar o bot WhatsApp. 
          O administrador deve ativar manualmente cada usuário após verificar a autenticidade do número.
        </AlertDescription>
      </Alert>
    </div>
  );
}

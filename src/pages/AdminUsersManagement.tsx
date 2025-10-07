import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Bot,
  Smartphone
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';

interface UserProfile {
  user_id: string;
  email: string;
  display_name: string;
  phone_number: string | null;
  whatsapp_active: boolean;
  is_admin: boolean;
  access_type: 'app_only' | 'app_plus_bot';
  role: string;
  created_at: string;
  whatsapp_last_activity: string | null;
}

interface NewUser {
  email: string;
  display_name: string;
  phone_number: string;
  is_admin: boolean;
  whatsapp_active: boolean;
  access_type: 'app_only' | 'app_plus_bot';
}

export default function AdminUsersManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'app_only' | 'app_plus_bot'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    display_name: '',
    phone_number: '',
    is_admin: false,
    whatsapp_active: false,
    access_type: 'app_only'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('[ADMIN_USERS] Carregando usuários...', forceRefresh ? '(FORÇANDO ATUALIZAÇÃO)' : '');
      console.log('[ADMIN_USERS] Usuário atual:', user?.id);
      
      // Verificar se o usuário atual é admin
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('user_id', user?.id)
        .single();
        
      console.log('[ADMIN_USERS] Dados do usuário atual:', currentUser);
      
      if (userError) {
        console.error('[ADMIN_USERS] Erro ao verificar usuário:', userError);
      }
      
      // Usar consulta direta com RLS (mais simples e confiável)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) {
        console.error('[ADMIN_USERS] Erro na consulta:', error);
        throw error;
      }

      console.log('[ADMIN_USERS] ===== RESULTADO DA CONSULTA =====');
      console.log('[ADMIN_USERS] Dados recebidos:', data);
      console.log('[ADMIN_USERS] Tipo dos dados:', typeof data);
      console.log('[ADMIN_USERS] É array?', Array.isArray(data));
      console.log('[ADMIN_USERS] Número de registros:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('[ADMIN_USERS] ✅ DADOS ENCONTRADOS!');
        console.log('[ADMIN_USERS] Primeiro registro:', data[0]);
        console.log('[ADMIN_USERS] Colunas disponíveis:', Object.keys(data[0]));
        console.log('[ADMIN_USERS] Todos os user_ids:', data.map(u => u.user_id));
        console.log('[ADMIN_USERS] Todos os emails:', data.map(u => u.email));
        console.log('[ADMIN_USERS] Todos os display_names:', data.map(u => u.display_name));
      } else {
        console.log('[ADMIN_USERS] ❌ NENHUM DADO RETORNADO DA CONSULTA');
        console.log('[ADMIN_USERS] Data é null?', data === null);
        console.log('[ADMIN_USERS] Data é undefined?', data === undefined);
        console.log('[ADMIN_USERS] Data é array vazio?', Array.isArray(data) && data.length === 0);
      }
      
      // Mapear os dados com fallbacks seguros para todas as propriedades
      const usersWithFallbacks = (data || []).map(user => {
        console.log('[ADMIN_USERS] Processando usuário:', user);
        
        return {
          user_id: user.user_id || '',
          email: user.email || '',
          display_name: user.display_name || 'Sem nome',
          phone_number: user.phone_number || null,
          whatsapp_active: user.whatsapp_active || false,
          is_admin: user.is_admin || false,
          role: user.role || 'user',
          access_type: 'app_only', // Padrão seguro
          whatsapp_last_activity: null,
          created_at: new Date().toISOString() // Fallback para data atual
        };
      });

      setUsers(usersWithFallbacks);
      console.log('[ADMIN_USERS] Usuários processados:', usersWithFallbacks);
    } catch (error: any) {
      console.error('[ADMIN_USERS] Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar lista de usuários: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setCreatingUser(true);

      // Validar campos obrigatórios
      if (!newUser.email.trim() || !newUser.display_name.trim()) {
        toast({
          title: "Erro",
          description: "Email e nome são obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        toast({
          title: "Erro",
          description: "Email inválido",
          variant: "destructive"
        });
        return;
      }

      // Validar número WhatsApp se necessário
      if (newUser.access_type === 'app_plus_bot' && !newUser.phone_number.trim()) {
        toast({
          title: "Erro",
          description: "WhatsApp é obrigatório para App + FinanceBot",
          variant: "destructive"
        });
        return;
      }

      if (newUser.phone_number && !newUser.phone_number.match(/^(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/)) {
        toast({
          title: "Erro",
          description: "Número de WhatsApp inválido",
          variant: "destructive"
        });
        return;
      }

      // 1. Verificar se usuário já existe
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', newUser.email)
        .single();

      if (existingUser) {
        throw new Error('Usuário com este email já existe no sistema');
      }

      // 2. Usar Admin API com Service Role Key
      const supabaseAdmin = createClient(
        'https://cibtvihaydjlsjjfytkt.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnR2aWhheWRqbHNqamZ5dGt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczNTEwNCwiZXhwIjoyMDcyMzExMTA0fQ.UiwMCoRPBNNsmswk0PZY7BsYyK4hu2bgktnFsL0WlYY',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Criar usuário via admin API (sem confirmação automática para permitir email)
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        email_confirm: false, // Não confirma automaticamente para permitir envio de email
        user_metadata: { 
          display_name: newUser.display_name, 
          phone: newUser.phone_number, 
          is_admin: newUser.is_admin, 
          access_type: newUser.access_type 
        },
      });

      if (createError) {
        console.error('[ADMIN_USERS] Admin create error:', createError);
        throw new Error(`Erro no admin create: ${createError.message}`);
      }

      const userId = newUserData.user.id;
      console.log('[ADMIN_USERS] User criado:', userId);

      // UPSERT em profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userId,
          email: newUser.email,
          display_name: newUser.display_name,
          phone_number: newUser.phone_number,
          is_admin: newUser.is_admin,
          access_type: newUser.access_type,
          whatsapp_active: false,
          role: newUser.is_admin ? 'admin' : 'user',
          onboarding_done: false,
        });

      if (profileError) {
        console.error('[ADMIN_USERS] Profile upsert error:', profileError);
        // Rollback: Deleta do auth
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Erro no profile: ${profileError.message}`);
      }

      console.log('[ADMIN_USERS] Profile criado com sucesso');

      // Enviar email de confirmação AUTOMATICAMENTE via Supabase Admin API
      try {
        console.log('[ADMIN_USERS] 📧 Enviando email de confirmação automaticamente...');
        console.log('[ADMIN_USERS] Email:', newUser.email);
        console.log('[ADMIN_USERS] Redirect URL:', window.location.origin + '/auth/callback');
        
        // Usar generateLink com type 'invite' para enviar email automaticamente
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: newUser.email,
          options: {
            emailRedirectTo: window.location.origin + '/auth/callback'
          }
        });

        if (inviteError) {
          console.error('[ADMIN_USERS] Erro ao gerar link de convite:', inviteError);
          throw new Error(`Erro ao enviar email: ${inviteError.message}`);
        } else {
          console.log('[ADMIN_USERS] ✅ Email de convite enviado automaticamente:', inviteData);
        }
      } catch (emailError) {
        console.error('[ADMIN_USERS] Erro crítico no envio de email:', emailError);
        throw new Error(`Erro ao enviar email: ${emailError.message}`);
      }

      console.log('[ADMIN_USERS] Sucesso completo:', userId);

      toast({
        title: "✅ Usuário criado com sucesso!",
        description: `Usuário ${newUser.display_name} foi criado e o email de convite foi enviado automaticamente para ${newUser.email}.`
      });

      // Limpar formulário e recarregar lista
      setNewUser({
        email: '',
        display_name: '',
        phone_number: '',
        is_admin: false,
        whatsapp_active: false,
        access_type: 'app_only'
      });
      setShowCreateForm(false);
      await loadUsers(true);

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUpdateUserAccess = async (userId: string, accessType: 'app_only' | 'app_plus_bot') => {
    try {
      // Usar função RPC para atualização com sincronização
      const { data, error } = await supabase.rpc('update_user_sync', {
        target_user_id: userId,
        user_email: '', // Não alterar email
        user_display_name: '', // Não alterar nome
        user_phone_number: '', // Não alterar telefone
        user_is_admin: null, // Não alterar admin
        user_access_type: accessType
      });

      if (error) {
        console.error('[ADMIN_USERS] Erro na atualização via RPC:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[ADMIN_USERS] Atualização falhou:', data);
        throw new Error(data?.message || 'Erro ao atualizar usuário');
      }

      toast({
        title: "Acesso atualizado!",
        description: `Tipo de acesso alterado para ${accessType === 'app_only' ? 'Apenas App' : 'App + FinanceBot'} em ambas as tabelas.`
      });

      await loadUsers(true);
    } catch (error: any) {
      console.error('Erro ao atualizar acesso:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar tipo de acesso: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleToggleWhatsApp = async (userId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ whatsapp_active: active })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "WhatsApp atualizado!",
        description: `WhatsApp ${active ? 'ativado' : 'desativado'} com sucesso.`
      });

      await loadUsers(true);
    } catch (error: any) {
      console.error('Erro ao atualizar WhatsApp:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar WhatsApp",
        variant: "destructive"
      });
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_admin: isAdmin,
          role: isAdmin ? 'admin' : 'user'
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Permissões atualizadas!",
        description: `Usuário ${isAdmin ? 'promovido a' : 'removido de'} administrador.`
      });

      await loadUsers(true);
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissões",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja remover o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      console.log('[ADMIN_USERS] Iniciando exclusão do usuário:', userId, userName);
      
      // Verificar se o usuário atual é admin
      const { data: currentUser, error: userError } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('user_id', user?.id)
        .single();

      if (userError) {
        console.error('[ADMIN_USERS] Erro ao verificar usuário:', userError);
        throw new Error('Erro ao verificar permissões');
      }

      if (!currentUser?.is_admin) {
        console.error('[ADMIN_USERS] Usuário não é admin:', currentUser);
        throw new Error('Apenas administradores podem excluir usuários');
      }

      console.log('[ADMIN_USERS] Usuário confirmado como admin, prosseguindo com exclusão...');
      
      // Usar função RPC para exclusão com sincronização
      const { data, error } = await supabase.rpc('delete_user_sync', {
        target_user_id: userId
      });

      console.log('[ADMIN_USERS] Resultado da exclusão via RPC:', { data, error });

      if (error) {
        console.error('[ADMIN_USERS] Erro na exclusão via RPC:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[ADMIN_USERS] Exclusão falhou:', data);
        throw new Error(data?.message || 'Erro ao excluir usuário');
      }

      console.log('[ADMIN_USERS] Usuário excluído via RPC:', data);

      console.log('[ADMIN_USERS] Usuário excluído com sucesso, atualizando lista...');

      toast({
        title: "Usuário removido!",
        description: `Usuário "${userName}" foi removido com sucesso.`
      });

      // Forçar atualização da lista
      await loadUsers(true);
      
      console.log('[ADMIN_USERS] Lista atualizada após exclusão');
    } catch (error: any) {
      console.error('Erro ao remover usuário:', error);
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determinar tipo baseado no WhatsApp ativo
    const userType = (user.whatsapp_active && user.phone_number) ? 'app_plus_bot' : 'app_only';
    const matchesFilter = filterType === 'all' || userType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getAccessTypeLabel = (user: UserProfile) => {
    // Determinar tipo baseado no WhatsApp ativo
    if (user.whatsapp_active && user.phone_number) {
      return { label: 'App + Bot', icon: Bot, color: 'bg-green-100 text-green-800' };
    } else {
      return { label: 'Apenas App', icon: Smartphone, color: 'bg-blue-100 text-blue-800' };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Apenas App</span>
            </div>
            <p className="text-2xl font-bold">{users.filter(u => !u.whatsapp_active || !u.phone_number).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">App + Bot</span>
            </div>
            <p className="text-2xl font-bold">{users.filter(u => u.whatsapp_active && u.phone_number).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Admins</span>
            </div>
            <p className="text-2xl font-bold">{users.filter(u => u.is_admin).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter">Filtrar por tipo</Label>
              <select
                id="filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="app_only">Apenas App</option>
                <option value="app_plus_bot">App + Bot</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Criação */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Cadastrar Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_user_email">Email *</Label>
                <Input
                  id="new_user_email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new_user_name">Nome de Exibição *</Label>
                <Input
                  id="new_user_name"
                  placeholder="Nome do usuário"
                  value={newUser.display_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, display_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Tipo de Acesso */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tipo de Acesso</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    newUser.access_type === 'app_only' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                  onClick={() => setNewUser(prev => ({ ...prev, access_type: 'app_only' }))}
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      name="access_type" 
                      value="app_only"
                      checked={newUser.access_type === 'app_only'}
                      onChange={() => setNewUser(prev => ({ ...prev, access_type: 'app_only' }))}
                      className="w-4 h-4"
                    />
                    <div>
                      <h4 className="font-medium">Apenas App</h4>
                      <p className="text-sm text-muted-foreground">Acesso ao FinanceApp</p>
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    newUser.access_type === 'app_plus_bot' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground'
                  }`}
                  onClick={() => setNewUser(prev => ({ ...prev, access_type: 'app_plus_bot' }))}
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      name="access_type" 
                      value="app_plus_bot"
                      checked={newUser.access_type === 'app_plus_bot'}
                      onChange={() => setNewUser(prev => ({ ...prev, access_type: 'app_plus_bot' }))}
                      className="w-4 h-4"
                    />
                    <div>
                      <h4 className="font-medium">App + FinanceBot</h4>
                      <p className="text-sm text-muted-foreground">App + Automação WhatsApp</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_user_phone">WhatsApp {newUser.access_type === 'app_plus_bot' && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="new_user_phone"
                  placeholder="(XX) 99999-9999"
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="font-mono"
                  disabled={newUser.access_type === 'app_only'}
                />
                {newUser.access_type === 'app_only' && (
                  <p className="text-sm text-muted-foreground mt-1">WhatsApp não disponível para "Apenas App"</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="new_user_admin" 
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser(prev => ({ ...prev, is_admin: e.target.checked }))}
                    className="rounded" 
                  />
                  <Label htmlFor="new_user_admin">Tornar Administrador</Label>
                </div>
                {newUser.access_type === 'app_plus_bot' && (
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="new_user_whatsapp" 
                      checked={newUser.whatsapp_active}
                      onChange={(e) => setNewUser(prev => ({ ...prev, whatsapp_active: e.target.checked }))}
                      className="rounded" 
                    />
                    <Label htmlFor="new_user_whatsapp">Ativar WhatsApp</Label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creatingUser}>
                {creatingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Usuário
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const accessInfo = getAccessTypeLabel(user);
              const AccessIcon = accessInfo.icon;
              
              return (
                <div key={user.user_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{user.display_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={accessInfo.color}>
                        <AccessIcon className="h-3 w-3 mr-1" />
                        {accessInfo.label}
                      </Badge>
                      {user.is_admin && (
                        <Badge variant="secondary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* WhatsApp */}
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {user.phone_number || 'Não informado'}
                      </span>
                      {user.whatsapp_active && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>

                    {/* Tipo de Acesso */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Tipo:</span>
                      <select
                        value={(user.whatsapp_active && user.phone_number) ? 'app_plus_bot' : 'app_only'}
                        onChange={(e) => handleUpdateUserAccess(user.user_id, e.target.value as any)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="app_only">Apenas App</option>
                        <option value="app_plus_bot">App + Bot</option>
                      </select>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center space-x-2">
                      {(user.whatsapp_active && user.phone_number) && (
                        <Button
                          size="sm"
                          variant={user.whatsapp_active ? "destructive" : "default"}
                          onClick={() => handleToggleWhatsApp(user.user_id, !user.whatsapp_active)}
                        >
                          {user.whatsapp_active ? 'Desativar' : 'Ativar'} WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={user.is_admin ? "destructive" : "default"}
                        onClick={() => handleToggleAdmin(user.user_id, !user.is_admin)}
                      >
                        {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.user_id, user.display_name || user.email)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  User, 
  Phone, 
  Mail, 
  Shield, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Save,
  Loader2,
  Key,
  UserCircle
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { useProfileStatus } from '../hooks/useProfileStatus';
import { useToast } from '../hooks/use-toast';

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  whatsapp_active: boolean;
  is_admin: boolean;
  role: string;
}

export default function Perfil() {
  const { user } = useAuth();
  const { refresh: refreshProfileStatus } = useProfileStatus();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    phone_number: '',
    whatsapp_active: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activeTab, setActiveTab] = useState('personal');
  const [isFirstPasswordChange, setIsFirstPasswordChange] = useState(false);


  // Verificar se o perfil está incompleto
  const isProfileIncomplete = !profile?.display_name || !profile?.phone_number;

  // Verificar se é o primeiro acesso (senha padrão)
  const checkFirstPasswordChange = async () => {
    if (!user) return;
    
    try {
      // Tentar fazer login com a senha padrão para verificar se ainda é a senha original
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: 'temp123456'
      });
      
      // Se conseguir fazer login com a senha padrão, é o primeiro acesso
      setIsFirstPasswordChange(!error);
    } catch {
      // Se der erro, significa que a senha já foi alterada
      setIsFirstPasswordChange(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
      checkFirstPasswordChange();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          email,
          phone_number,
          whatsapp_active,
          is_admin,
          role
        `)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(profileData);
      setFormData({
        display_name: profileData.display_name || '',
        phone_number: profileData.phone_number || '',
        whatsapp_active: profileData.whatsapp_active || false
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Se estiver na aba de senha, processar mudança de senha
      if (activeTab === 'password') {
        // Validar campos de senha
        if (!isFirstPasswordChange && !passwordData.currentPassword) {
          toast({
            title: "Erro",
            description: "Senha atual é obrigatória",
            variant: "destructive"
          });
          return;
        }

        if (!passwordData.newPassword || !passwordData.confirmPassword) {
          toast({
            title: "Erro",
            description: "Nova senha e confirmação são obrigatórias",
            variant: "destructive"
          });
          return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não coincidem",
            variant: "destructive"
          });
          return;
        }

        if (passwordData.newPassword.length < 6) {
          toast({
            title: "Erro",
            description: "A nova senha deve ter pelo menos 6 caracteres",
            variant: "destructive"
          });
          return;
        }

        // Atualizar senha via Supabase Auth
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (error) throw error;

        toast({
          title: "Senha alterada!",
          description: "Sua senha foi alterada com sucesso."
        });

        // Limpar formulário
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        return;
      }

      // Se estiver na aba de informações pessoais, processar dados do perfil
      // Validar campos obrigatórios
      if (!formData.display_name.trim()) {
        toast({
          title: "Erro",
          description: "Nome de exibição é obrigatório",
          variant: "destructive"
        });
        return;
      }

      if (!formData.phone_number.trim()) {
        toast({
          title: "Erro",
          description: "Número do WhatsApp é obrigatório",
          variant: "destructive"
        });
        return;
      }

      // Validar número WhatsApp (formatos brasileiros flexíveis)
      if (formData.phone_number) {
        const phoneRegex = /^(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/;
        if (!formData.phone_number.match(phoneRegex)) {
          toast({
            title: "Erro",
            description: "Número de WhatsApp inválido. Use o formato: (XX) 99999-9999 ou XX 99999-9999",
            variant: "destructive"
          });
          return;
        }
      }

      // Verificar se houve alterações
      const hasChanges = 
        formData.display_name !== (profile?.display_name || '') ||
        formData.phone_number !== (profile?.phone_number || '') ||
        formData.whatsapp_active !== (profile?.whatsapp_active || false);

      if (!hasChanges) {
        toast({
          title: "Nenhuma alteração",
          description: "Nenhuma alteração foi feita para salvar",
          variant: "default"
        });
        return;
      }

      // Atualizar perfil
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name || null,
          phone_number: formData.phone_number || null,
          whatsapp_active: formData.whatsapp_active
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Atualizar o nome no header
      if ((window as any).updateDisplayName) {
        (window as any).updateDisplayName(formData.display_name || null);
      }

      // Verificar se o perfil foi completado
      const wasIncomplete = isProfileIncomplete;
      const isNowComplete = formData.display_name.trim() && formData.phone_number.trim();

      if (wasIncomplete && isNowComplete) {
        toast({
          title: "Perfil Completo!",
          description: "Parabéns! Seu perfil foi completado com sucesso. Agora você pode usar todas as funcionalidades do sistema."
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!"
        });
      }

      // Recarregar dados
      await loadProfile();
      
      // Atualizar status do perfil no header
      refreshProfileStatus();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          {isProfileIncomplete && (
            <Badge variant="destructive" className="ml-2">
              Perfil Incompleto
            </Badge>
          )}
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </div>
        )}
      </div>

      {/* Aviso de Perfil Incompleto */}
      {isProfileIncomplete && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Perfil Incompleto:</strong> Complete as informações abaixo para ativar todas as funcionalidades do sistema.
            {!profile?.display_name && <><br />• Nome de exibição;</>}
            {!profile?.phone_number && <><br />• Número do WhatsApp;</>}
          </AlertDescription>
        </Alert>
      )}

      {/* Informações do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Meu Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center space-x-2">
                <UserCircle className="h-4 w-4" />
                <span>Informações Pessoais</span>
              </TabsTrigger>
              <TabsTrigger value="password" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Alterar Senha</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_name">
                Nome de Exibição {!profile?.display_name && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="Seu nome"
                className={!profile?.display_name ? "border-red-500" : ""}
              />
              {!profile?.display_name && (
                <p className="text-sm text-red-500 mt-1">Este campo é obrigatório.</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Seção WhatsApp */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-5 w-5" />
              <h3 className="text-lg font-semibold">WhatsApp</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone_number">
                  Número do WhatsApp {!profile?.phone_number && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="(51) 99999-9999"
                  className={`font-mono ${!profile?.phone_number ? "border-red-500" : ""}`}
                />
                {!profile?.phone_number && (
                  <p className="text-sm text-red-500 mt-1">Este campo é obrigatório.</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="whatsapp_active">Ativar Bot WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite receber transações via WhatsApp
                  </p>
                </div>
                <Switch
                  id="whatsapp_active"
                  checked={formData.whatsapp_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, whatsapp_active: checked }))}
                />
              </div>

              {formData.phone_number && formData.whatsapp_active && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>WhatsApp Ativo:</strong> Você receberá transações via WhatsApp no número {formData.phone_number}
                  </AlertDescription>
                </Alert>
              )}

            </div>

            {profile?.is_admin && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Administrador:</strong> Você tem acesso ao painel administrativo.
                </AlertDescription>
              </Alert>
            )}
          </div>

            </TabsContent>

            <TabsContent value="password" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Alterar Senha</h3>
                </div>
                
                <div className="space-y-4">
                  {!isFirstPasswordChange && (
                    <div>
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Digite sua senha atual"
                      />
                    </div>
                  )}

                  {isFirstPasswordChange && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Primeiro Acesso:</strong> Você está usando a senha temporária. Defina uma nova senha para sua conta.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Digite sua nova senha"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirme sua nova senha"
                    />
                  </div>

                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Status do Perfil - Apenas para Administradores */}
      {profile?.is_admin && (
        <Card>
          <CardHeader>
            <CardTitle>Status do Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email:</span>
                <Badge variant="outline">{profile?.email || 'N/A'}</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">WhatsApp:</span>
                <Badge variant={profile?.phone_number ? "default" : "secondary"}>
                  {profile?.phone_number || 'Não cadastrado'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Função:</span>
                <Badge variant={profile?.is_admin ? "default" : "outline"}>
                  {profile?.role || 'Usuário'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Bot WhatsApp:</span>
                <Badge variant={profile?.whatsapp_active ? "default" : "destructive"}>
                  {profile?.whatsapp_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving || loading}
          className="flex items-center gap-2 min-w-[140px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {activeTab === 'password' ? 'Alterando...' : 'Salvando...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {activeTab === 'password' ? 'Alterar Senha' : 'Salvar Alterações'}
            </>
          )}
        </Button>
      </div>

    </div>
  );
}

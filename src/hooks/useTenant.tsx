import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Profile {
  user_id: string;
  active_tenant_id: string | null;
  display_name: string | null;
  onboarding_done: boolean;
}

export const useTenant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Tentar carregar o perfil existente
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData && profileData.active_tenant_id) {
        // Usuário já tem perfil e tenant
        setProfile(profileData);
        setTenantId(profileData.active_tenant_id);
      } else {
        // Criar tenant e perfil para novo usuário
        console.log('[TENANT] Creating tenant for new user');
        const { data: newTenant, error: tenantError } = await supabase
          .rpc('create_tenant_and_join', { p_name: 'Finanças Pessoais' });

        if (tenantError) throw tenantError;

        // Recarregar o perfil
        const { data: newProfile, error: newProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (newProfileError) throw newProfileError;

        setProfile(newProfile);
        setTenantId(newProfile.active_tenant_id);

        toast({
          title: "Configuração inicial concluída",
          description: "Sua conta foi configurada com sucesso!",
        });
      }
    } catch (error: any) {
      console.error('[TENANT] Error loading/creating:', error);
      toast({
        title: "Erro na configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Resetar quando usuário faz logout
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setTenantId(null);
      setLoading(false);
    }
  }, [user]);

  return {
    profile,
    tenantId,
    loading,
    reloadProfile: loadProfile
  };
};
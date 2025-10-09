import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ProfileStatus {
  isIncomplete: boolean;
  loading: boolean;
  missingFields: string[];
}

export function useProfileStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProfileStatus>({
    isIncomplete: false,
    loading: true,
    missingFields: []
  });

  useEffect(() => {
    if (user) {
      checkProfileStatus();
    }
  }, [user]);

  const checkProfileStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, loading: true }));

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('display_name, phone_number')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      const missingFields: string[] = [];
      
      if (!profileData?.display_name) {
        missingFields.push('Nome');
      }
      
      if (!profileData?.phone_number) {
        missingFields.push('WhatsApp');
      }

      setStatus({
        isIncomplete: missingFields.length > 0,
        loading: false,
        missingFields
      });
    } catch (error) {
      console.error('Erro ao verificar status do perfil:', error);
      setStatus({
        isIncomplete: false,
        loading: false,
        missingFields: []
      });
    }
  };

  return {
    ...status,
    refresh: checkProfileStatus
  };
}

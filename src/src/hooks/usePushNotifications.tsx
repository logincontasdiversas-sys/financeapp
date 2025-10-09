import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user || !tenantId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_subscription')
        .eq('id', user.id)
        .single();

      setIsSubscribed(!!profile?.push_subscription);
    } catch (error) {
      console.error('Erro ao verificar status da inscrição:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notificações não suportadas',
        description: 'Seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user || !tenantId) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado.',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        toast({
          title: 'Permissão negada',
          description: 'As notificações push foram negadas.',
          variant: 'destructive',
        });
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      });

      // Save subscription to database
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: pushSubscription })
        .eq('id', user.id);

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá lembretes sobre suas finanças.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao inscrever nas notificações:', error);
      toast({
        title: 'Erro ao ativar notificações',
        description: 'Ocorreu um erro ao configurar as notificações push.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!user || !tenantId) return false;

    setIsLoading(true);

    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Remove subscription from database
      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', user.id);

      if (error) throw error;

      setIsSubscribed(false);
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      toast({
        title: 'Erro ao desativar notificações',
        description: 'Ocorreu um erro ao desativar as notificações.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!user || !tenantId) return;

    try {
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          title: 'Teste de Notificação',
          body: 'Esta é uma notificação de teste do FinanceApp!',
          url: '/dashboard',
        },
      });

      if (error) throw error;

      toast({
        title: 'Notificação de teste enviada',
        description: 'Verifique se você recebeu a notificação.',
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      toast({
        title: 'Erro ao enviar teste',
        description: 'Não foi possível enviar a notificação de teste.',
        variant: 'destructive',
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
};
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface PWAInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detectar se o app já está instalado
  useEffect(() => {
    const checkInstalled = () => {
      // Verificar se está rodando em modo standalone (PWA instalado)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      
      setIsInstalled(isStandalone || isInWebAppiOS);
    };

    checkInstalled();

    // Escutar mudanças no modo de exibição
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => {
      mediaQuery.removeEventListener('change', checkInstalled);
    };
  }, []);

  // Configurar listener para beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      logger.info('PWA_INSTALL', 'beforeinstallprompt event triggered');
      
      // Prevenir o prompt automático
      e.preventDefault();
      
      // Armazenar o evento para uso posterior
      setDeferredPrompt(e as PWAInstallEvent);
      setIsInstallable(true);
      
      logger.debug('PWA_INSTALL', 'Install prompt deferred', { 
        isInstallable: true 
      });
    };

    const handleAppInstalled = () => {
      logger.info('PWA_INSTALL', 'PWA installed successfully');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
    };

    // Adicionar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Função para mostrar o prompt de instalação
  const showInstallPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      logger.warn('PWA_INSTALL', 'No deferred prompt available');
      return { outcome: 'not-available' as const };
    }

    try {
      logger.info('PWA_INSTALL', 'Showing install prompt');
      
      // Mostrar o prompt
      await deferredPrompt.prompt();
      
      // Aguardar a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      
      logger.info('PWA_INSTALL', 'User choice received', { outcome });
      
      // Limpar o prompt usado
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      if (outcome === 'accepted') {
        logger.info('PWA_INSTALL', 'Install accepted by user');
      } else {
        logger.info('PWA_INSTALL', 'Install dismissed by user');
      }
      
      return { outcome };
      
    } catch (error) {
      logger.error('PWA_INSTALL', 'Error showing install prompt', { error });
      return { outcome: 'error' as const, error };
    }
  }, [deferredPrompt]);

  // Função para verificar se pode instalar
  const canInstall = useCallback(() => {
    return isInstallable && !isInstalled && !!deferredPrompt;
  }, [isInstallable, isInstalled, deferredPrompt]);

  // Informações do ambiente
  const getInstallInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);

    return {
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isInstallable,
      isInstalled,
      canInstall: canInstall(),
      installInstructions: getInstallInstructions(isIOS, isAndroid, isSafari, isChrome)
    };
  }, [isInstallable, isInstalled, canInstall]);

  return {
    isInstallable,
    isInstalled,
    canInstall,
    showInstallPrompt,
    getInstallInfo,
  };
};

// Instruções de instalação por plataforma
const getInstallInstructions = (
  isIOS: boolean,
  isAndroid: boolean,
  isSafari: boolean,
  isChrome: boolean
) => {
  if (isIOS && isSafari) {
    return {
      title: 'Instalar no iPhone/iPad',
      steps: [
        'Toque no ícone de compartilhar (📤)',
        'Role para baixo e toque em "Adicionar à Tela de Início"',
        'Toque em "Adicionar" para confirmar'
      ]
    };
  }

  if (isAndroid && isChrome) {
    return {
      title: 'Instalar no Android',
      steps: [
        'Toque no menu (⋮) no canto superior direito',
        'Toque em "Instalar app" ou "Adicionar à tela inicial"',
        'Confirme a instalação'
      ]
    };
  }

  return {
    title: 'Instalar App',
    steps: [
      'Use um navegador compatível (Chrome, Safari, Edge)',
      'Procure pela opção de "Instalar" no menu do navegador',
      'Siga as instruções na tela'
    ]
  };
};
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, TestTube, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const PushNotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
    setIsTestDialogOpen(false);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Notificações push não são suportadas neste navegador.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              Ativar notificações
            </Label>
            <p className="text-sm text-muted-foreground">
              Receba lembretes sobre vencimentos e metas
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {isSubscribed && (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Notificações ativadas
                </p>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Você receberá lembretes sobre vencimentos de dívidas e progresso de metas.
              </p>
            </div>

            <div className="flex gap-2">
              <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Notificação
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Enviar Notificação de Teste</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Esta ação enviará uma notificação de teste para verificar se as notificações push estão funcionando corretamente.
                    </p>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">Notificação de teste:</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        "Esta é uma notificação de teste do FinanceApp!"
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleTestNotification}>
                      Enviar Teste
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Desativar
              </Button>
            </div>
          </div>
        )}

        {!isSubscribed && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Ative as notificações para receber lembretes automáticos sobre:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Vencimentos de dívidas</li>
              <li>• Progresso de metas</li>
              <li>• Alertas financeiros</li>
              <li>• Lembretes de pagamentos</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

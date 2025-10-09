import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PushNotificationSettings } from "@/components/PushNotificationSettings";
import { BackupRestoreSettings } from "@/components/BackupRestoreSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PDFTestComponent } from "@/components/PDFTestComponent";

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie suas preferências e notificações
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notificações Push */}
        <PushNotificationSettings />

        {/* Backup e Restore */}
        <BackupRestoreSettings />

        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-base font-medium">Tema</p>
                <p className="text-sm text-muted-foreground">
                  Escolha entre tema claro ou escuro
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teste de PDF - Temporário */}
      <div className="grid gap-6">
        <PDFTestComponent />
      </div>
    </div>
  );
};

export default Configuracoes;

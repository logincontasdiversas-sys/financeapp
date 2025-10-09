import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Upload, Database, AlertTriangle, Loader2 } from 'lucide-react';
import { useBackup } from '@/services/backupService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

export const BackupRestoreSettings = () => {
  const { downloadBackup, uploadBackup, importData, getBackupStats } = useBackup();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<any>(null);
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false,
    skipTransactions: false,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadBackup();
      toast({
        title: 'Backup exportado com sucesso!',
        description: 'Seus dados foram baixados em formato JSON.',
      });
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      toast({
        title: 'Erro ao exportar backup',
        description: 'Ocorreu um erro ao exportar seus dados.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsImporting(true);

    try {
      const data = await uploadBackup(file);
      setBackupData(data);
      setIsImportDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      toast({
        title: 'Erro ao carregar arquivo',
        description: 'O arquivo selecionado não é um backup válido.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (!backupData) return;

    setIsImporting(true);
    try {
      await importData(backupData, importOptions);
      toast({
        title: 'Backup importado com sucesso!',
        description: 'Seus dados foram restaurados com sucesso.',
      });
      setIsImportDialogOpen(false);
      setBackupData(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      toast({
        title: 'Erro ao importar backup',
        description: 'Ocorreu um erro ao restaurar seus dados.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const backupStats = backupData ? getBackupStats(backupData) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backup e Restore
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium mb-2">Exportar Dados</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Faça backup de todos os seus dados financeiros em um arquivo JSON.
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Backup
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium mb-2">Importar Dados</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Restaure seus dados a partir de um arquivo de backup.
            </p>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Confirmar Importação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {backupStats && (
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Informações do Backup</h5>
                    <div className="text-sm space-y-1">
                      <p><strong>Versão:</strong> {backupStats.version}</p>
                      <p><strong>Data de Exportação:</strong> {new Date(backupStats.exportDate).toLocaleDateString('pt-BR')}</p>
                      <p><strong>Total de Registros:</strong> {backupStats.totalRecords}</p>
                    </div>
                  </div>

                  <div className="bg-muted p-3 rounded-lg">
                    <h5 className="font-medium mb-2">Detalhamento dos Dados</h5>
                    <div className="text-sm space-y-1">
                      {Object.entries(backupStats.breakdown).map(([key, count]) => (
                        <p key={key}>
                          <strong>{key.replace('_', ' ')}:</strong> {count} registros
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwrite"
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked) =>
                      setImportOptions(prev => ({ ...prev, overwriteExisting: !!checked }))
                    }
                  />
                  <Label htmlFor="overwrite" className="text-sm">
                    Sobrescrever dados existentes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipTransactions"
                    checked={importOptions.skipTransactions}
                    onCheckedChange={(checked) =>
                      setImportOptions(prev => ({ ...prev, skipTransactions: !!checked }))
                    }
                  />
                  <Label htmlFor="skipTransactions" className="text-sm">
                    Pular transações (apenas configurações)
                  </Label>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Atenção: Esta operação irá modificar seus dados atuais.
                    </p>
                    <p className="text-yellow-600 dark:text-yellow-400 mt-1">
                      Recomendamos fazer um backup antes de importar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Section */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Faça backups regulares para proteger seus dados. 
            O arquivo de backup contém todas as suas informações financeiras em formato JSON.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

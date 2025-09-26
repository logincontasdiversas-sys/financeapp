import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { runAllCorrections, correctDebtValues, correctGoalValues } from '@/utils/debtCorrection';
import { cleanupUnusedPersonalCategories, cleanupUnusedDebtCategories, cleanupUnusedGoalCategories } from '@/utils/categoryCleanup';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminCorrection() {
  const [isRunning, setIsRunning] = useState(false);
  const [correctionType, setCorrectionType] = useState<'all' | 'debts' | 'goals'>('all');
  const [cleanupType, setCleanupType] = useState<'all' | 'debts' | 'goals'>('all');
  const [results, setResults] = useState<string[]>([]);
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runCorrection = async () => {
    if (!tenantId) {
      toast({
        title: "Erro",
        description: "Tenant ID não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setResults([]);
    
    addResult('Iniciando correção...');

    try {
      // Interceptar console.log para capturar os logs
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('[')) {
          addResult(args.join(' '));
        }
      };

      if (correctionType === 'all') {
        await runAllCorrections(tenantId);
      } else if (correctionType === 'debts') {
        await correctDebtValues(tenantId);
      } else if (correctionType === 'goals') {
        await correctGoalValues(tenantId);
      }

      // Restaurar console.log original
      console.log = originalLog;

      addResult('✅ Correção concluída com sucesso!');
      
      toast({
        title: "Sucesso",
        description: "Correção executada com sucesso!",
      });

    } catch (error) {
      console.error('Erro durante a correção:', error);
      addResult(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      toast({
        title: "Erro",
        description: "Erro durante a correção. Verifique o console para detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runCleanup = async () => {
    if (!tenantId) {
      toast({
        title: "Erro",
        description: "Tenant ID não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setResults([]);
    
    addResult('Iniciando limpeza de categorias...');

    try {
      // Interceptar console.log para capturar os logs
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        if (args[0] && typeof args[0] === 'string' && args[0].includes('[')) {
          addResult(args.join(' '));
        }
      };

      if (cleanupType === 'all') {
        await cleanupUnusedPersonalCategories(tenantId);
      } else if (cleanupType === 'debts') {
        await cleanupUnusedDebtCategories(tenantId);
      } else if (cleanupType === 'goals') {
        await cleanupUnusedGoalCategories(tenantId);
      }

      toast({
        title: "Sucesso",
        description: "Limpeza de categorias concluída!",
      });

    } catch (error) {
      console.error('Erro na limpeza:', error);
      addResult(`Erro: ${error}`);
      toast({
        title: "Erro",
        description: "Erro durante a limpeza de categorias",
        variant: "destructive",
      });
    } finally {
      console.log = originalLog;
      setIsRunning(false);
      addResult('Limpeza concluída!');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Correção de Valores - Dívidas e Metas
          </CardTitle>
          <CardDescription>
            Script para corrigir valores incorretos de dívidas e metas baseado apenas em despesas específicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Este script irá recalcular os valores de dívidas e metas baseado apenas 
              em despesas que foram especificamente criadas para pagamento de dívidas/metas. 
              Despesas normais na mesma categoria não serão contabilizadas.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Correção:</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="all"
                    checked={correctionType === 'all'}
                    onChange={(e) => setCorrectionType(e.target.value as 'all')}
                    disabled={isRunning}
                  />
                  Todas (Dívidas + Metas)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="debts"
                    checked={correctionType === 'debts'}
                    onChange={(e) => setCorrectionType(e.target.value as 'debts')}
                    disabled={isRunning}
                  />
                  Apenas Dívidas
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="goals"
                    checked={correctionType === 'goals'}
                    onChange={(e) => setCorrectionType(e.target.value as 'goals')}
                    disabled={isRunning}
                  />
                  Apenas Metas
                </label>
              </div>
            </div>

            <Button 
              onClick={runCorrection} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando Correção...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Executar Correção
                </>
              )}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Log de Execução:</h3>
              <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {results.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Limpeza de Categorias Não Utilizadas
          </CardTitle>
          <CardDescription>
            Remove automaticamente categorias personalizadas de dívidas e metas que não estão sendo utilizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta função irá deletar categorias personalizadas (Dívida - e Meta -) 
              que não estão sendo usadas em transações, dívidas ou metas. Ação irreversível!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Limpeza:</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="all"
                    checked={cleanupType === 'all'}
                    onChange={(e) => setCleanupType(e.target.value as 'all')}
                    disabled={isRunning}
                  />
                  Todas (Dívidas + Metas)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="debts"
                    checked={cleanupType === 'debts'}
                    onChange={(e) => setCleanupType(e.target.value as 'debts')}
                    disabled={isRunning}
                  />
                  Apenas Dívidas
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="goals"
                    checked={cleanupType === 'goals'}
                    onChange={(e) => setCleanupType(e.target.value as 'goals')}
                    disabled={isRunning}
                  />
                  Apenas Metas
                </label>
              </div>
            </div>
          </div>

          <Button 
            onClick={runCleanup} 
            disabled={isRunning}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Executar Limpeza
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

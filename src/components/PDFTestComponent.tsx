import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testPDFGeneration, testSimplePDFService } from '@/test/pdfTest';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';

export const PDFTestComponent = () => {
  const { tenantId } = useTenant();
  const [testResults, setTestResults] = useState<{
    basicTest: boolean | null;
    serviceTest: boolean | null;
    supabaseTest: boolean | null;
  }>({
    basicTest: null,
    serviceTest: null,
    supabaseTest: null,
  });

  const runBasicTest = async () => {
    console.log('Executando teste básico...');
    const result = testPDFGeneration();
    setTestResults(prev => ({ ...prev, basicTest: result }));
  };

  const runServiceTest = async () => {
    console.log('Executando teste do serviço...');
    const result = await testSimplePDFService();
    setTestResults(prev => ({ ...prev, serviceTest: result }));
  };

  const runSupabaseTest = async () => {
    console.log('[TEST] Testing Supabase connection...');
    console.log('[TEST] Tenant ID:', tenantId);
    
    try {
      // Test 1: Simple query
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, description, date, status, kind')
        .eq('tenant_id', tenantId)
        .limit(3);

      if (error) {
        console.error('[TEST] Supabase error:', error);
        setTestResults(prev => ({ ...prev, supabaseTest: false }));
        return;
      }

      console.log('[TEST] Supabase success:', data);

      // Test 2: Date range query
      const startDate = '2025-09-01';
      const endDate = '2025-09-30';
      
      const { data: dateData, error: dateError } = await supabase
        .from('transactions')
        .select('id, amount, description, date, status, kind')
        .eq('tenant_id', tenantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(5);

      if (dateError) {
        console.error('[TEST] Date query error:', dateError);
        setTestResults(prev => ({ ...prev, supabaseTest: false }));
        return;
      }

      console.log('[TEST] Date query success:', dateData);
      setTestResults(prev => ({ ...prev, supabaseTest: true }));

    } catch (err) {
      console.error('[TEST] Unexpected error:', err);
      setTestResults(prev => ({ ...prev, supabaseTest: false }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Teste de Geração de PDF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button onClick={runBasicTest} className="w-full">
            Teste Básico do jsPDF
          </Button>
          {testResults.basicTest !== null && (
            <p className={`text-sm ${testResults.basicTest ? 'text-green-600' : 'text-red-600'}`}>
              {testResults.basicTest ? '✅ Teste básico passou' : '❌ Teste básico falhou'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Button onClick={runServiceTest} className="w-full">
            Teste do Serviço Simplificado
          </Button>
          {testResults.serviceTest !== null && (
            <p className={`text-sm ${testResults.serviceTest ? 'text-green-600' : 'text-red-600'}`}>
              {testResults.serviceTest ? '✅ Teste do serviço passou' : '❌ Teste do serviço falhou'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Button onClick={runSupabaseTest} className="w-full" variant="outline">
            Teste do Supabase
          </Button>
          {testResults.supabaseTest !== null && (
            <p className={`text-sm ${testResults.supabaseTest ? 'text-green-600' : 'text-red-600'}`}>
              {testResults.supabaseTest ? '✅ Teste do Supabase passou' : '❌ Teste do Supabase falhou'}
            </p>
          )}
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 Abra o console do navegador (F12) para ver os logs detalhados dos testes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

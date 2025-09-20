import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

interface BackupData {
  version: string;
  exportDate: string;
  user: {
    id: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
  };
  data: {
    banks: any[];
    categories: any[];
    credit_cards: any[];
    goals: any[];
    debts: any[];
    transactions: any[];
    budgets: any[];
  };
}

export class BackupService {
  private user: any;
  private tenantId: string;

  constructor(user: any, tenantId: string) {
    this.user = user;
    this.tenantId = tenantId;
  }

  async exportData(): Promise<BackupData> {
    try {
      // Fetch all data from the tenant
      const [banksResult, categoriesResult, creditCardsResult, goalsResult, debtsResult, transactionsResult, budgetsResult] = await Promise.all([
        supabase.from('banks').select('*').eq('tenant_id', this.tenantId),
        supabase.from('categories').select('*').eq('tenant_id', this.tenantId),
        supabase.from('credit_cards').select('*').eq('tenant_id', this.tenantId),
        supabase.from('goals').select('*').eq('tenant_id', this.tenantId),
        supabase.from('debts').select('*').eq('tenant_id', this.tenantId),
        supabase.from('transactions').select('*').eq('tenant_id', this.tenantId),
        supabase.from('budgets').select('*').eq('tenant_id', this.tenantId),
      ]);

      // Check for errors
      const errors = [
        banksResult.error,
        categoriesResult.error,
        creditCardsResult.error,
        goalsResult.error,
        debtsResult.error,
        transactionsResult.error,
        budgetsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(`Erro ao exportar dados: ${errors.map(e => e?.message).join(', ')}`);
      }

      // Get tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', this.tenantId)
        .single();

      if (tenantError) throw tenantError;

      const backupData: BackupData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        user: {
          id: this.user.id,
          email: this.user.email,
        },
        tenant: {
          id: this.tenantId,
          name: tenantData.name,
        },
        data: {
          banks: banksResult.data || [],
          categories: categoriesResult.data || [],
          credit_cards: creditCardsResult.data || [],
          goals: goalsResult.data || [],
          debts: debtsResult.data || [],
          transactions: transactionsResult.data || [],
          budgets: budgetsResult.data || [],
        },
      };

      return backupData;
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      throw error;
    }
  }

  async importData(backupData: BackupData, options: { 
    overwriteExisting?: boolean;
    skipTransactions?: boolean;
  } = {}): Promise<void> {
    try {
      const { overwriteExisting = false, skipTransactions = false } = options;

      // Validate backup data
      if (!backupData.version || !backupData.data) {
        throw new Error('Dados de backup inválidos');
      }

      // Import in order (respecting foreign key constraints)
      const importOrder = [
        { table: 'banks', data: backupData.data.banks },
        { table: 'categories', data: backupData.data.categories },
        { table: 'credit_cards', data: backupData.data.credit_cards },
        { table: 'goals', data: backupData.data.goals },
        { table: 'debts', data: backupData.data.debts },
        { table: 'budgets', data: backupData.data.budgets },
      ];

      // Add transactions last if not skipped
      if (!skipTransactions) {
        importOrder.push({ table: 'transactions', data: backupData.data.transactions });
      }

      for (const { table, data } of importOrder) {
        if (!data || data.length === 0) continue;

        // Prepare data for import
        const importData = data.map(item => {
          const { id, created_at, updated_at, ...itemData } = item;
          return {
            ...itemData,
            tenant_id: this.tenantId,
            user_id: this.user.id,
          };
        });

        if (overwriteExisting) {
          // Delete existing data first
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('tenant_id', this.tenantId);

          if (deleteError) throw deleteError;
        }

        // Insert new data
        const { error: insertError } = await supabase
          .from(table)
          .insert(importData);

        if (insertError) throw insertError;
      }

    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw error;
    }
  }

  async downloadBackup(): Promise<void> {
    try {
      const backupData = await this.exportData();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeapp-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      throw error;
    }
  }

  async uploadBackup(file: File): Promise<BackupData> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;
      
      // Validate backup data structure
      if (!backupData.version || !backupData.data) {
        throw new Error('Arquivo de backup inválido');
      }

      return backupData;
    } catch (error) {
      console.error('Erro ao carregar backup:', error);
      throw new Error('Erro ao processar arquivo de backup');
    }
  }

  getBackupStats(backupData: BackupData): {
    totalRecords: number;
    breakdown: Record<string, number>;
    exportDate: string;
    version: string;
  } {
    const breakdown = {
      banks: backupData.data.banks?.length || 0,
      categories: backupData.data.categories?.length || 0,
      credit_cards: backupData.data.credit_cards?.length || 0,
      goals: backupData.data.goals?.length || 0,
      debts: backupData.data.debts?.length || 0,
      transactions: backupData.data.transactions?.length || 0,
      budgets: backupData.data.budgets?.length || 0,
    };

    const totalRecords = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

    return {
      totalRecords,
      breakdown,
      exportDate: backupData.exportDate,
      version: backupData.version,
    };
  }
}

// Hook para usar o serviço
export const useBackup = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const backupService = new BackupService(user, tenantId);

  const exportData = async () => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }
    return await backupService.exportData();
  };

  const importData = async (backupData: BackupData, options?: any) => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }
    return await backupService.importData(backupData, options);
  };

  const downloadBackup = async () => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }
    return await backupService.downloadBackup();
  };

  const uploadBackup = async (file: File) => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }
    return await backupService.uploadBackup(file);
  };

  const getBackupStats = (backupData: BackupData) => {
    return backupService.getBackupStats(backupData);
  };

  return {
    exportData,
    importData,
    downloadBackup,
    uploadBackup,
    getBackupStats,
  };
};

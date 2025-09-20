import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface TransactionData {
  id: string;
  amount: number;
  description: string;
  date: string;
  status: 'settled' | 'pending';
  kind: 'income' | 'expense';
  categories?: {
    name: string;
    emoji: string;
  } | null;
  banks?: {
    name: string;
  } | null;
}

interface MonthlyReportData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactions: TransactionData[];
  categories: Array<{
    name: string;
    emoji: string;
    total: number;
    percentage: number;
  }>;
  banks: Array<{
    name: string;
    balance: number;
    initialBalance: number;
  }>;
}

export class PDFReportService {
  private user: any;
  private tenantId: string;

  constructor(user: any, tenantId: string) {
    this.user = user;
    this.tenantId = tenantId;
  }

  async generateMonthlyReport(month: number, year: number): Promise<void> {
    try {
      console.log('Iniciando geração de relatório PDF...', { month, year });
      
      const reportData = await this.fetchMonthlyData(month, year);
      console.log('Dados do relatório carregados:', reportData);
      
      const pdf = this.createPDF(reportData);
      console.log('PDF criado com sucesso');
      
      this.downloadPDF(pdf, `relatorio-${month.toString().padStart(2, '0')}-${year}.pdf`);
      console.log('Download iniciado');
    } catch (error) {
      console.error('Erro detalhado ao gerar relatório PDF:', error);
      throw new Error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  private async fetchMonthlyData(month: number, year: number): Promise<MonthlyReportData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        description,
        date,
        status,
        kind,
        categories (name, emoji),
        banks (name)
      `)
      .eq('tenant_id', this.tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (transactionsError) throw transactionsError;

    // Calculate totals
    const totalIncome = transactions
      ?.filter(t => t.kind === 'income' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const totalExpenses = transactions
      ?.filter(t => t.kind === 'expense' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const balance = totalIncome - totalExpenses;

    // Calculate category totals
    const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();
    
    transactions?.forEach(transaction => {
      if (transaction.kind === 'expense' && transaction.status === 'settled' && transaction.categories) {
        const categoryName = transaction.categories.name;
        const existing = categoryMap.get(categoryName) || { 
          name: categoryName, 
          emoji: transaction.categories.emoji, 
          total: 0 
        };
        existing.total += transaction.amount;
        categoryMap.set(categoryName, existing);
      }
    });

    const categories = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Fetch bank balances
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select('name, balance')
      .eq('tenant_id', this.tenantId);

    if (banksError) throw banksError;

    const banksData = banks?.map(bank => ({
      name: bank.name,
      balance: bank.balance,
      initialBalance: bank.balance // Simplified for now
    })) || [];

    return {
      month: this.getMonthName(month),
      year,
      totalIncome,
      totalExpenses,
      balance,
      transactions: transactions || [],
      categories,
      banks: banksData
    };
  }

  private createPDF(data: MonthlyReportData): jsPDF {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório Financeiro Mensal', pageWidth / 2, 30, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${data.month} de ${data.year}`, pageWidth / 2, 40, { align: 'center' });

    // Summary section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo Financeiro', 20, 60);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de Receitas: R$ ${this.formatCurrency(data.totalIncome)}`, 20, 75);
    pdf.text(`Total de Despesas: R$ ${this.formatCurrency(data.totalExpenses)}`, 20, 85);
    pdf.text(`Saldo do Mês: R$ ${this.formatCurrency(data.balance)}`, 20, 95);

    // Categories section
    if (data.categories.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gastos por Categoria', 20, 115);
      
      const categoryData = data.categories.map(cat => [
        `${cat.emoji} ${cat.name}`,
        `R$ ${this.formatCurrency(cat.total)}`,
        `${cat.percentage.toFixed(1)}%`
      ]);

      autoTable(pdf, {
        startY: 125,
        head: [['Categoria', 'Valor', 'Percentual']],
        body: categoryData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20, right: 20 }
      });
    }

    // Banks section
    if (data.banks.length > 0) {
      const banksY = 125 + (data.categories.length * 15) + 40;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Saldos dos Bancos', 20, banksY);
      
      const bankData = data.banks.map(bank => [
        bank.name,
        `R$ ${this.formatCurrency(bank.balance)}`
      ]);

      autoTable(pdf, {
        startY: banksY + 10,
        head: [['Banco', 'Saldo Atual']],
        body: bankData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20, right: 20 }
      });
    }

    // Transactions section
    const transactionsY = 125 + (data.categories.length * 15) + (data.banks.length * 15) + 80;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transações do Mês', 20, transactionsY);
    
    const transactionData = data.transactions.map(transaction => [
      transaction.date,
      transaction.kind === 'income' ? 'Receita' : 'Despesa',
      `${transaction.categories?.emoji || ''} ${transaction.categories?.name || 'Sem categoria'}`,
      transaction.banks?.name || 'Sem banco',
      `R$ ${this.formatCurrency(transaction.amount)}`,
      transaction.status === 'settled' ? 'Liquidado' : 'Pendente'
    ]);

    autoTable(pdf, {
      startY: transactionsY + 10,
      head: [['Data', 'Tipo', 'Categoria', 'Banco', 'Valor', 'Status']],
      body: transactionData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 15 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 15 }
      }
    });

    // Footer
    const finalY = transactionsY + (data.transactions.length * 8) + 40;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, finalY, { align: 'center' });
    pdf.text('FinanceApp - Gestão Financeira Pessoal', pageWidth / 2, finalY + 10, { align: 'center' });

    return pdf;
  }

  private downloadPDF(pdf: jsPDF, filename: string): void {
    pdf.save(filename);
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  }
}

// Hook para usar o serviço
export const usePDFReport = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const generateReport = async (month: number, year: number) => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }

    const service = new PDFReportService(user, tenantId);
    return await service.generateMonthlyReport(month, year);
  };

  return { generateReport };
};

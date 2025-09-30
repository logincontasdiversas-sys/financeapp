import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

interface TransactionData {
  id: string;
  amount: number;
  title: string;
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

export class SimplePDFService {
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
      
      const pdf = this.createSimplePDF(reportData);
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

    console.log(`[PDF_DEBUG] Fetching data for ${month}/${year}`);
    console.log(`[PDF_DEBUG] Start date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`[PDF_DEBUG] End date: ${endDate.toISOString().split('T')[0]}`);
    console.log(`[PDF_DEBUG] Tenant ID: ${this.tenantId}`);

    // Test simple query first
    const { data: testData, error: testError } = await supabase
      .from('transactions')
      .select('id, amount, title, date, status, kind')
      .eq('tenant_id', this.tenantId)
      .limit(5);

    if (testError) {
      console.error('[PDF_DEBUG] Test query failed:', testError);
      throw testError;
    }

    console.log(`[PDF_DEBUG] Test query successful, found ${testData?.length || 0} transactions`);

    // Now try the full query
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        title,
        date,
        status,
        kind,
        category_id,
        bank_id
      `)
      .eq('tenant_id', this.tenantId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (transactionsError) {
      console.error('[PDF_DEBUG] Full query failed:', transactionsError);
      throw transactionsError;
    }

    console.log(`[PDF_DEBUG] Full query successful, found ${transactions?.length || 0} transactions`);

    // Fetch categories and banks separately
    const categoryIds = [...new Set(transactions?.map(t => t.category_id).filter(Boolean) || [])];
    const bankIds = [...new Set(transactions?.map(t => t.bank_id).filter(Boolean) || [])];

    const [categoriesResult, banksResult] = await Promise.all([
      categoryIds.length > 0 ? supabase.from('categories').select('id, name, emoji').in('id', categoryIds) : Promise.resolve({ data: [], error: null }),
      bankIds.length > 0 ? supabase.from('banks').select('id, name').in('id', bankIds) : Promise.resolve({ data: [], error: null })
    ]);

    const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || []);
    const banksMap = new Map(banksResult.data?.map(b => [b.id, b]) || []);

    // Enrich transactions with category and bank data
    const enrichedTransactions = transactions?.map(transaction => ({
      ...transaction,
      categories: transaction.category_id ? categoriesMap.get(transaction.category_id) : null,
      banks: transaction.bank_id ? banksMap.get(transaction.bank_id) : null
    })) || [];

    // Fetch bank balances first
    const { data: banks, error: banksError } = await supabase
      .from('banks')
      .select('name, balance')
      .eq('tenant_id', this.tenantId);

    if (banksError) throw banksError;

    const banksData = banks?.map(bank => ({
      name: bank.name,
      balance: bank.balance,
      initialBalance: bank.balance
    })) || [];

    // Calculate totals for the month
    const totalIncome = enrichedTransactions
      .filter(t => t.kind === 'income' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = enrichedTransactions
      .filter(t => t.kind === 'expense' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate cumulative balance (like Dashboard and Movimentações)
    // Get all transactions from beginning until end of current month
    const { data: allTransactionsUntilNow } = await supabase
      .from('transactions')
      .select('amount, kind, status, payment_method')
      .eq('tenant_id', this.tenantId)
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Calculate cumulative balance: initial bank balance + all historical transactions
    const totalInitialBankBalance = banksData?.reduce((sum, bank) => sum + Number(bank.balance || 0), 0) || 0;
    let cumulativeBalance = totalInitialBankBalance;
    
    if (allTransactionsUntilNow) {
      allTransactionsUntilNow.forEach(transaction => {
        if (transaction.status === 'settled') {
          if (transaction.kind === 'income') {
            cumulativeBalance += Number(transaction.amount);
          } else if (transaction.kind === 'expense' && transaction.payment_method !== 'credit_card') {
            cumulativeBalance -= Number(transaction.amount);
          }
        }
      });
    }

    const balance = cumulativeBalance; // Use cumulative balance instead of monthly balance

    // Calculate category totals
    const categoryMap = new Map<string, { name: string; emoji: string; total: number }>();
    
    enrichedTransactions.forEach(transaction => {
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


    return {
      month: this.getMonthName(month),
      year,
      totalIncome,
      totalExpenses,
      balance,
      transactions: enrichedTransactions,
      categories,
      banks: banksData
    };
  }

  private createSimplePDF(data: MonthlyReportData): jsPDF {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header with better styling
    pdf.setFillColor(59, 130, 246); // Blue background
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório Financeiro Mensal', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${data.month} de ${data.year}`, pageWidth / 2, 35, { align: 'center' });
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    yPosition = 50;

    // Summary section with cards style
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.rect(15, yPosition - 5, pageWidth - 30, 50, 'F');
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo Financeiro', 25, yPosition);
    yPosition += 20;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    // Income (green)
    pdf.setTextColor(34, 197, 94);
    pdf.text(`Receitas: R$ ${this.formatCurrency(data.totalIncome)}`, 25, yPosition);
    yPosition += 10;
    
    // Expenses (red)
    pdf.setTextColor(239, 68, 68);
    pdf.text(`Despesas: R$ ${this.formatCurrency(data.totalExpenses)}`, 25, yPosition);
    yPosition += 10;
    
      // Balance (blue or red based on value)
      pdf.setTextColor(data.balance >= 0 ? 34 : 239, data.balance >= 0 ? 197 : 68, data.balance >= 0 ? 94 : 68);
      pdf.text(`Saldo Acumulado: R$ ${this.formatCurrency(data.balance)}`, 25, yPosition);
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    yPosition += 30;

    // Banks section - IMPROVED DESIGN
    if (data.banks.length > 0) {
      // Section header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bancos', 20, yPosition);
      yPosition += 20;
      
      // Calculate bank transactions for the month
      const bankTransactions = data.transactions.filter(t => t.banks);
      const bankData = data.banks.map(bank => {
        const bankTransactions = data.transactions.filter(t => t.banks?.name === bank.name);
        const monthlyIncome = bankTransactions
          .filter(t => t.kind === 'income' && t.status === 'settled')
          .reduce((sum, t) => sum + t.amount, 0);
        const monthlyExpenses = bankTransactions
          .filter(t => t.kind === 'expense' && t.status === 'settled')
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          ...bank,
          monthlyIncome,
          monthlyExpenses
        };
      });
      
      // Create individual cards for each bank
      bankData.forEach((bank, index) => {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Bank card background
        pdf.setFillColor(255, 255, 255); // White background
        pdf.setDrawColor(229, 231, 235); // Light gray border
        pdf.rect(15, yPosition - 5, pageWidth - 30, 50, 'FD'); // Filled with border
        
        // Bank name (bold, larger)
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(bank.name, 25, yPosition + 5);
        
        // Monthly income (left side)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Receitas do Mês:', 25, yPosition + 15);
        pdf.setTextColor(34, 197, 94); // Green
        pdf.text(`R$ ${this.formatCurrency(bank.monthlyIncome)}`, 25, yPosition + 25);
        
        // Monthly expenses (left side, below income)
        pdf.setTextColor(0, 0, 0);
        pdf.text('Despesas do Mês:', 25, yPosition + 35);
        pdf.setTextColor(239, 68, 68); // Red
        pdf.text(`R$ ${this.formatCurrency(bank.monthlyExpenses)}`, 25, yPosition + 45);
        
        // Current balance (right side)
        pdf.setTextColor(0, 0, 0);
        pdf.text('Saldo Atual:', pageWidth - 80, yPosition + 15);
        const balanceColor = bank.balance >= 0 ? [34, 197, 94] : [239, 68, 68];
        pdf.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`R$ ${this.formatCurrency(bank.balance)}`, pageWidth - 80, yPosition + 25);
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
        yPosition += 60;
      });
      
      yPosition += 10;
    }

    // Categories section with better formatting
    if (data.categories.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Gastos por Categoria', 20, yPosition);
      yPosition += 15;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      data.categories.slice(0, 8).forEach((category, index) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Category name with simple text icon to avoid encoding issues
        const categoryText = `• ${category.name}`;
        
        // Amount and percentage
        const amountText = `R$ ${this.formatCurrency(category.total)}`;
        const percentageText = `(${category.percentage.toFixed(1)}%)`;
        
        // Draw category line
        pdf.text(categoryText, 20, yPosition);
        pdf.text(amountText, 120, yPosition);
        pdf.text(percentageText, 180, yPosition);
        
        yPosition += 12;
      });
      yPosition += 10;
    }


    // Transactions section with table-like format
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Transações do Mês', 20, yPosition);
    yPosition += 15;
    
    // Table header
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Data', 20, yPosition);
    pdf.text('Tipo', 50, yPosition);
    pdf.text('Categoria', 70, yPosition);
    pdf.text('Banco', 120, yPosition);
    pdf.text('Valor', 150, yPosition);
    pdf.text('Status', 180, yPosition);
    yPosition += 15;
    
    pdf.setFont('helvetica', 'normal');
    
    data.transactions.slice(0, 25).forEach((transaction, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
        // Redraw header
        pdf.setFillColor(243, 244, 246);
        pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.text('Data', 20, yPosition);
        pdf.text('Tipo', 50, yPosition);
        pdf.text('Categoria', 70, yPosition);
        pdf.text('Banco', 120, yPosition);
        pdf.text('Valor', 150, yPosition);
        pdf.text('Status', 180, yPosition);
        yPosition += 15;
        pdf.setFont('helvetica', 'normal');
      }
      
      // Alternate row colors
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(15, yPosition - 3, pageWidth - 30, 8, 'F');
      }
      
      const type = transaction.kind === 'income' ? 'Receita' : 'Despesa';
      const category = transaction.categories ? `• ${transaction.categories.name}` : '• Sem categoria';
      const bank = transaction.banks?.name || 'Sem banco';
      const status = transaction.status === 'settled' ? 'Liquidado' : 'Pendente';
      
      // Set colors based on type
      if (transaction.kind === 'income') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(239, 68, 68);
      }
      
      pdf.text(this.formatDate(transaction.date), 20, yPosition);
      pdf.text(type, 50, yPosition);
      pdf.text(category.length > 20 ? category.substring(0, 17) + '...' : category, 70, yPosition);
      pdf.text(bank.length > 15 ? bank.substring(0, 12) + '...' : bank, 120, yPosition);
      pdf.text(`R$ ${this.formatCurrency(transaction.amount)}`, 150, yPosition);
      
      // Status color
      if (status === 'Liquidado') {
        pdf.setTextColor(34, 197, 94);
      } else {
        pdf.setTextColor(245, 158, 11);
      }
      pdf.text(status, 180, yPosition);
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      yPosition += 8;
    });

    // Footer with better styling
    pdf.setFillColor(31, 41, 55);
    pdf.rect(0, 270, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 280, { align: 'center' });
    pdf.text('FinanceApp - Gestão Financeira Pessoal', pageWidth / 2, 290, { align: 'center' });

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

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }

}

// Hook para usar o serviço
export const useSimplePDFReport = () => {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const generateReport = async (month: number, year: number) => {
    if (!user || !tenantId) {
      throw new Error('Usuário não autenticado ou tenant não encontrado');
    }

    const service = new SimplePDFService(user, tenantId);
    return await service.generateMonthlyReport(month, year);
  };

  return { generateReport };
};

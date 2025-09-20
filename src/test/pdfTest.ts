// Teste simples para verificar se o jsPDF funciona
import jsPDF from 'jspdf';

export const testPDFGeneration = () => {
  try {
    console.log('Iniciando teste de geração de PDF...');
    
    // Teste básico do jsPDF
    const pdf = new jsPDF();
    console.log('jsPDF criado com sucesso');
    
    // Teste de adicionar texto
    pdf.text('Teste de PDF', 20, 20);
    console.log('Texto adicionado com sucesso');
    
    // Teste de download
    pdf.save('teste-pdf.pdf');
    console.log('Download iniciado com sucesso');
    
    return true;
  } catch (error) {
    console.error('Erro no teste de PDF:', error);
    return false;
  }
};

// Teste do serviço simplificado
export const testSimplePDFService = async () => {
  try {
    console.log('Testando serviço simplificado...');
    
    // Mock dos dados necessários
    const mockData = {
      month: 'Janeiro',
      year: 2025,
      totalIncome: 5000,
      totalExpenses: 3000,
      balance: 2000,
      transactions: [
        {
          id: '1',
          amount: 1000,
          description: 'Salário',
          date: '2025-01-15',
          status: 'settled' as const,
          kind: 'income' as const,
          categories: { name: 'Salário', emoji: '💰' },
          banks: { name: 'Banco do Brasil' }
        }
      ],
      categories: [
        { name: 'Alimentação', emoji: '🍕', total: 500, percentage: 16.67 }
      ],
      banks: [
        { name: 'Banco do Brasil', balance: 2000, initialBalance: 1000 }
      ]
    };
    
    const pdf = new jsPDF();
    let yPosition = 20;
    
    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório Financeiro Mensal', 105, yPosition, { align: 'center' });
    yPosition += 15;
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${mockData.month} de ${mockData.year}`, 105, yPosition, { align: 'center' });
    yPosition += 20;
    
    // Summary
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo Financeiro', 20, yPosition);
    yPosition += 15;
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total de Receitas: R$ ${mockData.totalIncome.toFixed(2)}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Total de Despesas: R$ ${mockData.totalExpenses.toFixed(2)}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Saldo do Mês: R$ ${mockData.balance.toFixed(2)}`, 20, yPosition);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, 280, { align: 'center' });
    pdf.text('FinanceApp - Gestão Financeira Pessoal', 105, 290, { align: 'center' });
    
    pdf.save('teste-relatorio.pdf');
    console.log('Teste do serviço simplificado concluído com sucesso');
    
    return true;
  } catch (error) {
    console.error('Erro no teste do serviço simplificado:', error);
    return false;
  }
};

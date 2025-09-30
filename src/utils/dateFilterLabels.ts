/**
 * Utilitário para gerar labels dinâmicos baseados no filtro de período
 */

export interface DateFilter {
  from: Date | undefined;
  to: Date | undefined;
}

export interface PeriodInfo {
  type: 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';
  label: string;
  description: string;
}

/**
 * Analisa um filtro de data e determina o tipo de período
 */
export function analyzeDateFilter(dateFilter: DateFilter | null): PeriodInfo {
  // Se não há filtro, mostra todos os dados
  if (!dateFilter || !dateFilter.from || !dateFilter.to) {
    return {
      type: 'all',
      label: 'até o momento',
      description: 'Todos os dados registrados'
    };
  }

  const from = new Date(dateFilter.from);
  const to = new Date(dateFilter.to);
  
  // Calcular diferença em dias
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Verificar se é o mesmo dia
  if (diffDays === 0) {
    return {
      type: 'day',
      label: 'do dia',
      description: `Dados do dia ${from.toLocaleDateString('pt-BR')}`
    };
  }
  
  // Verificar se é uma semana (7 dias ou menos)
  if (diffDays <= 7) {
    return {
      type: 'week',
      label: 'da semana',
      description: `Dados da semana de ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`
    };
  }
  
  // Verificar se é um mês (30-31 dias)
  if (diffDays <= 31) {
    return {
      type: 'month',
      label: 'do mês',
      description: `Dados do mês de ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`
    };
  }
  
  // Verificar se é um ano (365 dias)
  if (diffDays <= 365) {
    return {
      type: 'year',
      label: 'do ano',
      description: `Dados do ano de ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`
    };
  }
  
  // Período customizado
  return {
    type: 'custom',
    label: 'do período',
    description: `Dados do período de ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')}`
  };
}

/**
 * Gera labels dinâmicos para receitas
 */
export function getReceitasLabels(dateFilter: DateFilter | null) {
  const periodInfo = analyzeDateFilter(dateFilter);
  
  return {
    total: `Total de Receitas ${periodInfo.label}`,
    recebidas: `Receitas Recebidas ${periodInfo.label}`,
    previstas: `Receitas Previstas ${periodInfo.label}`,
    description: periodInfo.description
  };
}

/**
 * Gera labels dinâmicos para despesas
 */
export function getDespesasLabels(dateFilter: DateFilter | null) {
  const periodInfo = analyzeDateFilter(dateFilter);
  
  return {
    total: `Total de Despesas ${periodInfo.label}`,
    pagas: `Despesas Pagas ${periodInfo.label}`,
    pendentes: `Despesas Pendentes ${periodInfo.label}`,
    description: periodInfo.description
  };
}

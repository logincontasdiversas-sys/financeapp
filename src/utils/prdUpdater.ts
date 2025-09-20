/**
 * Sistema automático de atualização do PRD
 * Registra mudanças nas funcionalidades e mantém histórico
 */

export interface PRDUpdate {
  timestamp: string;
  type: 'feature_added' | 'feature_modified' | 'feature_removed' | 'bug_fixed';
  category: 'auth' | 'dashboard' | 'transactions' | 'ui' | 'backend' | 'infrastructure';
  description: string;
  files_changed: string[];
  impact: 'low' | 'medium' | 'high';
  completion_percentage?: number;
}

export class PRDUpdater {
  private static updates: PRDUpdate[] = [];
  
  /**
   * Registra uma nova atualização no sistema
   */
  static addUpdate(update: Omit<PRDUpdate, 'timestamp'>): void {
    const newUpdate: PRDUpdate = {
      ...update,
      timestamp: new Date().toISOString()
    };
    
    this.updates.push(newUpdate);
    console.log(`[PRD UPDATE] ${update.type}: ${update.description}`);
  }

  /**
   * Gera relatório de mudanças para incluir no PRD
   */
  static generateUpdateReport(): string {
    if (this.updates.length === 0) return '';

    const today = new Date().toISOString().split('T')[0];
    const recentUpdates = this.updates.filter(update => 
      update.timestamp.startsWith(today)
    );

    if (recentUpdates.length === 0) return '';

    let report = `\n### 📝 Atualizações Recentes (${today})\n\n`;
    
    const groupedByType = recentUpdates.reduce((acc, update) => {
      if (!acc[update.type]) acc[update.type] = [];
      acc[update.type].push(update);
      return acc;
    }, {} as Record<string, PRDUpdate[]>);

    Object.entries(groupedByType).forEach(([type, updates]) => {
      const typeLabel = this.getTypeLabel(type);
      report += `#### ${typeLabel}\n`;
      
      updates.forEach(update => {
        const impact = update.impact === 'high' ? '🔥' : update.impact === 'medium' ? '⚡' : '📝';
        report += `- ${impact} **${update.category}**: ${update.description}\n`;
        if (update.files_changed.length > 0) {
          report += `  - Arquivos: ${update.files_changed.join(', ')}\n`;
        }
        if (update.completion_percentage) {
          report += `  - Progresso: ${update.completion_percentage}%\n`;
        }
      });
      report += '\n';
    });

    return report;
  }

  /**
   * Atualiza seção específica do PRD
   */
  static updatePRDSection(section: string, content: string): string {
    return `\n#### ${section} - Atualizado em ${new Date().toLocaleDateString('pt-BR')}\n${content}\n`;
  }

  private static getTypeLabel(type: string): string {
    const labels = {
      'feature_added': '✅ Funcionalidades Adicionadas',
      'feature_modified': '🔄 Funcionalidades Modificadas', 
      'feature_removed': '❌ Funcionalidades Removidas',
      'bug_fixed': '🐛 Bugs Corrigidos'
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * Hook para facilitar uso em componentes
   */
  static useInComponent(componentName: string) {
    return {
      recordChange: (description: string, impact: PRDUpdate['impact'] = 'medium') => {
        this.addUpdate({
          type: 'feature_modified',
          category: 'ui',
          description: `${componentName}: ${description}`,
          files_changed: [componentName],
          impact
        });
      }
    };
  }
}

// Helper para registrar mudanças facilmente
export const recordPRDChange = (update: Omit<PRDUpdate, 'timestamp'>) => {
  PRDUpdater.addUpdate(update);
};
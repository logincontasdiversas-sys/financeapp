export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogEntry {
  level: keyof LogLevel;
  component: string;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private formatMessage(level: keyof LogLevel, component: string, message: string, data?: any): LogEntry {
    return {
      level,
      component,
      message,
      data,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId()
    };
  }

  private getCurrentUserId(): string | undefined {
    // Pegar user ID do localStorage/sessionStorage se disponível
    try {
      const authData = localStorage.getItem('sb-cibtvihaydjlsjjfytkt-auth-token');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed?.user?.id;
      }
    } catch {
      // Ignorar erros de parsing
    }
    return undefined;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log no console em desenvolvimento
    if (this.isDevelopment) {
      const consoleMethod = console[entry.level] || console.log;
      consoleMethod(`[${entry.component}] ${entry.message}`, entry.data || '');
    }
  }

  error(component: string, message: string, data?: any) {
    this.addLog(this.formatMessage('ERROR', component, message, data));
  }

  warn(component: string, message: string, data?: any) {
    this.addLog(this.formatMessage('WARN', component, message, data));
  }

  info(component: string, message: string, data?: any) {
    this.addLog(this.formatMessage('INFO', component, message, data));
  }

  debug(component: string, message: string, data?: any) {
    if (this.isDevelopment) {
      this.addLog(this.formatMessage('DEBUG', component, message, data));
    }
  }

  // Obter logs filtrados
  getLogs(level?: keyof LogLevel, component?: string): LogEntry[] {
    return this.logs.filter(log => {
      if (level && log.level !== level) return false;
      if (component && log.component !== component) return false;
      return true;
    });
  }

  // Limpar logs
  clearLogs() {
    this.logs = [];
  }

  // Exportar logs para debug
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
export interface LocalData {
  id: string;
  data: any;
  type: 'transactions' | 'categories' | 'goals' | 'debts' | 'banks' | 'credit_cards';
  operation: 'insert' | 'update' | 'delete';
  status: 'pending' | 'synced' | 'error';
  timestamp: number;
  userId?: string;
  retryCount?: number;
}

class LocalStorageService {
  private readonly STORAGE_KEY = 'finance_app_data';
  private readonly SYNC_QUEUE_KEY = 'finance_app_sync_queue';

  // Salvar dados localmente
  saveData(type: LocalData['type'], id: string, data: any, operation: LocalData['operation'], userId?: string): void {
    const localData: LocalData = {
      id,
      data,
      type,
      operation,
      status: 'pending',
      timestamp: Date.now(),
      userId,
      retryCount: 0
    };

    // Salvar nos dados principais
    const existingData = this.getData();
    const key = `${type}_${id}`;
    existingData[key] = localData;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));

    // Adicionar à fila de sincronização
    this.addToSyncQueue(localData);
  }

  // Obter dados salvos
  getData(): Record<string, LocalData> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  // Obter dados por tipo
  getDataByType(type: LocalData['type'], userId?: string): LocalData[] {
    const allData = this.getData();
    return Object.values(allData).filter(item => 
      item.type === type && 
      (userId ? item.userId === userId : true)
    );
  }

  // Fila de sincronização
  addToSyncQueue(data: LocalData): void {
    const queue = this.getSyncQueue();
    queue.push(data);
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  getSyncQueue(): LocalData[] {
    const queue = localStorage.getItem(this.SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  }

  updateSyncStatus(id: string, type: LocalData['type'], status: LocalData['status'], error?: string): void {
    // Atualizar nos dados principais
    const existingData = this.getData();
    const key = `${type}_${id}`;
    if (existingData[key]) {
      existingData[key].status = status;
      if (status === 'error') {
        existingData[key].retryCount = (existingData[key].retryCount || 0) + 1;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));
    }

    // Atualizar fila de sincronização
    const queue = this.getSyncQueue();
    const queueIndex = queue.findIndex(item => item.id === id && item.type === type);
    if (queueIndex !== -1) {
      if (status === 'synced') {
        queue.splice(queueIndex, 1); // Remove da fila se sincronizado
      } else {
        queue[queueIndex].status = status;
        if (status === 'error') {
          queue[queueIndex].retryCount = (queue[queueIndex].retryCount || 0) + 1;
        }
      }
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  }

  // Limpar dados sincronizados antigos (7 dias)
  cleanSyncedData(): void {
    const data = this.getData();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const filtered = Object.entries(data).reduce((acc, [key, value]) => {
      if (value.status !== 'synced' || value.timestamp > sevenDaysAgo) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, LocalData>);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  // Limpar todos os dados do usuário
  clearUserData(userId: string): void {
    const data = this.getData();
    const filtered = Object.entries(data).reduce((acc, [key, value]) => {
      if (value.userId !== userId) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, LocalData>);

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

    // Limpar fila de sincronização
    const queue = this.getSyncQueue();
    const filteredQueue = queue.filter(item => item.userId !== userId);
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(filteredQueue));
  }

  // Obter estatísticas
  getStats(userId?: string): { pending: number; synced: number; error: number } {
    const data = Object.values(this.getData()).filter(item => 
      userId ? item.userId === userId : true
    );

    return {
      pending: data.filter(item => item.status === 'pending').length,
      synced: data.filter(item => item.status === 'synced').length,
      error: data.filter(item => item.status === 'error').length,
    };
  }
}

export const localStorageService = new LocalStorageService();
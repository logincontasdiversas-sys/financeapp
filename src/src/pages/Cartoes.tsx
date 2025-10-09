import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CreditCard, Pencil, Trash2, Copy, Bell, Gift, ShoppingCart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CardTransactions } from '@/components/dashboard/CardTransactions';
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useSupabaseCards } from "@/hooks/useSupabaseCards";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  current_balance: number;
  available_limit: number;
  brand: string;
  closing_day: number | null;
  due_day: number | null;
  created_at: string;
}

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: string;
  credit_cards?: {
    name: string;
    brand: string;
  };
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

const Cartoes = () => {
  const { user } = useStableAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { createCard, updateCard, deleteCard, fetchCards } = useSupabaseCards();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCardForExpense, setSelectedCardForExpense] = useState<CreditCard | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    limit: "",
    brand: "",
    closing_day: "",
    due_day: "",
  });

  const [expenseFormData, setExpenseFormData] = useState({
    title: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category_id: "",
    description: "",
  });

  // Realtime sync para cartões
  useRealtimeSync({
    table: 'credit_cards',
    onInsert: () => {
      logger.info('CARTOES_REALTIME', 'Novo cartão detectado');
      loadCards();
    },
    onUpdate: () => {
      logger.info('CARTOES_REALTIME', 'Cartão atualizado detectado');
      loadCards();
    },
    onDelete: () => {
      logger.info('CARTOES_REALTIME', 'Cartão removido detectado');
      loadCards();
    },
  });

  // Realtime sync para transações de cartão
  useRealtimeSync({
    table: 'transactions',
    onInsert: (payload) => {
      if (payload.new?.card_id) {
        logger.info('CARTOES_REALTIME', 'Nova transação de cartão detectada');
        loadCardTransactions();
      }
    },
    onUpdate: (payload) => {
      if (payload.new?.card_id || payload.old?.card_id) {
        logger.info('CARTOES_REALTIME', 'Transação de cartão atualizada detectada');
        loadCardTransactions();
      }
    },
    onDelete: (payload) => {
      if (payload.old?.card_id) {
        logger.info('CARTOES_REALTIME', 'Transação de cartão removida detectada');
        loadCardTransactions();
      }
    },
  });

  // Effect principal - executa quando tenantId estiver disponível
  useEffect(() => {
    console.log('[CARTOES_DEBUG] Effect triggered', { 
      user: !!user, 
      tenantId, 
      tenantLoading,
      cards: cards.length 
    });
    
    if (user && tenantId && !tenantLoading) {
      console.log('[CARTOES_DEBUG] Conditions met - loading cards and transactions');
      loadCards();
      loadCardTransactions();
      loadCategories();
    } else {
      console.log('[CARTOES_DEBUG] Conditions NOT met', {
        hasUser: !!user,
        hasTenantId: !!tenantId,
        isNotLoading: !tenantLoading
      });
    }
  }, [user, tenantId, tenantLoading]);

  // Effect separado para controle de loading
  useEffect(() => {
    console.log('[CARTOES_DEBUG] Loading control effect', { tenantLoading, tenantId });
    if (!tenantLoading && !tenantId) {
      console.log('[CARTOES_DEBUG] Setting loading to false - no tenant');
      setLoading(false);
    }
  }, [tenantLoading, tenantId]);

  // Effect para detectar quando a aba volta a ficar ativa (debugging)
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[CARTOES_DEBUG] Visibility changed', { 
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        cards: cards.length,
        tenantId
      });
      
      if (!document.hidden && tenantId && cards.length === 0) {
        console.log('[CARTOES_DEBUG] Tab became active with no cards - reloading');
        loadCards();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cards.length, tenantId]);

  const loadCards = async () => {
    // Só executa se tenantId estiver disponível
    if (!tenantId || !user) {
      console.log('[CARTOES_DEBUG] Skipping loadCards - missing tenantId or user');
      setLoading(false);
      return;
    }

    try {
      setLoading(true); // Garante que loading está ativo
      console.log('[CARTOES_DEBUG] Starting loadCards', { tenantId, user: !!user });
      logger.debug('CARTOES', 'Carregando cartões');
      const data = await fetchCards();
      console.log('[CARTOES_DEBUG] Cards fetched from hook', { count: data.length, data });
      
      // Force uma atualização do estado usando uma nova referência
      setCards([]); // Limpa primeiro
      setTimeout(() => {
        setCards([...data]); // Depois seta com nova referência
        console.log('[CARTOES_DEBUG] Cards state updated', { count: data.length });
      }, 10);
      
      logger.info('CARTOES', 'Cartões carregados com sucesso', { count: data.length });
    } catch (error) {
      console.error('[CARTOES_DEBUG] Error in loadCards', error);
      logger.error('CARTOES', 'Erro ao carregar cartões', { error });
      toast({
        title: "Erro ao carregar cartões",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      console.log('[CARTOES_DEBUG] Setting loading to false');
      setLoading(false);
    }
  };

  const loadCardTransactions = async () => {
    if (!tenantId) return;
    
    try {
      const currentDate = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(currentDate.getMonth() - 1);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          title,
          amount,
          date,
          status,
          card_id,
          credit_cards!fk_transactions_card_id (
            name,
            brand
          )
        `)
        .eq('kind', 'expense')
        .eq('payment_method', 'credit_card')
        .not('card_id', 'is', null)
        .gte('date', lastMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('[CARTOES] Error loading transactions:', error);
    }
  };

  const loadCategories = async () => {
    if (!tenantId) return;
    
    try {
      const response = await supabase
        .from('categories')
        .select('id, name, emoji')
        .eq('tenant_id', tenantId)
        .order('name');
      
      const { data, error } = response;

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('[CARTOES] Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      if (editingCard) {
        await updateCard(editingCard.id, formData);
      } else {
        await createCard(formData);
      }

      setIsDialogOpen(false);
      setEditingCard(null);
      resetForm();
      // Não precisa mais chamar loadCards() manualmente - o realtime sync fará isso
    } catch (error: any) {
      logger.error('CARTOES', 'Erro ao salvar cartão', { error });
      toast({
        title: "Erro ao salvar cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId || !selectedCardForExpense) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            title: expenseFormData.title,
            amount: parseFloat(expenseFormData.amount),
            date: expenseFormData.date,
            category_id: expenseFormData.category_id || null,
            description: expenseFormData.description || null,
            kind: 'expense',
            payment_method: 'credit_card',
            card_id: selectedCardForExpense.id,
            status: 'pending',
            tenant_id: tenantId,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Despesa criada com sucesso!",
        description: `Despesa de ${formatCurrency(parseFloat(expenseFormData.amount))} adicionada ao cartão ${selectedCardForExpense.name}`,
      });

      setIsExpenseDialogOpen(false);
      setSelectedCardForExpense(null);
      resetExpenseForm();
      loadCardTransactions();
    } catch (error: any) {
      logger.error('CARTOES', 'Erro ao criar despesa', { error });
      toast({
        title: "Erro ao criar despesa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      limit: card.limit_amount.toString(),
      brand: card.brand,
      closing_day: card.closing_day?.toString() || "",
      due_day: card.due_day?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (card: CreditCard) => {
    setEditingCard(null);
    setFormData({
      name: `${card.name} (Cópia)`,
      limit: card.limit_amount.toString(),
      brand: card.brand,
      closing_day: card.closing_day?.toString() || "",
      due_day: card.due_day?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const success = await deleteCard(id, name);
      // Não precisa mais chamar loadCards() manualmente - o realtime sync fará isso
    } catch (error: any) {
      logger.error('CARTOES', 'Erro ao excluir cartão', { error, id });
      toast({
        title: "Erro ao excluir cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} cartão(ões)?`)) return;

    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      toast({ title: `${selectedItems.length} cartão(ões) excluído(s) com sucesso!` });
      setSelectedItems([]);
      // Não precisa mais chamar loadCards() manualmente - o realtime sync fará isso
    } catch (error: any) {
      console.error('[CARTOES] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir cartões",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(cards.map(c => c.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      limit: "",
      brand: "",
      closing_day: "",
      due_day: "",
    });
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      title: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category_id: "",
      description: "",
    });
  };

  const openExpenseDialog = (card: CreditCard) => {
    setSelectedCardForExpense(card);
    setIsExpenseDialogOpen(true);
    resetExpenseForm();
  };

  // Easter Egg - 5 cliques no logo do cartão
  const handleLogoClick = (cardId: string) => {
    setLogoClickCount(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        setShowEasterEgg(true);
        logger.info('CARTOES_EASTER_EGG', 'Easter egg ativado!', { cardId });
        toast({
          title: "🎉 Easter Egg Descoberto!",
          description: "Você desbloqueou a animação especial dos cartões!",
        });
        setTimeout(() => setShowEasterEgg(false), 3000);
        return 0; // Reset counter
      }
      return newCount;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getAvailableLimit = (card: CreditCard) => {
    return card.available_limit || card.limit_amount;
  };

  const filterTransactionsByMonth = (month: 'current' | 'previous') => {
    const currentDate = new Date();
    const targetMonth = month === 'current' ? currentDate.getMonth() : currentDate.getMonth() - 1;
    const targetYear = month === 'current' ? currentDate.getFullYear() : 
                      (currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear());

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === targetMonth && 
             transactionDate.getFullYear() === targetYear;
    });
  };

  // Renderiza loading enquanto ainda está carregando dados ou tenantId
  if (loading || tenantLoading || (!tenantId && !tenantLoading)) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="space-y-2 text-center">
          <div>Carregando cartões...</div>
          <div className="text-sm text-muted-foreground">
            {tenantLoading ? "Configurando conta..." : "Buscando dados..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Cartões de Crédito</h2>
          <p className="text-muted-foreground">
            Gerencie seus cartões de crédito e despesas
          </p>
        </div>
        
        <div className="flex gap-2">
          {cards.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.length === cards.length && cards.length > 0}
                onCheckedChange={handleSelectAll}
                className="bg-background border-primary"
              />
              <Label className="text-sm font-medium cursor-pointer">
                Selecionar Todos ({cards.length})
              </Label>
            </div>
          )}
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionados ({selectedItems.length})
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCard(null); }} className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCard ? "Editar Cartão" : "Novo Cartão"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Cartão</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Nubank Roxinho, Itaú 2.0..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Limite do Cartão</Label>
                  <Input
                    id="limit"
                    type="number"
                    step="0.01"
                    value={formData.limit}
                    onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="brand">Bandeira</Label>
                   <Select
                     value={formData.brand}
                     onValueChange={(value) => setFormData({ ...formData, brand: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione a bandeira" />
                     </SelectTrigger>
                     <SelectContent className="overflow-y-auto">
                       <SelectItem value="Visa">Visa</SelectItem>
                       <SelectItem value="Mastercard">Mastercard</SelectItem>
                       <SelectItem value="Elo">Elo</SelectItem>
                       <SelectItem value="American Express">American Express</SelectItem>
                       <SelectItem value="Hipercard">Hipercard</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="closing_day">Dia Fechamento</Label>
                     <Input
                       id="closing_day"
                       type="number"
                       min="1"
                       max="31"
                       value={formData.closing_day}
                       onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                       placeholder="Ex: 15"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="due_day">Dia Vencimento</Label>
                     <Input
                       id="due_day"
                       type="number"
                       min="1"
                       max="31"
                       value={formData.due_day}
                       onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                       placeholder="Ex: 25"
                     />
                   </div>
                 </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                  {editingCard ? "Atualizar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.id} className="bg-gradient-card border-0 shadow-sm relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedItems.includes(card.id)}
                onCheckedChange={(checked) => handleSelectItem(card.id, checked as boolean)}
                className="bg-background border-primary"
              />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-8">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <div 
                  ref={logoRef}
                  className={`cursor-pointer transition-transform duration-300 ${
                    showEasterEgg ? 'animate-spin' : 'hover:scale-110'
                  }`}
                  onClick={() => handleLogoClick(card.id)}
                >
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                {card.name}
                {card.due_day && (
                  <div className="relative">
                    <Bell className="h-3 w-3 text-warning animate-pulse" />
                    <span className="sr-only">Vencimento dia {card.due_day}</span>
                  </div>
                )}
              </CardTitle>
               <div className="flex gap-1">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => openExpenseDialog(card)}
                   className="h-8 w-8 p-0 text-primary hover:text-primary"
                   title="Adicionar despesa"
                 >
                   <ShoppingCart className="h-3 w-3" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleEdit(card)}
                   className="h-8 w-8 p-0"
                 >
                   <Pencil className="h-3 w-3" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleDuplicate(card)}
                   className="h-8 w-8 p-0"
                 >
                   <Copy className="h-3 w-3" />
                 </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(card.id, card.name)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
               </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {card.brand}
                </p>
                 <div className="space-y-1">
                   <div className="flex justify-between text-sm">
                     <span>Limite Total:</span>
                     <span className="font-medium">{formatCurrency(card.limit_amount)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span>Usado:</span>
                     <span className="font-medium text-destructive">{formatCurrency(card.current_balance || 0)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span>Disponível:</span>
                     <span className="font-medium text-success">{formatCurrency(getAvailableLimit(card))}</span>
                   </div>
                   {card.due_day && (
                     <div className="flex justify-between text-sm">
                       <span>Vencimento:</span>
                       <span className="font-medium text-warning">Dia {card.due_day}</span>
                     </div>
                   )}
                   {card.closing_day && (
                     <div className="flex justify-between text-sm">
                       <span>Fechamento:</span>
                       <span className="font-medium">Dia {card.closing_day}</span>
                     </div>
                   )}
                 </div>
                 {card.due_day && (
                   <div className="mt-2 p-2 bg-warning/10 rounded text-xs text-warning">
                     💡 Dica: Pague a fatura antes do vencimento para evitar juros!
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cards.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cartão cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Cadastre seus cartões de crédito para ter controle total dos gastos
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Cartão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para adicionar despesa no cartão */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Adicionar Despesa - {selectedCardForExpense?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-title">Título da Despesa</Label>
              <Input
                id="expense-title"
                value={expenseFormData.title}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                placeholder="Ex: Compra no supermercado"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Valor</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Data</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoria</Label>
              <Select
                value={expenseFormData.category_id}
                onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="overflow-y-auto">
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.emoji} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">Descrição (opcional)</Label>
              <Textarea
                id="expense-description"
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                placeholder="Detalhes adicionais da despesa..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsExpenseDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90">
                Adicionar Despesa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movimentações por cartão */}
      {cards.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Movimentações por Cartão</h2>
          {cards.map((card) => (
            <CardTransactions 
              key={card.id} 
              cardId={card.id} 
              cardName={card.name} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Cartoes;
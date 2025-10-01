import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CreditCard, CheckCircle, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import { useAutoCleanup } from "@/hooks/useAutoCleanup";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface Debt {
  id: string;
  title: string;
  total_amount: number;
  paid_amount: number;
  current_amount: number | null;
  due_date: string | null;
  monthly_interest: number;
  settled: boolean;
  image_url: string | null;
  category_id: string | null;
  special_category_id: string | null;
  observations: string | null;
  is_concluded: boolean;
  categories?: {
    name: string;
    emoji: string;
  } | null;
  special_categories?: {
    name: string;
    emoji: string;
  } | null;
}


const Dividas = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { cleanupAfterDelete } = useAutoCleanup();
  
  // Sincronização em tempo real para dívidas
  useRealtimeSync('debts', tenantId, () => {
    console.log('[DIVIDAS] Sincronização em tempo real - recarregando dívidas');
    loadDebts();
  });
  const [debts, setDebts] = useState<Debt[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    total_amount: "",
    current_amount: "",
    due_date: "",
    monthly_interest: "",
    image_url: "",
    observations: "",
    is_concluded: false,
    category_id: "",
  });

  useEffect(() => {
    if (user && tenantId) {
      loadDebts();
      loadCategories();
    }
  }, [user, tenantId]);

  const loadDebts = async () => {
    if (!tenantId) {
      console.log('[DIVIDAS] ⏳ Aguardando tenantId...');
      return;
    }
    
    try {
      console.log('[DIVIDAS] 🔄 Carregando dívidas com tenantId:', tenantId);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('settled', { ascending: true })
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Buscar categorias separadamente se existirem debts com category_id
      let debtsWithCategories = data || [];
      if (data && data.length > 0) {
        const categoryIds = data
          .map(debt => debt.category_id)
          .filter(Boolean);

        if (categoryIds.length > 0) {
          const { data: categoriesData } = await supabase
            .from('categories')
            .select('id, name, emoji')
            .eq('tenant_id', tenantId)
            .in('id', categoryIds);

          debtsWithCategories = data.map(debt => ({
            ...debt,
            categories: categoriesData?.find(cat => cat.id === debt.category_id) || null
          }));
        }
      }

      console.log('[DIVIDAS] ✅ Dívidas carregadas com sucesso:', debtsWithCategories?.length || 0, 'itens');
      
      setDebts(debtsWithCategories);
    } catch (error) {
      console.error('[DIVIDAS] Error loading:', error);
      toast({
        title: "Erro ao carregar dívidas",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!tenantId) {
      console.log('[DIVIDAS] ⏳ Aguardando tenantId para carregar categorias...');
      return;
    }
    
    try {
      console.log('[DIVIDAS] 🔄 Carregando categorias com tenantId:', tenantId);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('archived', false)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      console.log('[DIVIDAS] ✅ Categorias carregadas:', data?.length || 0, 'itens');
      setCategories(data || []);
    } catch (error) {
      console.error('[DIVIDAS] Error loading categories:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      // Verificar se a categoria especial já existe ou criar uma nova
      const specialCategoryName = `Dívida - ${formData.title}`;
      
      // Primeiro, tentar buscar a categoria existente
      let { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', specialCategoryName)
        .eq('tenant_id', tenantId)
        .single();

      let specialCategory = existingCategory;

      // Se não existir, criar uma nova
      if (!existingCategory) {
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: specialCategoryName,
            emoji: '💳',
            is_system: true,
            tenant_id: tenantId,
            archived: false
          })
          .select()
          .single();

        if (categoryError) throw categoryError;
        specialCategory = newCategory;
      }

      const debtData = {
        title: formData.title,
        total_amount: parseFloat(formData.total_amount),
        current_amount: formData.current_amount ? parseFloat(formData.current_amount) : null,
        due_date: formData.due_date || null,
        monthly_interest: parseFloat(formData.monthly_interest) || 0,
        category_id: formData.category_id || null, // Categoria padrão
        special_category_id: specialCategory.id, // Categoria especial
        image_url: formData.image_url || null,
        observations: formData.observations || null,
        is_concluded: formData.is_concluded,
        user_id: user.id,
        tenant_id: tenantId,
      };

      if (editingDebt) {
        const { error } = await supabase
          .from('debts')
          .update(debtData)  
          .eq('id', editingDebt.id);

        if (error) throw error;
        toast({ title: "Dívida atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('debts')
          .insert(debtData);

        if (error) throw error;
        toast({ title: "Dívida criada com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingDebt(null);
      resetForm();
      clearQueryCache();
      loadDebts();
    } catch (error: any) {
      console.error('[DIVIDAS] Error saving:', error);
      toast({
        title: "Erro ao salvar dívida",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      title: debt.title,
      total_amount: debt.total_amount.toString(),
      current_amount: debt.current_amount ? debt.current_amount.toString() : "",
      due_date: debt.due_date || "",
      monthly_interest: debt.monthly_interest.toString(),
      image_url: debt.image_url || "",
      observations: debt.observations || "",
      is_concluded: debt.is_concluded || false,
      category_id: debt.category_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (debt: Debt) => {
    setEditingDebt(null);
    setFormData({
      title: `${debt.title} (Cópia)`,
      total_amount: debt.total_amount.toString(),
      current_amount: debt.current_amount ? debt.current_amount.toString() : "",
      due_date: debt.due_date || "",
      monthly_interest: debt.monthly_interest.toString(),
      image_url: debt.image_url || "",
      observations: debt.observations || "",
      is_concluded: false, // Reset para false na cópia
      category_id: debt.category_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    console.log('[DEBUG] ===== FUNÇÃO handleDelete CHAMADA =====');
    console.log('[DEBUG] ID recebido:', id);
    
    if (!confirm("Tem certeza que deseja excluir esta dívida? Isso também excluirá todas as transações vinculadas a ela.")) {
      console.log('[DEBUG] Usuário cancelou a exclusão');
      return;
    }
    
    console.log('[DEBUG] Usuário confirmou a exclusão, prosseguindo...');

    try {
      console.log('[DEBUG] ===== INICIANDO EXCLUSÃO DE DÍVIDA =====');
      console.log('[DEBUG] ID da dívida:', id);
      
      // 1. PRIMEIRO: Buscar dados da dívida
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .select('special_category_id, category_id, title')
        .eq('id', id)
        .single();

      if (debtError) {
        console.error('[DEBUG] Erro ao buscar dados da dívida:', debtError);
        throw debtError;
      }

      console.log('[DEBUG] Dados da dívida encontrados:', debtData);

      // 2. EXCLUIR TRANSAÇÕES POR SUBCATEGORIA (se existir)
      if (debtData?.special_category_id) {
        console.log('[DEBUG] Excluindo transações por subcategoria:', debtData.special_category_id);
        
        const { error: subcategoryDeleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('category_id', debtData.special_category_id);

        if (subcategoryDeleteError) {
          console.error('[DEBUG] Erro ao excluir transações por subcategoria:', subcategoryDeleteError);
        } else {
          console.log('[DEBUG] Transações excluídas com sucesso (por subcategoria)');
        }
      }

      // 3. EXCLUIR TRANSAÇÕES POR DEBT_ID (fallback)
      console.log('[DEBUG] Tentando excluir transações por debt_id como fallback...');
      const { error: debtIdDeleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('debt_id', id);

      if (debtIdDeleteError) {
        console.log('[DEBUG] Campo debt_id não existe ou não há transações:', debtIdDeleteError.message);
      } else {
        console.log('[DEBUG] Transações excluídas com sucesso (por debt_id)');
      }

      // 4. EXCLUIR TRANSAÇÕES POR CATEGORIA PAI (fallback adicional)
      if (debtData?.category_id) {
        console.log('[DEBUG] Tentando excluir transações por categoria pai como fallback adicional...');
        
        // Buscar transações da categoria pai que podem estar relacionadas
        const { data: categoryTransactions } = await supabase
          .from('transactions')
          .select('id, title, category_id')
          .eq('category_id', debtData.category_id);

        if (categoryTransactions && categoryTransactions.length > 0) {
          console.log('[DEBUG] Transações encontradas na categoria pai:', categoryTransactions.length);
          
          // Filtrar apenas transações que parecem ser desta dívida
          const filteredTransactions = categoryTransactions.filter(transaction => {
            const debtTitle = debtData.title.toLowerCase();
            const transactionTitle = transaction.title.toLowerCase();
            const debtKeywords = debtTitle.split(' ').filter(word => word.length > 2);
            return debtKeywords.some(keyword => transactionTitle.includes(keyword));
          });

          console.log('[DEBUG] Transações filtradas para esta dívida:', filteredTransactions.length);
          
          if (filteredTransactions.length > 0) {
            const { error: filteredDeleteError } = await supabase
              .from('transactions')
              .delete()
              .in('id', filteredTransactions.map(t => t.id));

            if (filteredDeleteError) {
              console.error('[DEBUG] Erro ao excluir transações filtradas:', filteredDeleteError);
            } else {
              console.log('[DEBUG] Transações filtradas excluídas com sucesso');
            }
          }
        }
      }

      // 3. Excluir a dívida
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Se a dívida tinha uma categoria personalizada, excluir também
      if (debtData?.category_id) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', debtData.category_id)
          .eq('is_system', true); // Só remover se for categoria automática
      }

      // Executar limpeza automática de categorias não utilizadas
      await cleanupAfterDelete();

      toast({ title: "Dívida excluída com sucesso!" });
      clearQueryCache();
      loadDebts();
    } catch (error: any) {
      console.error('[DIVIDAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir dívida",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} dívida(s)?`)) return;

    try {
      // Buscar as dívidas selecionadas para obter os category_ids
      const { data: debtsData } = await supabase
        .from('debts')
        .select('category_id')
        .in('id', selectedItems);

      // Excluir as dívidas
      const { error } = await supabase
        .from('debts')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      // Excluir categorias personalizadas associadas
      if (debtsData && debtsData.length > 0) {
        const categoryIds = debtsData
          .map(debt => debt.category_id)
          .filter(Boolean);

        if (categoryIds.length > 0) {
          await supabase
            .from('categories')
            .delete()
            .in('id', categoryIds)
            .eq('is_system', true); // Só remover se for categoria automática
        }
      }

      toast({ title: `${selectedItems.length} dívida(s) excluída(s) com sucesso!` });
      setSelectedItems([]);
      clearQueryCache();
      loadDebts();
    } catch (error: any) {
      console.error('[DIVIDAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir dívidas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(activeDebts.map(d => d.id));
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
      title: "",
      total_amount: "",
      current_amount: "",
      due_date: "",
      monthly_interest: "",
      image_url: "",
      observations: "",
      is_concluded: false,
      category_id: "",
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

  const getProgress = (paid: number, total: number) => {
    return Math.min((paid / total) * 100, 100);
  };

  const activeDebts = debts.filter(debt => !debt.settled && !debt.is_concluded);
  const settledDebts = debts.filter(debt => debt.settled || debt.is_concluded);

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dívidas</h2>
          <p className="text-muted-foreground">
            Gerencie e acompanhe suas dívidas
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeDebts.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.length === activeDebts.length && activeDebts.length > 0}
                onCheckedChange={handleSelectAll}
                className="bg-background border-primary"
              />
              <Label className="text-sm font-medium cursor-pointer" onClick={() => handleSelectAll(selectedItems.length !== activeDebts.length)}>
                Selecionar Todos ({activeDebts.length})
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
            <Button onClick={() => { resetForm(); setEditingDebt(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Dívida
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDebt ? "Editar Dívida" : "Nova Dívida"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Cartão de crédito"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Valor Total</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_amount">Valor Atual (opcional)</Label>
                <Input
                  id="current_amount"
                  type="number"
                  step="0.01"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  placeholder="Valor atual da dívida"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento (opcional)</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_interest">Taxa de Juros Mensal (%)</Label>
                <Input
                  id="monthly_interest"
                  type="number"
                  step="0.01"
                  value={formData.monthly_interest}
                  onChange={(e) => setFormData({ ...formData, monthly_interest: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => {
                        // Filtrar apenas categorias padrões (não especiais)
                        const name = cat.name.toLowerCase();
                        return (
                          !cat.is_system && 
                          !name.includes(' - fatura') && // Excluir faturas de cartão
                          !name.includes(' - dívida') && // Excluir categorias de dívidas antigas
                          !name.includes(' - meta') && // Excluir categorias de metas antigas
                          !name.startsWith('dívida -') && // Excluir categorias que começam com "Dívida -"
                          !name.startsWith('meta -') // Excluir categorias que começam com "Meta -"
                        );
                      })
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <span className="flex items-center gap-2">
                            <span>{category.emoji}</span>
                            <span>{category.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💡 Categoria onde os pagamentos desta dívida serão contabilizados
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem (opcional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observações (opcional)</Label>
                <textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Ex: Negociação com credor, acordo de pagamento, etc."
                  className="w-full min-h-[80px] px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_concluded"
                  checked={formData.is_concluded}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_concluded: checked as boolean })}
                />
                <Label htmlFor="is_concluded" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Dívida concluída (quitação sem valores)
                </Label>
              </div>
              {formData.is_concluded && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    💡 Marque esta opção quando a dívida foi quitada através de negociação externa, 
                    acordo com credor ou qualquer forma que não envolva pagamento de valores.
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingDebt ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Active Debts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeDebts.map((debt) => (
          <Card key={debt.id} className="relative border-red-200">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedItems.includes(debt.id)}
                onCheckedChange={(checked) => handleSelectItem(debt.id, checked as boolean)}
                className="bg-background border-primary"
              />
            </div>
            <CardHeader className="pb-3 pt-8">
              {debt.image_url && (
                <div className="h-32 w-full mb-3 bg-cover bg-center rounded-md" 
                     style={{ backgroundImage: `url(${debt.image_url})` }} />
              )}
              {/* Ações em linha separada */}
              <div className="flex justify-end gap-1 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(debt)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(debt)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(debt.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Título em linha inteira */}
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                <CardTitle className="text-base">{debt.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Pago: {formatCurrency(debt.paid_amount)}</span>
                  <span>Total: {formatCurrency(debt.total_amount)}</span>
                </div>
                {debt.current_amount && debt.current_amount > 0 && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Desconto: {formatCurrency(debt.current_amount)} → Efetivo: {formatCurrency(debt.total_amount - debt.current_amount)}
                  </div>
                )}
                <Progress value={getProgress(debt.paid_amount + (debt.current_amount || 0), debt.total_amount)} className="bg-red-100 h-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {getProgress(debt.paid_amount + (debt.current_amount || 0), debt.total_amount).toFixed(1)}% quitado
                  </span>
                  <span className="text-red-600 font-semibold">
                    Restam: {formatCurrency(debt.total_amount - debt.paid_amount - (debt.current_amount || 0))}
                  </span>
                </div>
              </div>
              
              {debt.categories && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{debt.categories.emoji} {debt.categories.name}</span>
                </div>
              )}
              
              {debt.due_date && (
                <div className="text-xs text-muted-foreground">
                  Vence: {formatDate(debt.due_date)}
                </div>
              )}
              
              {debt.monthly_interest > 0 && (
                <div className="text-xs text-red-500">
                  Juros: {debt.monthly_interest}% a.m.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settled Debts */}
      {settledDebts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Dívidas Quitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settledDebts.map((debt) => {
                const isConcluded = debt.is_concluded;
                const progress = isConcluded ? 100 : getProgress(debt.paid_amount + (debt.current_amount || 0), debt.total_amount);
                
                return (
                  <div key={debt.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isConcluded 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`h-5 w-5 ${isConcluded ? 'text-blue-600' : 'text-green-600'}`} />
                      <div>
                        <h4 className={`font-medium ${isConcluded ? 'text-blue-800' : 'text-green-800'}`}>
                          {debt.title}
                        </h4>
                        <p className={`text-sm ${isConcluded ? 'text-blue-600' : 'text-green-600'}`}>
                          {formatCurrency(debt.total_amount)}
                          {debt.categories && ` • ${debt.categories.emoji} ${debt.categories.name}`}
                          {isConcluded && ' • Quitada sem valores'}
                        </p>
                        {debt.observations && (
                          <p className={`text-xs mt-1 italic ${isConcluded ? 'text-blue-600' : 'text-green-600'}`}>
                            💬 {debt.observations}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${isConcluded ? 'text-blue-800' : 'text-green-800'}`}>
                          {progress.toFixed(0)}%
                        </div>
                        <Progress value={progress} className="w-16 h-2" />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(debt)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(debt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {debts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma dívida cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece gerenciando suas dívidas
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira dívida
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dividas;
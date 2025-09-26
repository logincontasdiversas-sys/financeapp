import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Target, CheckCircle, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import { useAutoCleanup } from "@/hooks/useAutoCleanup";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  completed: boolean;
  image_url: string | null;
  category_id: string | null;
  special_category_id: string | null;
  categories?: {
    name: string;
    emoji: string;
  } | null;
  special_categories?: {
    name: string;
    emoji: string;
  } | null;
}


const Metas = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { cleanupAfterDelete } = useAutoCleanup();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    current_amount: "",
    target_date: "",
    image_url: "",
    category_id: "",
  });

  useEffect(() => {
    if (user && tenantId) {
      loadGoals();
      loadCategories();
    }
  }, [user, tenantId]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('completed', { ascending: true })
        .order('target_date', { ascending: true });

      if (error) throw error;

      // Buscar categorias separadamente se existirem goals com category_id
      let goalsWithCategories = data || [];
      if (data && data.length > 0) {
        const categoryIds = data
          .map(goal => goal.category_id)
          .filter(Boolean);

        if (categoryIds.length > 0) {
          const { data: categoriesData } = await supabase
            .from('categories')
            .select('id, name, emoji')
            .in('id', categoryIds);

          goalsWithCategories = data.map(goal => ({
            ...goal,
            categories: categoriesData?.find(cat => cat.id === goal.category_id) || null
          }));
        }
      }

      setGoals(goalsWithCategories);
    } catch (error) {
      console.error('[METAS] Error loading:', error);
      toast({
        title: "Erro ao carregar metas",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('archived', false)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      // Verificar se a categoria especial já existe ou criar uma nova
      const specialCategoryName = `Meta - ${formData.title}`;
      
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
            emoji: '🎯',
            is_system: true,
            tenant_id: tenantId,
            archived: false
          })
          .select()
          .single();

        if (categoryError) throw categoryError;
        specialCategory = newCategory;
      }

      const goalData = {
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        target_date: formData.target_date || null,
        category_id: formData.category_id || null, // Categoria padrão
        special_category_id: specialCategory.id, // Categoria especial
        image_url: formData.image_url || null,
        user_id: user.id,
        tenant_id: tenantId,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)  
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast({ title: "Meta atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('goals')
          .insert(goalData);

        if (error) throw error;
        toast({ title: "Meta criada com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingGoal(null);
      resetForm();
      clearQueryCache();
      loadGoals();
    } catch (error: any) {
      console.error('[METAS] Error saving:', error);
      toast({
        title: "Erro ao salvar meta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      target_date: goal.target_date || "",
      image_url: goal.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (goal: Goal) => {
    setEditingGoal(null);
    setFormData({
      title: `${goal.title} (Cópia)`,
      target_amount: goal.target_amount.toString(),
      current_amount: "0", // Reset current amount for duplicate
      target_date: goal.target_date || "",
      image_url: goal.image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    try {
      // Buscar a meta para obter o category_id antes de excluir
      const { data: goalData } = await supabase
        .from('goals')
        .select('category_id')
        .eq('id', id)
        .single();

      // Excluir a meta
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Se a meta tinha uma categoria personalizada, excluir também
      if (goalData?.category_id) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', goalData.category_id)
          .eq('is_system', true); // Só remover se for categoria automática
      }

      // Executar limpeza automática de categorias não utilizadas
      await cleanupAfterDelete();

      toast({ title: "Meta excluída com sucesso!" });
      clearQueryCache();
      loadGoals();
    } catch (error: any) {
      console.error('[METAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir meta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} meta(s)?`)) return;

    try {
      // Buscar as metas selecionadas para obter os category_ids
      const { data: goalsData } = await supabase
        .from('goals')
        .select('category_id')
        .in('id', selectedItems);

      // Excluir as metas
      const { error } = await supabase
        .from('goals')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;

      // Excluir categorias personalizadas associadas
      if (goalsData && goalsData.length > 0) {
        const categoryIds = goalsData
          .map(goal => goal.category_id)
          .filter(Boolean);

        if (categoryIds.length > 0) {
          await supabase
            .from('categories')
            .delete()
            .in('id', categoryIds)
            .eq('is_system', true); // Só remover se for categoria automática
        }
      }

      toast({ title: `${selectedItems.length} meta(s) excluída(s) com sucesso!` });
      setSelectedItems([]);
      clearQueryCache();
      loadGoals();
    } catch (error: any) {
      console.error('[METAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir metas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(activeGoals.map(g => g.id));
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
      target_amount: "",
      current_amount: "",
      target_date: "",
      image_url: "",
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

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const activeGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Metas</h2>
          <p className="text-muted-foreground">
            Defina e acompanhe seus objetivos financeiros
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeGoals.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedItems.length === activeGoals.length && activeGoals.length > 0}
                onCheckedChange={handleSelectAll}
                className="bg-background border-primary"
              />
              <Label className="text-sm font-medium cursor-pointer" onClick={() => handleSelectAll(selectedItems.length !== activeGoals.length)}>
                Selecionar Todos ({activeGoals.length})
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
            <Button onClick={() => { resetForm(); setEditingGoal(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? "Editar Meta" : "Nova Meta"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Comprar um carro"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_amount">Valor da Meta</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
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
                  placeholder="Ex: Valor do carro atual para troca"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Valor que você já possui para esta meta (ex: carro atual, dinheiro guardado, etc.)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => 
                        !cat.is_system && 
                        !cat.name.startsWith('Dívida -') && 
                        !cat.name.startsWith('Meta -') &&
                        !cat.name.includes('Dívida -') &&
                        !cat.name.includes('Meta -')
                      )
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
                  💡 Categoria onde os gastos desta meta serão contabilizados
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_date">Data Alvo (opcional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
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
              <Button type="submit" className="w-full">
                {editingGoal ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Active Goals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeGoals.map((goal) => (
          <Card key={goal.id} className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedItems.includes(goal.id)}
                onCheckedChange={(checked) => handleSelectItem(goal.id, checked as boolean)}
                className="bg-background border-primary"
              />
            </div>
            <CardHeader className="pb-3 pt-8">
              {goal.image_url && (
                <div className="h-32 w-full mb-3 bg-cover bg-center rounded-md" 
                     style={{ backgroundImage: `url(${goal.image_url})` }} />
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                </div>
                 <div className="flex gap-1">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleEdit(goal)}
                   >
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleDuplicate(goal)}
                   >
                     <Copy className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleDelete(goal.id)}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Atual: {formatCurrency(goal.current_amount)}</span>
                  <span>Meta: {formatCurrency(goal.target_amount)}</span>
                </div>
                <Progress value={getProgress(goal.current_amount, goal.target_amount)} />
                <div className="text-center text-sm text-muted-foreground">
                  {getProgress(goal.current_amount, goal.target_amount).toFixed(1)}% concluído
                </div>
                <div className="text-sm text-blue-600 font-semibold">
                  Faltam: {formatCurrency(goal.target_amount - goal.current_amount)}
                </div>
              </div>
              
              {goal.categories && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{goal.categories.emoji} {goal.categories.name}</span>
                </div>
              )}
              
              {goal.target_date && (
                <div className="text-sm text-muted-foreground">
                  Meta para: {formatDate(goal.target_date)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Metas Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">{goal.title}</h4>
                      <p className="text-sm text-green-600">
                        {formatCurrency(goal.target_amount)}
                        {goal.categories && ` • ${goal.categories.emoji} ${goal.categories.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma meta cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Comece definindo seus objetivos financeiros
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira meta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Metas;
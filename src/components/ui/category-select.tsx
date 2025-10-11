import React, { useState, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  emoji: string;
  is_system?: boolean;
}

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  categories: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  showCreateOption?: boolean;
  showInvoiceCategories?: boolean;
  goals?: Array<{ id: string; title: string; current_amount: number }>;
  debts?: Array<{ id: string; title: string; paid_amount: number }>;
  showSubcategories?: boolean; // Novo: mostrar subcategorias apenas para dívidas
  isDebtPayment?: boolean; // Novo: identificar se é pagamento de dívida
  parentCategoryId?: string; // Novo: ID da categoria pai para filtrar subcategorias
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onValueChange,
  placeholder = "Selecione uma categoria",
  categories,
  onCategoriesChange,
  showCreateOption = true,
  showInvoiceCategories = true,
  goals = [],
  debts = [],
  showSubcategories = false,
  isDebtPayment = false,
  parentCategoryId
}) => {
  // Debug para valores de dívida
  useEffect(() => {
    if (value && value.startsWith('debt-')) {
      console.log('[CATEGORY_SELECT] Valor de dívida recebido:', {
        value,
        debtId: value.replace('debt-', ''),
        debts: debts.length,
        matchingDebt: debts.find(d => d.id === value.replace('debt-', ''))
      });
    }
  }, [value, debts]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');
  const [isCreating, setIsCreating] = useState(false);
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { tenantId } = useTenant();
  const { toast } = useToast();

  // Logs para debug
  console.log('[CATEGORY_SELECT] Props recebidas:', {
    value,
    showSubcategories,
    isDebtPayment,
    parentCategoryId,
    categoriesCount: categories.length,
    goalsCount: goals.length,
    debtsCount: debts.length,
    categories: categories.map(c => ({ id: c.id, name: c.name, is_system: c.is_system }))
  });

  // Verificar duplicatas nas categorias recebidas
  useEffect(() => {
    const duplicates = categories.reduce((acc, cat, index) => {
      const key = `${cat.name}-${cat.id}`;
      if (acc.has(key)) {
        console.warn('[CATEGORY_SELECT] Categoria duplicada encontrada:', {
          name: cat.name,
          id: cat.id,
          index,
          previousIndex: acc.get(key)
        });
      } else {
        acc.set(key, index);
      }
      return acc;
    }, new Map());

    // Verificar duplicatas por nome (mesmo nome, IDs diferentes)
    const nameGroups = categories.reduce((acc, cat) => {
      if (!acc.has(cat.name)) {
        acc.set(cat.name, []);
      }
      acc.get(cat.name)!.push(cat);
      return acc;
    }, new Map<string, Category[]>());

    nameGroups.forEach((cats, name) => {
      if (cats.length > 1) {
        console.warn('[CATEGORY_SELECT] Categorias com mesmo nome:', {
          name,
          count: cats.length,
          ids: cats.map(c => c.id)
        });
      }
    });
  }, [categories]);

  const handleCreateCategory = useCallback(async () => {
    if (!tenantId || !newCategoryName.trim()) return;

    setIsCreating(true);
    try {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
          tenant_id: tenantId,
          archived: false
        })
        .select()
        .single();

      if (error) throw error;

      const updatedCategories = [...categories, newCategory];
      onCategoriesChange?.(updatedCategories);
      onValueChange(newCategory.id);
      
      toast({ title: "Categoria criada com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewCategoryName('');
      setNewCategoryEmoji('📦');
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [tenantId, newCategoryName, newCategoryEmoji, categories, onCategoriesChange, onValueChange, toast]);

  // Filtrar categorias que são especiais (criadas automaticamente para metas/dívidas)
  const isSpecialCategory = (category: any) => {
    const name = category.name.toLowerCase();
    const isSpecial = (
      name.includes('dívida -') ||
      name.includes('meta -') ||
      name.includes(' - dívida') ||
      name.includes(' - meta') ||
      name.startsWith('dívida ') ||
      name.startsWith('meta ') ||
      name.includes('empréstimo - cristian') ||
      name.includes('beto carrero') ||
      name.includes('vw tiguan')
    );
    
    return isSpecial;
  };

  // Função para remover duplicatas
  const removeDuplicates = (categories: Category[]): Category[] => {
    const seen = new Set<string>();
    const unique = categories.filter(cat => {
      const key = `${cat.name}-${cat.id}`;
      if (seen.has(key)) {
        console.warn('[CATEGORY_SELECT] Removendo categoria duplicada:', { name: cat.name, id: cat.id });
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Se ainda há duplicatas por nome, manter apenas a primeira
    const nameMap = new Map<string, Category>();
    const final = unique.filter(cat => {
      if (nameMap.has(cat.name)) {
        console.warn('[CATEGORY_SELECT] Removendo categoria com nome duplicado:', { 
          name: cat.name, 
          id: cat.id,
          existingId: nameMap.get(cat.name)?.id 
        });
        return false;
      }
      nameMap.set(cat.name, cat);
      return true;
    });
    
    return final;
  };

  // Lógica inteligente de filtro de categorias
  const getFilteredCategories = () => {
    console.log('[CATEGORY_SELECT] Filtrando categorias:', {
      showSubcategories,
      isDebtPayment,
      parentCategoryId,
      totalCategories: categories.length,
      searchTerm
    });

    let baseCategories = [];
    
    if (isDebtPayment) {
      // Para dívidas: mostrar TODAS as categorias disponíveis (pai e sub)
      baseCategories = categories.filter(cat => 
        !cat.is_system && 
        !cat.name.includes(' - Fatura')
      );
      
      console.log('[CATEGORY_SELECT] Todas as categorias para dívidas:', baseCategories.length);
    } else {
      // Para despesas normais: mostrar apenas categorias pai
      baseCategories = categories.filter(category => {
        const isStandard = (
          !category.name.includes(' - Fatura') && 
          !category.is_system &&
          !isSpecialCategory(category)
        );
        return isStandard;
      });
      
      console.log('[CATEGORY_SELECT] Categorias padrão:', baseCategories.length);
    }

    // Aplicar filtro de busca por texto
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      baseCategories = baseCategories.filter(category => 
        category.name.toLowerCase().includes(searchLower) ||
        category.emoji.includes(searchTerm)
      );
      console.log('[CATEGORY_SELECT] Categorias após busca:', baseCategories.length);
    }

    // Remover duplicatas
    const uniqueCategories = removeDuplicates(baseCategories);
    console.log('[CATEGORY_SELECT] Categorias após remoção de duplicatas:', uniqueCategories.length);

    return uniqueCategories;
  };

  const filteredCategories = getFilteredCategories();

  // Verificar se há categorias disponíveis
  useEffect(() => {
    if (filteredCategories.length === 0 && categories.length > 0) {
      console.warn('[CATEGORY_SELECT] Nenhuma categoria encontrada para o filtro atual');
      setShowErrorAnimation(true);
      setTimeout(() => setShowErrorAnimation(false), 3000);
    }
  }, [filteredCategories.length, categories.length]);

  const invoiceCategories = categories.filter(category => category.name.includes(' - Fatura'));

  return (
    <>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={showErrorAnimation ? 'animate-pulse border-red-500 bg-red-50' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50 max-h-[300px] overflow-y-auto">
          {/* Campo de busca */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Opção para criar nova categoria */}
          {showCreateOption && (
            <>
              <div 
                className="flex items-center gap-2 text-primary font-medium px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground relative"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Criar nova categoria</span>
              </div>
              <div className="border-t my-1" />
            </>
          )}


          {/* Categorias Cadastradas */}
          {filteredCategories.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                {isDebtPayment ? 'Categorias para Dívidas' : 'Categorias'}
              </div>
              {filteredCategories
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.emoji}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
            </>
          )}

          {/* Faturas de Cartão de Crédito */}
          {showInvoiceCategories && invoiceCategories.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 mt-1">
                Faturas de Cartão de Crédito
              </div>
              {invoiceCategories
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.emoji}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
            </>
          )}

          {/* Metas */}
          {goals.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 mt-1">
                Metas
              </div>
              {goals.map((goal) => (
                <SelectItem key={`goal-${goal.id}`} value={`goal-${goal.id}`}>
                  <span className="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Meta - {goal.title}</span>
                  </span>
                </SelectItem>
              ))}
            </>
          )}

          {/* Dívidas */}
          {debts.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50 mt-1">
                Dívidas
              </div>
              {debts.map((debt) => (
                <SelectItem key={`debt-${debt.id}`} value={`debt-${debt.id}`}>
                  <span className="flex items-center gap-2">
                    <span>💳</span>
                    <span>Dívida - {debt.title}</span>
                  </span>
                </SelectItem>
              ))}
            </>
          )}

        </SelectContent>
      </Select>

      {/* Dialog para criar nova categoria */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da Categoria</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Alimentação, Transporte..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-emoji">Emoji (opcional)</Label>
              <Input
                id="category-emoji"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                placeholder="📦"
                maxLength={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewCategoryName('');
                  setNewCategoryEmoji('📦');
                }}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={isCreating || !newCategoryName.trim()}
              >
                {isCreating ? 'Criando...' : 'Criar Categoria'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
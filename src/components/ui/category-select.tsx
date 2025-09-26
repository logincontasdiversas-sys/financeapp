import React, { useState, useCallback, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
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
  debts = []
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');
  const [isCreating, setIsCreating] = useState(false);
  const { tenantId } = useTenant();
  const { toast } = useToast();

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
    
    if (isSpecial) {
      console.log('[CATEGORY_FILTER] Categoria especial detectada:', category.name);
    }
    
    return isSpecial;
  };

  const standardCategories = categories.filter(category => {
    const isStandard = (
      !category.name.includes(' - Fatura') && 
      !category.is_system && // Filtrar categorias automáticas
      !isSpecialCategory(category) // Filtrar categorias especiais
    );
    
    if (!isStandard) {
      console.log('[CATEGORY_FILTER] Categoria filtrada:', category.name, 'Razão:', {
        isFatura: category.name.includes(' - Fatura'),
        isSystem: category.is_system,
        isSpecial: isSpecialCategory(category)
      });
    }
    
    return isStandard;
  });
  const invoiceCategories = categories.filter(category => category.name.includes(' - Fatura'));

  return (
    <>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50 max-h-[300px] overflow-y-auto">
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
          {standardCategories.length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/50">
                Categorias
              </div>
              {standardCategories
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
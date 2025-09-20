import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Archive, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import CategoryAnalytics from "@/components/dashboard/CategoryAnalytics";

interface Category {
  id: string;
  name: string;
  emoji: string;
  archived: boolean;
}

const Categorias = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    emoji: "📝",
  });

  // Popular emojis for categories
  const popularEmojis = [
    // Comida & Bebida
    "🍔", "🍕", "🍜", "🍎", "🍊", "🍰", "☕", "🍺", "🍷", "🥗",
    "🍝", "🍞", "🥤", "🍪", "🍫", "🍇", "🍓", "🥑", "🍌", "🍉",
    
    // Transporte
    "🚌", "🚗", "🚲", "🚁", "✈️", "🚢", "🚂", "🛵", "🚙", "🚕",
    "🚐", "🚑", "🚒", "🚓", "🏍️", "🚤", "⛵", "🚁", "🛩️", "🚀",
    
    // Casa & Família
    "🏠", "🏡", "🏢", "🏪", "🏬", "🏭", "🏛️", "🏗️", "🏘️", "🏙️",
    "🐕", "🐱", "🐶", "🐰", "🐹", "🐭", "🐦", "🐠", "🐢", "🦜",
    
    // Tecnologia & Trabalho
    "💻", "📱", "📞", "🖥️", "💻", "⌚", "📺", "📷", "📹", "🎥",
    "💼", "👔", "👕", "👗", "👖", "👟", "👠", "👞", "👒", "🎩",
    
    // Saúde & Beleza
    "💊", "💉", "🔋", "⚡", "💄", "💅", "🧴", "🧼", "🛁", "🚿",
    "🏥", "⚕️", "🩺", "💊", "🧬", "🦷", "👁️", "👂", "👃", "👄",
    
    // Entretenimento & Esportes
    "🎮", "🎬", "🎯", "🎪", "🎨", "🎭", "🏋️", "🏃", "🏊", "⚽",
    "🏀", "🎾", "🏈", "🎱", "🎲", "🃏", "🎴", "🎸", "🎹", "🎺",
    
    // Compras & Dinheiro
    "🛒", "🛍️", "💰", "💳", "💵", "💸", "💎", "💍", "💎", "💎",
    "📦", "📮", "📬", "📭", "📪", "📫", "📯", "📨", "📩", "📧",
    
    // Educação & Cultura
    "🎓", "📚", "📖", "📝", "✏️", "🖊️", "🖋️", "📏", "📐", "📊",
    "📈", "📉", "📋", "📌", "📍", "🗂️", "🗃️", "🗄️", "🗑️", "🔒",
    
    // Ferramentas & Utilitários
    "🔧", "🔨", "🛠️", "⚙️", "🔩", "🔫", "💣", "🧨", "🔪", "🗡️",
    "⚔️", "🛡️", "🔮", "🧿", "🎭", "🎪", "🎨", "🖼️", "🖼️", "🖼️",
    
    // Natureza & Clima
    "🌞", "🌙", "⭐", "☁️", "⛅", "🌧️", "⛈️", "🌩️", "❄️", "☃️",
    "🌊", "🌋", "🏔️", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "🍀"
  ];

  useEffect(() => {
    if (user && tenantId) {
      loadCategories();
    }
  }, [user, tenantId]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_system', false)  // Só mostrar categorias não-automáticas
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('[CATEGORIAS] Error loading:', error);
      toast({
        title: "Erro ao carregar categorias",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      const categoryData = {
        name: formData.name,
        emoji: formData.emoji,
        archived: false,
        tenant_id: tenantId,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: "Categoria atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryData);

        if (error) throw error;
        toast({ title: "Categoria criada com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      clearQueryCache();
      loadCategories();
    } catch (error: any) {
      console.error('[CATEGORIAS] Error saving:', error);
      toast({
        title: "Erro ao salvar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      emoji: category.emoji,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (category: Category) => {
    setEditingCategory(null);
    setFormData({
      name: `${category.name} (Cópia)`,
      emoji: category.emoji,
    });
    setIsDialogOpen(true);
  };

  const handleToggleArchive = async (id: string, archived: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ archived: !archived })
        .eq('id', id);

      if (error) throw error;
      toast({ 
        title: archived ? "Categoria reativada!" : "Categoria arquivada!" 
      });
      loadCategories();
    } catch (error: any) {
      console.error('[CATEGORIAS] Error toggling archive:', error);
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.")) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Categoria excluída com sucesso!" });
      clearQueryCache();
      loadCategories();
    } catch (error: any) {
      console.error('[CATEGORIAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} categoria(s)? Esta ação não pode ser desfeita.`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      toast({ title: `${selectedItems.length} categoria(s) excluída(s) com sucesso!` });
      setSelectedItems([]);
      clearQueryCache();
      loadCategories();
    } catch (error: any) {
      console.error('[CATEGORIAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir categorias",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(activeCategories.map(c => c.id));
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
      emoji: "📝",
    });
  };

  // Filter out custom categories (with " - Fatura", " - Meta", " - Dívida") 
  const visibleCategories = categories.filter(cat => 
    !cat.name.includes(' - Fatura') && 
    !cat.name.includes(' - Meta') && 
    !cat.name.includes(' - Dívida')
  );
  const activeCategories = visibleCategories.filter(cat => !cat.archived);
  const archivedCategories = visibleCategories.filter(cat => cat.archived);

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
          <p className="text-muted-foreground">
            Organize suas transações por categoria
          </p>
        </div>
        
        <div className="flex gap-2">
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
            <Button onClick={() => { resetForm(); setEditingCategory(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emoji">Emoji</Label>
                <div className="flex gap-1 flex-wrap mb-2 max-h-48 overflow-y-auto">
                  {popularEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`p-2 rounded border text-2xl ${
                        formData.emoji === emoji ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                      onClick={() => setFormData({ ...formData, emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Input
                  id="emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="Ou digite um emoji"
                  maxLength={2}
                  className="text-2xl"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCategory ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === activeCategories.length && activeCategories.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Emoji</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(category.id)}
                      onCheckedChange={(checked) => handleSelectItem(category.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="text-4xl">{category.emoji}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(category)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleArchive(category.id, category.archived)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {archivedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categorias Arquivadas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedCategories.map((category) => (
                  <TableRow key={category.id} className="opacity-60">
                    <TableCell className="text-4xl">{category.emoji}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleArchive(category.id, category.archived)}
                          title="Reativar categoria"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Análises Avançadas */}
      {categories.length > 0 && (
        <div className="mt-8">
          <CategoryAnalytics />
        </div>
      )}
    </div>
  );
};

export default Categorias;
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceitasSummaryWithDateSync } from "@/components/dashboard/ReceitasSummaryWithDateSync";
import { ReceitasCalendar } from "@/components/dashboard/ReceitasCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { dateInputToISO, formatDateForDisplay, formatDateForMobile } from "@/utils/dateUtils";
import { SortableHeader } from "@/components/ui/sortable-header";
import { ImportCSVReceitas } from '@/components/ImportCSVReceitas';
import { SingleLineChart } from "@/components/dashboard/SingleLineChart";
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import { logger } from "@/utils/logger";
import { InlineEditText, InlineEditNumber, InlineEditDate, InlineEditSelect } from "@/components/ui/inline-edit";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  category_id: string | null;
  bank_id: string | null;
  status: string;
  note: string | null;
  banks?: {
    name: string;
  };
}

interface Bank {
  id: string;
  name: string;
}

const Receitas = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<Transaction | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sharedDateFilter, setSharedDateFilter] = useState<{ from: Date | undefined; to: Date | undefined } | null>(null);
  const [textFilter, setTextFilter] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    date: "",
    bank_id: "",
    status: "settled",
    note: "",
  });

  // Recorrência (repetir em outros meses)
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [monthsDialogOpen, setMonthsDialogOpen] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState<string[]>([]); // formato YYYY-MM

  const getMonthsOptions = (baseDateStr: string) => {
    const base = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const options: { value: string; label: string }[] = [];
    
    // Começar do próximo mês (não incluir o mês vigente)
    for (let i = 1; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      
      // Pular o mês vigente
      if (year === currentYear && month === currentMonth) {
        continue;
      }
      
      const monthStr = String(month + 1).padStart(2, '0');
      const value = `${year}-${monthStr}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Realtime sync para receitas (robusto: sempre recarrega, filtro por kind fica na query)
  useRealtimeSync({
    table: 'transactions',
    debounceMs: 300,
    onInsert: () => {
      logger.info('RECEITAS_REALTIME', 'Evento INSERT detectado');
      clearQueryCache();
      loadReceitas();
      setSummaryRefreshKey(prev => prev + 1);
    },
    onUpdate: () => {
      logger.info('RECEITAS_REALTIME', 'Evento UPDATE detectado');
      clearQueryCache();
      loadReceitas();
      setSummaryRefreshKey(prev => prev + 1);
    },
    onDelete: () => {
      logger.info('RECEITAS_REALTIME', 'Evento DELETE detectado');
      clearQueryCache();
      loadReceitas();
      setSummaryRefreshKey(prev => prev + 1);
    },
  });

  // Realtime sync para bancos
  useRealtimeSync({
    table: 'banks',
    onInsert: () => {
      logger.info('RECEITAS_REALTIME', 'Novo banco detectado');
      loadBanks();
    },
    onUpdate: () => {
      logger.info('RECEITAS_REALTIME', 'Banco atualizado detectado');
      loadBanks();
    },
    onDelete: () => {
      logger.info('RECEITAS_REALTIME', 'Banco removido detectado');
      loadBanks();
    },
  });

  useEffect(() => {
    if (user && tenantId) {
      loadReceitas();
      loadBanks();
    }
  }, [user, tenantId]);

  const loadReceitas = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          banks (
            name
          ),
          categories (
            name
          )
        `)
        .eq('kind', 'income')
        .not('categories.name', 'eq', 'Transferência entre Bancos') // Excluir transferências
        .order('date', { ascending: false });

      if (error) throw error;
      setReceitas(data || []);
    } catch (error) {
      console.error('[RECEITAS] Error loading:', error);
      toast({
        title: "Erro ao carregar receitas",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('[RECEITAS] Error loading banks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tenantId) return;

    try {
      // Use consistent date handling
      const dateISOLocal = dateInputToISO(formData.date);

      const transactionData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        date: dateISOLocal,
        category_id: null,
        bank_id: formData.bank_id || null,
        status: formData.status,
        note: formData.note || null,
        kind: 'income',
        user_id: user.id,
        tenant_id: tenantId,
      };

      if (editingReceita) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingReceita.id);

        if (error) throw error;
        toast({ title: "Receita atualizada com sucesso!" });
      } else {
        const { data: created, error } = await supabase
          .from('transactions')
          .insert(transactionData)
          .select()
          .single();

        if (error) throw error;
        if (created) {
          // Inclusão otimista
          setReceitas(prev => [
            {
              id: created.id,
              title: created.title,
              amount: Number(created.amount),
              date: created.date,
              category_id: created.category_id,
              bank_id: created.bank_id,
              status: created.status,
              note: created.note,
            } as unknown as Transaction,
            ...prev,
          ]);
        }

        // Se marcado para repetir, inserir cópias nos meses selecionados
        if (repeatEnabled && repeatMonths.length > 0) {
          const base = new Date(dateISOLocal + 'T00:00:00');
          const day = base.getDate();
          const makeSafeDate = (year: number, monthIndex: number, dayOfMonth: number) => {
            const lastDay = new Date(year, monthIndex + 1, 0).getDate();
            const safeDay = Math.min(dayOfMonth, lastDay);
            const d = new Date(year, monthIndex, safeDay);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          };

          const baseKey = base.getFullYear() * 100 + (base.getMonth() + 1);
          const extraRows = repeatMonths
            .filter((ym) => {
              const [yStr, mStr] = ym.split('-');
              const key = parseInt(yStr, 10) * 100 + parseInt(mStr, 10);
              return key > baseKey; // somente meses FUTUROS
            })
            .map((ym) => {
            const [yStr, mStr] = ym.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10) - 1; // monthIndex
            // Normalize UUID fields to null if empty
            const normalizeOptionalUUID = (value?: string | null) => {
              if (value === undefined || value === null) return null;
              const trimmed = String(value).trim();
              if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              return uuidRegex.test(trimmed) ? trimmed : null;
            };
            
            return {
              title: transactionData.title,
              amount: transactionData.amount,
              date: makeSafeDate(y, m, day),
              category_id: normalizeOptionalUUID(transactionData.category_id),
              bank_id: normalizeOptionalUUID(transactionData.bank_id),
              status: 'pending', // futuras sempre pendentes
              note: transactionData.note || null,
              kind: 'income',
              user_id: user.id,
              tenant_id: tenantId,
            };
          });

          const { data: insertedRows, error: bulkErr } = await supabase
            .from('transactions')
            .insert(extraRows)
            .select();
          if (bulkErr) throw bulkErr;
          if (insertedRows && insertedRows.length > 0) {
            setReceitas(prev => [
              ...insertedRows.map((t: any) => ({
                id: t.id,
                title: t.title,
                amount: Number(t.amount),
                date: t.date,
                category_id: t.category_id,
                bank_id: t.bank_id,
                status: t.status,
                note: t.note,
              } as unknown as Transaction)),
              ...prev,
            ]);
          }
          toast({ title: `Receita criada e repetida em ${repeatMonths.length} mês(es).` });
        } else {
          toast({ title: "Receita criada com sucesso!" });
        }
      }

      setIsDialogOpen(false);
      setEditingReceita(null);
      resetForm();
      setRepeatEnabled(false);
      setRepeatMonths([]);
      clearQueryCache();
      // Não precisa mais chamar loadReceitas() manualmente - o realtime sync fará isso
    } catch (error: any) {
      console.error('[RECEITAS] Error saving:', error);
      toast({
        title: "Erro ao salvar receita",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (receita: Transaction) => {
    setEditingReceita(receita);
    setFormData({
      title: receita.title,
      amount: receita.amount.toString(),
      date: receita.date,
      bank_id: receita.bank_id || "",
      status: receita.status,
      note: receita.note || "",
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (receita: Transaction) => {
    setEditingReceita(null);
    setFormData({
      title: `${receita.title} (Cópia)`,
      amount: receita.amount.toString(),
      date: new Date().toISOString().split('T')[0], // Data atual
      bank_id: receita.bank_id || "",
      status: receita.status,
      note: receita.note || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditSelected = () => {
    if (selectedItems.length === 1) {
      const selectedReceita = receitas.find(r => r.id === selectedItems[0]);
      if (selectedReceita) {
        handleEdit(selectedReceita);
      }
    } else {
      toast({
        title: "Selecione apenas uma receita para editar",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedItems.length === 1) {
      const selectedReceita = receitas.find(r => r.id === selectedItems[0]);
      if (selectedReceita) {
        handleDuplicate(selectedReceita);
      }
    } else {
      toast({
        title: "Selecione apenas uma receita para duplicar",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta receita?")) return;

    try {
      // Otimista: remove imediatamente e guarda backup
      const previous = receitas;
      setReceitas(prev => prev.filter(r => r.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        setReceitas(previous); // rollback
        throw error;
      }
      toast({ title: "Receita excluída com sucesso!" });
      clearQueryCache();
      // Não precisa mais chamar loadReceitas() manualmente - o realtime sync fará isso
    } catch (error: any) {
      console.error('[RECEITAS] Error deleting:', error);
      toast({
        title: "Erro ao excluir receita",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInlineUpdate = async (id: string, field: string, value: any) => {
    if (!user || !tenantId) return;

    try {
      const updateData: any = {};
      
      if (field === 'date') {
        updateData[field] = dateInputToISO(value);
      } else {
        updateData[field] = value;
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Receita atualizada com sucesso!" });
      clearQueryCache();

      // Atualização otimista imediata na lista
      setReceitas(prev => prev.map(r => {
        if (r.id !== id) return r;
        const next: any = { ...r };
        next[field as keyof typeof next] = updateData[field as keyof typeof updateData];
        // Garantir tipos coerentes
        if (field === 'amount') next.amount = Number(updateData.amount);
        return next as typeof r;
      }));

      // Garantia extra: recarregar (realtime também cobre)
      loadReceitas();
    } catch (error: any) {
      console.error('[RECEITAS] Error updating inline:', error);
      toast({
        title: "Erro ao atualizar receita",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} receita(s)?`)) return;

    try {
      // Processar em lotes de 50 para evitar URLs muito longas
      const batchSize = 50;
      let deletedCount = 0;
      // Otimista: remove imediatamente e guarda backup
      const previous = receitas;
      setReceitas(prev => prev.filter(r => !selectedItems.includes(r.id)));
      
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', batch);

        if (error) {
          setReceitas(previous); // rollback
          throw error;
        }
        deletedCount += batch.length;
      }

      toast({ title: `${deletedCount} receita(s) excluída(s) com sucesso!` });
      setSelectedItems([]);
      clearQueryCache();
      // Não precisa mais chamar loadReceitas() manualmente - o realtime sync fará isso
    } catch (error: any) {
      console.error('[RECEITAS] Error bulk deleting:', error);
      toast({
        title: "Erro ao excluir receitas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(receitas.map(r => r.id));
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
      amount: "",
      date: "",
      bank_id: "",
      status: "settled",
      note: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getFilteredAndSortedReceitas = () => {
    let filteredReceitas = receitas;

    // Aplicar filtro de texto
    if (textFilter.trim()) {
      const searchTerm = textFilter.toLowerCase().trim();
      filteredReceitas = filteredReceitas.filter(receita => 
        receita.title.toLowerCase().includes(searchTerm) ||
        (receita.banks?.name || '').toLowerCase().includes(searchTerm) ||
        (receita.note || '').toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar filtro de data
    if (sharedDateFilter && sharedDateFilter.from && sharedDateFilter.to) {
      filteredReceitas = filteredReceitas.filter(receita => {
        // Criar data da receita sem problema de timezone
        const receitaDate = new Date(receita.date + 'T00:00:00');
        // Comparar apenas as datas (não horas)
        const receitaDateOnly = new Date(receitaDate.getFullYear(), receitaDate.getMonth(), receitaDate.getDate());
        const fromDateOnly = new Date(sharedDateFilter.from!.getFullYear(), sharedDateFilter.from!.getMonth(), sharedDateFilter.from!.getDate());
        const toDateOnly = new Date(sharedDateFilter.to!.getFullYear(), sharedDateFilter.to!.getMonth(), sharedDateFilter.to!.getDate());
        
        const isInRange = receitaDateOnly >= fromDateOnly && receitaDateOnly <= toDateOnly;
        
        return isInRange;
      });
    }

    // Aplicar ordenação
    if (!sortField) return filteredReceitas;

    return [...filteredReceitas].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'bank':
          aValue = (a.banks?.name || '').toLowerCase();
          bValue = (b.banks?.name || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Receitas</h2>
          <p className="text-muted-foreground">
            Gerencie suas fontes de renda
          </p>
        </div>
        
        <div className="flex gap-2">
          <ImportCSVReceitas onImportComplete={() => { /* Realtime sync já atualiza */ }} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingReceita(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-full sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReceita ? "Editar Receita" : "Nova Receita"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                <Select
                  value={formData.bank_id}
                  onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um banco" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 overflow-y-auto">
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 overflow-y-auto">
                    <SelectItem value="settled">Recebido</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Observações</Label>
                <Input
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {/* Recorrência */}
              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="repeat"
                    checked={repeatEnabled}
                    onCheckedChange={(c) => {
                      const enabled = Boolean(c);
                      setRepeatEnabled(enabled);
                      if (enabled) setMonthsDialogOpen(true);
                    }}
                  />
                  <Label htmlFor="repeat">Este lançamento se repete em outros meses?</Label>
                  {repeatEnabled && (
                    <Button type="button" variant="secondary" onClick={() => setMonthsDialogOpen(true)}>
                      Selecionar meses
                    </Button>
                  )}
                </div>
                {repeatEnabled && repeatMonths.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Meses selecionados: {repeatMonths.join(', ')}
                  </div>
                )}
              </div>

              {/* Popup de seleção de meses */}
              {monthsDialogOpen && (
                <div className="border rounded-md p-3 space-y-2">
                  <div className="font-semibold">Selecione os meses:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {getMonthsOptions(formData.date).map(opt => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={repeatMonths.includes(opt.value) ? 'default' : 'outline'}
                        onClick={() => {
                          setRepeatMonths(prev =>
                            prev.includes(opt.value)
                              ? prev.filter(v => v !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setMonthsDialogOpen(false)}>Fechar</Button>
                    <Button type="button" onClick={() => setMonthsDialogOpen(false)}>Confirmar</Button>
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full">
                {editingReceita ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Seção de Resumo das Receitas */}
      <ReceitasSummaryWithDateSync 
        refreshKey={summaryRefreshKey} 
        onDateFilterChange={setSharedDateFilter}
      />

      {/* Gráfico Mensal de Receitas */}
      <SingleLineChart 
        title="Evolução das Receitas ao Longo do Ano"
        dataType="income"
        lineColor="hsl(var(--success))"
        lineName="Receitas"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Lista de Receitas</CardTitle>
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSelected()}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateSelected()}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir ({selectedItems.length})
                  </Button>
                </div>
              )}
            </div>
            <div className="w-72">
              <Input
                placeholder="Filtrar por título, banco ou observações..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Layout Mobile - Cards */}
          <div className="block sm:hidden space-y-3">
            {/* Botão de Seleção Global - Mobile */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedItems.length === receitas.length && receitas.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems(receitas.map(r => r.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
                <span className="text-sm font-medium">
                  {selectedItems.length > 0 ? `Selecionados: ${selectedItems.length}` : 'Selecionar todos'}
                </span>
              </div>
              {selectedItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  Cancelar
                </Button>
              )}
            </div>

            {(() => {
              const groupedByDate = getFilteredAndSortedReceitas().reduce((acc, receita) => {
                const date = receita.date;
                if (!acc[date]) {
                  acc[date] = [];
                }
                acc[date].push(receita);
                return acc;
              }, {} as Record<string, typeof receitas>);

              return Object.entries(groupedByDate).map(([date, receitasOfDate]) => (
                <div key={date} className="bg-muted/50 rounded-lg p-4 mb-4">
                  {/* Grid Padronizado - 12 colunas */}
                  <div className="grid grid-cols-12 gap-2 relative border-2 border-dashed border-blue-500">
                    {/* Linha Vertical - conecta ponto a ponto */}
                    {receitasOfDate.length > 1 && (
                      <div className="pointer-events-none absolute inset-0 grid grid-cols-12 gap-2">
                        <div className="col-start-3 relative justify-self-center">
                          <div className="absolute left-1/2 -translate-x-1/2 w-[3px] bg-orange-500 rounded-full" style={{ top: '2.75rem', height: `${(receitasOfDate.length - 1) * 56}px` }} />
                        </div>
                      </div>
                    )}
                    
                    {receitasOfDate.map((receita, index) => (
                      <div key={receita.id} className="contents">
                        {/* Data - Colunas 1-2 (apenas no primeiro item) */}
                        {index === 0 && (
                          <div className="col-span-2 text-center border border-dashed border-red-500 p-1">
                            <div className="text-lg font-bold">
                              {formatDateForMobile(receita.date).day}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateForMobile(receita.date).month}
                            </div>
                          </div>
                        )}
                        
                        {/* Espaçador quando não é o primeiro item */}
                        {index > 0 && (
                          <div className="col-span-2 border border-dashed border-red-500 p-1">
                          </div>
                        )}
                        
                        {/* Ponto da Timeline - Coluna 3 */}
                        <div className="col-span-1 flex items-center justify-center relative z-10 border border-dashed border-green-500 p-1">
                          <div className={`w-3 h-3 rounded-full ${
                            receita.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        </div>
                        
                        {/* Checkbox - Coluna 4 (só aparece se seleção estiver ativa) */}
                        {selectedItems.length > 0 ? (
                          <div className="col-span-1 flex items-center justify-center border border-dashed border-purple-500 p-1">
                            <Checkbox
                              checked={selectedItems.includes(receita.id)}
                              onCheckedChange={(checked) => handleSelectItem(receita.id, checked as boolean)}
                            />
                          </div>
                        ) : (
                          <div className="col-span-1 border border-dashed border-purple-500 p-1">
                          </div>
                        )}
                        
                        {/* Descrição - Colunas 5-9 */}
                        <div className="col-span-5 min-w-0 border border-dashed border-yellow-500 p-1">
                          <p className="font-medium text-sm truncate">{receita.title}</p>
                          {receita.banks?.name && (
                            <p className="text-xs text-muted-foreground truncate">{receita.banks.name}</p>
                          )}
                        </div>
                        
                        {/* Valor - Colunas 10-12 */}
                        <div className="col-span-3 text-right border border-dashed border-pink-500 p-1">
                          <p className={`font-bold text-sm ${
                            receita.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {receita.amount > 0 ? '+' : ''}{formatCurrency(receita.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {receita.status === 'settled' ? 'Recebido' : 'Pendente'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Layout Desktop - Tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === getFilteredAndSortedReceitas().length && getFilteredAndSortedReceitas().length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader 
                    label="Descrição"
                    sortKey="title"
                    currentSort={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader 
                    label="Banco"
                    sortKey="bank"
                    currentSort={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader 
                    label="Valor"
                    sortKey="amount"
                    currentSort={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader 
                    label="Data"
                    sortKey="date"
                    currentSort={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortableHeader 
                    label="Status"
                    sortKey="status"
                    currentSort={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredAndSortedReceitas().map((receita) => (
                <TableRow key={receita.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(receita.id)}
                      onCheckedChange={(checked) => handleSelectItem(receita.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <InlineEditText
                      value={receita.title}
                      onSave={(value) => handleInlineUpdate(receita.id, 'title', value)}
                      placeholder="Título da receita"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditSelect
                      value={receita.bank_id || ""}
                      options={[
                        { value: "__none__", label: "Sem banco" },
                        ...banks.map(bank => ({ value: bank.id, label: bank.name }))
                      ]}
                      onSave={(value) => handleInlineUpdate(receita.id, 'bank_id', value || null)}
                      getDisplayValue={(value) => {
                        if (!value) return "Sem banco";
                        const bank = banks.find(b => b.id === value);
                        return bank?.name || "Sem banco";
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    <InlineEditNumber
                      value={receita.amount}
                      onSave={(value) => handleInlineUpdate(receita.id, 'amount', value)}
                      formatValue={formatCurrency}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditDate
                      value={receita.date}
                      onSave={(value) => handleInlineUpdate(receita.id, 'date', value)}
                      formatValue={formatDate}
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditSelect
                      value={receita.status}
                      options={[
                        { value: "settled", label: "Recebido" },
                        { value: "pending", label: "Pendente" }
                      ]}
                      onSave={(value) => handleInlineUpdate(receita.id, 'status', value)}
                      getDisplayValue={(value) => value === 'settled' ? 'Recebido' : 'Pendente'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          
          {/* Total da Lista */}
          {getFilteredAndSortedReceitas().length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="bg-muted/50 px-4 py-2 rounded-lg border">
                <span className="text-sm font-medium text-muted-foreground">SOMA</span>
                <span className="ml-2 text-lg font-bold text-green-600">
                  {formatCurrency(
                    getFilteredAndSortedReceitas().reduce((total, receita) => total + receita.amount, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção do Calendário */}
      <ReceitasCalendar />
    </div>
  );
};

export default Receitas;

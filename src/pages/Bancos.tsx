import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Pencil, Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { clearQueryCache } from "@/hooks/useSupabaseQuery";
import SimpleBankSummary from "@/components/dashboard/SimpleBankSummary";

interface Bank {
  id: string;
  name: string;
  account_type: string;
  balance: number;
  created_at: string;
}

const Bancos = () => {
  const { user } = useAuth();
  const { tenantId, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    account_type: "",
    balance: "",
  });

  useEffect(() => {
    if (user && tenantId) {
      loadBanks();
    }
  }, [user, tenantId]);

  const loadBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('[BANCOS] Error loading:', error);
      toast({
        title: "Erro ao carregar bancos",
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
      const bankData = {
        name: formData.name,
        account_type: formData.account_type,
        balance: parseFloat(formData.balance) || 0,
        user_id: user.id,
        tenant_id: tenantId,
      };

      if (editingBank) {
        const { error } = await supabase
          .from('banks')
          .update(bankData)
          .eq('id', editingBank.id);

        if (error) throw error;
        toast({ title: "Banco atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('banks')
          .insert(bankData);

        if (error) throw error;
        toast({ title: "Banco criado com sucesso!" });
      }

      setIsDialogOpen(false);
      setEditingBank(null);
      resetForm();
      clearQueryCache();
      loadBanks();
    } catch (error: any) {
      console.error('[BANCOS] Error saving:', error);
      toast({
        title: "Erro ao salvar banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      account_type: bank.account_type,
      balance: bank.balance.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (bank: Bank) => {
    setEditingBank(null);
    setFormData({
      name: `${bank.name} (Cópia)`,
      account_type: bank.account_type,
      balance: bank.balance.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este banco?")) return;

    try {
      const { error } = await supabase
        .from('banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Banco excluído com sucesso!" });
      clearQueryCache();
      loadBanks();
    } catch (error: any) {
      console.error('[BANCOS] Error deleting:', error);
      toast({
        title: "Erro ao excluir banco",
        description: error.message,
        variant: "destructive",
      });
    }
  };



  const resetForm = () => {
    setFormData({
      name: "",
      account_type: "",
      balance: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getAccountTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'checking': 'Conta Corrente',
      'savings': 'Poupança',
      'investment': 'Investimento',
    };
    return types[type] || type;
  };

  if (loading || tenantLoading) {
    return <div className="flex items-center justify-center h-32">Carregando...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Bancos</h2>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias
          </p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingBank(null); }} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Banco
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? "Editar Banco" : "Novo Banco"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Banco</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Banco do Brasil, Nubank..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de Conta</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent className="overflow-y-auto">
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                    <SelectItem value="investment">Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Saldo Inicial</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ <strong>Importante:</strong> O saldo inicial é apenas o valor que já existia no banco antes de usar o sistema. 
                  Este valor é usado apenas uma vez para equalizar o histórico e NÃO é aplicado mensalmente. 
                  NÃO registre este valor também como uma receita.
                </p>
              </div>
              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {editingBank ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {banks.map((bank) => (
          <Card key={bank.id} className="bg-gradient-card border-0 shadow-sm relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-8">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {bank.name}
              </CardTitle>
               <div className="flex gap-1">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleEdit(bank)}
                   className="h-8 w-8 p-0"
                 >
                   <Pencil className="h-3 w-3" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleDuplicate(bank)}
                   className="h-8 w-8 p-0"
                 >
                   <Copy className="h-3 w-3" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => handleDelete(bank.id)}
                   className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                 >
                   <Trash2 className="h-3 w-3" />
                 </Button>
               </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {getAccountTypeLabel(bank.account_type)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo Detalhado */}
      {banks.length > 0 && (
        <div className="mt-8">
          <SimpleBankSummary />
        </div>
      )}

      {banks.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum banco cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece cadastrando seus bancos para gerenciar suas finanças
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Banco
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Bancos;
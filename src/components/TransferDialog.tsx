import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRightLeftIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useTenant } from "@/hooks/useTenant";
import { createTransferCategory } from "@/utils/createTransferCategory";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: string;
  name: string;
  balance: number;
}

interface TransferFormData {
  amount: string;
  from_bank_id: string;
  to_bank_id: string;
  date: string;
  note: string;
}

export const TransferDialog = () => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferCategoryId, setTransferCategoryId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TransferFormData>({
    amount: '',
    from_bank_id: '',
    to_bank_id: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  useEffect(() => {
    if (tenantId && isOpen) {
      loadBanks();
      createTransferCategoryIfNeeded();
    }
  }, [tenantId, isOpen]);

  const loadBanks = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name, balance')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os bancos.",
        variant: "destructive"
      });
    }
  };

  const createTransferCategoryIfNeeded = async () => {
    if (!tenantId) return;
    
    try {
      const categoryId = await createTransferCategory(tenantId);
      setTransferCategoryId(categoryId);
    } catch (error) {
      console.error('Erro ao criar categoria de transferência:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !tenantId || !transferCategoryId) return;
    
    // Validações
    if (!formData.amount || !formData.from_bank_id || !formData.to_bank_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (formData.from_bank_id === formData.to_bank_id) {
      toast({
        title: "Erro",
        description: "Selecione bancos diferentes para a transferência.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Criar duas transações: uma de saída e uma de entrada
      const transactions = [
        {
          title: `Transferência para ${banks.find(b => b.id === formData.to_bank_id)?.name}`,
          amount: amount,
          date: formData.date,
          category_id: transferCategoryId,
          bank_id: formData.from_bank_id,
          kind: 'transfer',
          status: 'settled',
          payment_method: 'PIX',
          note: formData.note || null,
          user_id: user.id,
          tenant_id: tenantId,
        },
        {
          title: `Transferência de ${banks.find(b => b.id === formData.from_bank_id)?.name}`,
          amount: amount,
          date: formData.date,
          category_id: transferCategoryId,
          bank_id: formData.to_bank_id,
          kind: 'transfer',
          status: 'settled',
          payment_method: 'PIX',
          note: formData.note || null,
          user_id: user.id,
          tenant_id: tenantId,
        }
      ];

      const { error } = await supabase
        .from('transactions')
        .insert(transactions);

      if (error) throw error;

      toast({
        title: "Transferência realizada!",
        description: `R$ ${amount.toFixed(2)} transferido com sucesso.`,
      });

      // Reset form
      setFormData({
        amount: '',
        from_bank_id: '',
        to_bank_id: '',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao criar transferência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar a transferência.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowRightLeftIcon className="h-4 w-4" />
          Transferir entre Bancos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeftIcon className="h-5 w-5" />
            Transferência entre Bancos
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_bank">De (Banco de Origem) *</Label>
            <Select
              value={formData.from_bank_id}
              onValueChange={(value) => setFormData({ ...formData, from_bank_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco de origem" />
              </SelectTrigger>
              <SelectContent className="overflow-y-auto">
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to_bank">Para (Banco de Destino) *</Label>
            <Select
              value={formData.to_bank_id}
              onValueChange={(value) => setFormData({ ...formData, to_bank_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco de destino" />
              </SelectTrigger>
              <SelectContent className="overflow-y-auto">
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Observação (opcional)</Label>
            <Input
              id="note"
              placeholder="Ex: PIX para pagar conta"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Transferindo..." : "Transferir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

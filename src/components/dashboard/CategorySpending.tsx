import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface CategorySpending {
  id: string;
  name: string;
  emoji: string;
  total: number;
}

export const CategorySpending = () => {
  const { tenantId } = useTenant();
  const [previousMonth, setPreviousMonth] = useState<CategorySpending[]>([]);
  const [currentMonth, setCurrentMonth] = useState<CategorySpending[]>([]);
  const [nextMonth, setNextMonth] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      loadCategorySpending();
    }
  }, [tenantId]);

  const loadCategorySpending = async () => {
    try {
      // Previous month
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevStartDate = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1).toISOString().split('T')[0];
      const prevEndDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().split('T')[0];

      // Current month
      const currDate = new Date();
      const currStartDate = new Date(currDate.getFullYear(), currDate.getMonth(), 1).toISOString().split('T')[0];
      const currEndDate = new Date(currDate.getFullYear(), currDate.getMonth() + 1, 0).toISOString().split('T')[0];

      // Next month (scheduled transactions)
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      const nextStartDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1).toISOString().split('T')[0];
      const nextEndDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).toISOString().split('T')[0];

      const [prevData, currData, nextData] = await Promise.all([
        loadSpendingForPeriod(prevStartDate, prevEndDate, 'settled'),
        loadSpendingForPeriod(currStartDate, currEndDate, 'settled'),
        loadSpendingForPeriod(nextStartDate, nextEndDate, 'scheduled')
      ]);

      setPreviousMonth(prevData);
      setCurrentMonth(currData);
      setNextMonth(nextData);
    } catch (error) {
      console.error('[CATEGORY_SPENDING] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpendingForPeriod = async (startDate: string, endDate: string, status: string) => {
    console.log('[CATEGORY_SPENDING] 🔄 Carregando dados (sem join):', { startDate, endDate, status, tenantId, version: '4.1.0-NO-JOIN' });

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('amount, payment_method, category_id')
      .eq('kind', 'expense')
      .eq('status', status)
      .eq('tenant_id', tenantId)
      .gte('date', startDate)
      .lte('date', endDate)
      .not('category_id', 'is', null);

    if (error) throw error;

    const categoryTotals = new Map<string, number>();
    (tx || []).forEach((t: any) => {
      const cid = t.category_id as string;
      const prev = categoryTotals.get(cid) || 0;
      categoryTotals.set(cid, prev + Number(t.amount));
    });

    const categoryIds = Array.from(categoryTotals.keys());
    if (categoryIds.length === 0) return [] as CategorySpending[];

    const { data: cats, error: catsErr } = await supabase
      .from('categories')
      .select('id, name, emoji')
      .eq('tenant_id', tenantId)
      .in('id', categoryIds);
    if (catsErr) throw catsErr;

    const categoriesById = new Map<string, { id: string; name: string; emoji: string | null }>();
    (cats || []).forEach((c: any) => categoriesById.set(c.id, { id: c.id, name: c.name, emoji: c.emoji }));

    const results: CategorySpending[] = [];
    categoryTotals.forEach((total, cid) => {
      const cat = categoriesById.get(cid);
      if (!cat) return;
      // Excluir categorias de fatura/cartão
      const nameLc = (cat.name || '').toLowerCase();
      if (cat.name === 'Pagamento de Fatura' || nameLc.includes('fatura') || nameLc.includes('cartão')) return;

      results.push({
        id: cid,
        name: cat.name,
        emoji: cat.emoji || '📁',
        total,
      });
    });

    return results.sort((a, b) => b.total - a.total);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderSpendingList = (categories: CategorySpending[]) => {
    if (categories.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-4">
          Nenhum gasto registrado
        </p>
      );
    }

    const maxAmount = Math.max(...categories.map(c => c.total));

    return (
      <div className="space-y-3">
        {categories.map((category) => {
          const percentage = (category.total / maxAmount) * 100;
          
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.emoji}</span>
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="font-bold text-red-600">
                  {formatCurrency(category.total)}
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-muted-foreground/20 rounded"></div>
                  <div className="h-4 w-16 bg-muted-foreground/20 rounded"></div>
                </div>
                <div className="h-2 w-full bg-muted-foreground/20 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Gastos por Categorias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="previous">Mês Anterior</TabsTrigger>
            <TabsTrigger value="current">Este Mês</TabsTrigger>
            <TabsTrigger value="next">Próximo Mês</TabsTrigger>
          </TabsList>
          <TabsContent value="previous" className="mt-4">
            {renderSpendingList(previousMonth)}
          </TabsContent>
          <TabsContent value="current" className="mt-4">
            {renderSpendingList(currentMonth)}
          </TabsContent>
          <TabsContent value="next" className="mt-4">
            {renderSpendingList(nextMonth)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
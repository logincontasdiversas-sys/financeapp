import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CategorySpending {
  id: string;
  name: string;
  emoji: string;
  total: number;
}

export const CategorySpending = () => {
  const [previousMonth, setPreviousMonth] = useState<CategorySpending[]>([]);
  const [currentMonth, setCurrentMonth] = useState<CategorySpending[]>([]);
  const [nextMonth, setNextMonth] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategorySpending();
  }, []);

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
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        amount,
        payment_method,
        categories (
          id,
          name,
          emoji
        )
      `)
      .eq('kind', 'expense')
      .eq('status', status)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    const categoryMap = new Map<string, CategorySpending>();

    data?.forEach((transaction) => {
      if (transaction.categories) {
        const category = transaction.categories;
        
        // Excluir também as faturas de cartão (categoria "Pagamento de Fatura")
        if (category.name === 'Pagamento de Fatura' || 
            category.name === 'Categoria Personalizada' ||
            category.name?.toLowerCase().includes('fatura') ||
            category.name?.toLowerCase().includes('cartão')) {
          return;
        }
        
        const existing = categoryMap.get(category.id);
        
        if (existing) {
          existing.total += Number(transaction.amount);
        } else {
          categoryMap.set(category.id, {
            id: category.id,
            name: category.name,
            emoji: category.emoji || '📁',
            total: Number(transaction.amount)
          });
        }
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
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
import * as React from "react";
import { format } from "date-fns";
import { Calendar, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

type FilterOption = 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom' | 'maximum';

interface DateFilterProps {
  onFilterChange: (dateRange: DateRange | null) => void;
  className?: string;
}

export function DateFilter({ onFilterChange, className }: DateFilterProps) {
  const [filterOption, setFilterOption] = React.useState<FilterOption | ''>('');
  const [dateRange, setDateRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const handleFilterOptionChange = (value: string) => {
    const option = value as FilterOption;
    setFilterOption(option);

    const today = new Date();
    // Criar datas sem problemas de timezone
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    switch (option) {
      case 'thisWeek': {
        // Esta semana (domingo a sábado)
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() + (6 - dayOfWeek));
        const range = { from: startOfWeek, to: endOfWeek };
        setDateRange(range);
        onFilterChange(range);
        break;
      }
      case 'thisMonth': {
        // Este mês
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const range = { from: startOfMonth, to: endOfMonth };
        setDateRange(range);
        onFilterChange(range);
        break;
      }
      case 'lastMonth': {
        // Mês passado
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const range = { from: startOfLastMonth, to: endOfLastMonth };
        setDateRange(range);
        onFilterChange(range);
        break;
      }
      case 'maximum': {
        // Máximo: desde o início dos dados até hoje
        const startOfData = new Date(2020, 0, 1); // Janeiro de 2020
        const range = { from: startOfData, to: startOfToday };
        setDateRange(range);
        onFilterChange(range);
        break;
      }
      case 'custom':
        // Para período personalizado, aguarda seleção no calendário
        break;
      default:
        // Limpar filtro
        setDateRange({ from: undefined, to: undefined });
        onFilterChange(null);
        break;
    }
  };

  const handleDateRangeChange = (range: DateRange) => {
    // Se já temos um range completo e o usuário clica em uma nova data,
    // sempre inicia uma nova seleção
    if (dateRange.from && dateRange.to && range?.from) {
      // Se a nova data é diferente das datas existentes, inicia novo range
      const newDate = range.from;
      const isSameAsFrom = newDate.getTime() === dateRange.from.getTime();
      const isSameAsTo = newDate.getTime() === dateRange.to.getTime();
      
      if (!isSameAsFrom && !isSameAsTo) {
        // Normalizar a data para evitar problemas de timezone
        const normalizedDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        const newRange = { from: normalizedDate, to: undefined };
        setDateRange(newRange);
        return;
      }
    }
    
    // Normalizar as datas do range para evitar problemas de timezone
    const normalizedRange = range ? {
      from: range.from ? new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate()) : undefined,
      to: range.to ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate()) : undefined,
    } : { from: undefined, to: undefined };
    
    setDateRange(normalizedRange);
    if (normalizedRange?.from && normalizedRange?.to) {
      onFilterChange(normalizedRange);
      setIsPopoverOpen(false);
    }
  };

  const clearFilter = () => {
    setFilterOption('');
    setDateRange({ from: undefined, to: undefined });
    onFilterChange(null);
  };

  const formatDateRange = () => {
    if (!dateRange.from) {
      return "Selecionar período";
    }
    
    if (filterOption === 'thisWeek') return "Esta semana";
    if (filterOption === 'thisMonth') return "Este mês";
    if (filterOption === 'lastMonth') return "Mês passado";
    
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
    }
    
    return format(dateRange.from, "dd/MM/yyyy");
  };

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <Select value={filterOption} onValueChange={handleFilterOptionChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filtrar por período" />
        </SelectTrigger>
        <SelectContent className="overflow-y-auto">
          <SelectItem value="thisWeek">Esta semana</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="lastMonth">Mês passado</SelectItem>
          <SelectItem value="maximum">Máximo</SelectItem>
          <SelectItem value="custom">Período personalizado</SelectItem>
        </SelectContent>
      </Select>

      {filterOption === 'custom' && (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[280px] justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(range) => {
                if (range) {
                  handleDateRangeChange({ from: range.from, to: range.to });
                } else {
                  handleDateRangeChange({ from: undefined, to: undefined });
                }
              }}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {(filterOption && (dateRange.from || dateRange.to)) && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilter}
          className="w-full sm:w-auto"
        >
          Limpar filtro
        </Button>
      )}
    </div>
  );
}
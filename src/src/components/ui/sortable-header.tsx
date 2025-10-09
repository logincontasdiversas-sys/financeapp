import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

export const SortableHeader = ({
  label,
  sortKey,
  currentSort,
  sortDirection,
  onSort,
  className
}: SortableHeaderProps) => {
  const isActive = currentSort === sortKey;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1 cursor-pointer hover:text-foreground/80 select-none",
        isActive && "text-foreground",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      {isActive ? (
        sortDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </div>
  );
};
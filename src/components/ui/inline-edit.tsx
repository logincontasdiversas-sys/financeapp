import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Button } from "./button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineEditTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function InlineEditText({ value, onSave, className, placeholder }: InlineEditTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm"
          placeholder={placeholder}
        />
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[24px] inline-block transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {value || placeholder}
    </span>
  );
}

interface InlineEditNumberProps {
  value: number;
  onSave: (value: number) => void;
  className?: string;
  formatValue?: (value: number) => string;
}

export function InlineEditNumber({ value, onSave, className, formatValue }: InlineEditNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue !== value) {
      onSave(numValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm w-24"
        />
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[24px] inline-block transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {formatValue ? formatValue(value) : value}
    </span>
  );
}

interface InlineEditDateProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  formatValue?: (value: string) => string;
}

export function InlineEditDate({ value, onSave, className, formatValue }: InlineEditDateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-8 text-sm w-32"
        />
        <Button size="sm" variant="ghost" onClick={handleSave} className="h-6 w-6 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 w-6 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[24px] inline-block transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {formatValue ? formatValue(value) : value}
    </span>
  );
}

interface Option {
  value: string;
  label: string;
}

interface InlineEditSelectProps {
  value: string;
  options: Option[];
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  getDisplayValue?: (value: string) => string;
}

export function InlineEditSelect({ 
  value, 
  options, 
  onSave, 
  className, 
  placeholder,
  getDisplayValue 
}: InlineEditSelectProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleValueChange = (newValue: string) => {
    // Converter o valor especial "__none__" de volta para string vazia
    const actualValue = newValue === "__none__" ? "" : newValue;
    if (actualValue !== value) {
      onSave(actualValue);
    }
    setIsEditing(false);
  };

  const displayValue = getDisplayValue ? getDisplayValue(value) : 
    options.find(opt => opt.value === (value || "__none__"))?.label || placeholder || "Selecionar...";

  if (isEditing) {
    // Converter string vazia para o valor especial "__none__" para o Select
    const selectValue = value || "__none__";
    
    return (
      <Select value={selectValue} onValueChange={handleValueChange} open={isEditing} onOpenChange={setIsEditing}>
        <SelectTrigger className="h-8 text-sm w-auto min-w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[24px] inline-block transition-colors",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      {displayValue}
    </span>
  );
}
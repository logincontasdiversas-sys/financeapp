import React from 'react';
import { ImportCSV } from './ImportCSV';

interface ImportCSVDespesasProps {
  onImportComplete?: () => void;
}

export const ImportCSVDespesas: React.FC<ImportCSVDespesasProps> = ({ onImportComplete }) => {
  // Componente wrapper que força o tipo para despesas
  return (
    <ImportCSV 
      defaultTransactionType="expense"
      onImportComplete={onImportComplete}
    />
  );
};

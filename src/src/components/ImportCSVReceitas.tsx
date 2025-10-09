import React from 'react';
import { ImportCSV } from './ImportCSV';

interface ImportCSVReceitasProps {
  onImportComplete?: () => void;
}

export const ImportCSVReceitas: React.FC<ImportCSVReceitasProps> = ({ onImportComplete }) => {
  // Componente wrapper que força o tipo para receitas
  return (
    <ImportCSV 
      defaultTransactionType="income"
      onImportComplete={onImportComplete}
    />
  );
};
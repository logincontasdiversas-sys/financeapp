import React, { useState, useEffect } from 'react';
import { parse } from 'csv-parse/browser/esm/sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from '@/hooks/useStableAuth';
import { useTenant } from '@/hooks/useTenant';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { clearQueryCache } from '@/hooks/useSupabaseQuery';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  csvColumn: string;
  systemField: 'title' | 'amount' | 'date' | 'category' | 'bank' | 'note' | 'transaction_type' | 'status' | 'ignore';
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface Bank {
  id: string;
  name: string;
}

interface ProcessedTransaction {
  title: string;
  amount: number;
  date: string;
  category_id?: string;
  bank_id?: string;
  note?: string;
  kind: 'expense' | 'income';
  status: 'settled' | 'pending' | 'scheduled';
  payment_method: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
}

interface ImportCSVProps {
  defaultTransactionType?: 'expense' | 'income' | 'auto';
  onImportComplete?: () => void;
}

export const ImportCSV: React.FC<ImportCSVProps> = ({ 
  defaultTransactionType = 'auto',
  onImportComplete 
}) => {
  const { user } = useStableAuth();
  const { tenantId } = useTenant();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [unmappedCategories, setUnmappedCategories] = useState<string[]>([]);
  const [unmappedBanks, setUnmappedBanks] = useState<string[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<{[key: string]: string}>({});
  const [bankMappings, setBankMappings] = useState<{[key: string]: string}>({});
  const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'auto'>(defaultTransactionType);
  const [defaultStatus, setDefaultStatus] = useState<'settled' | 'pending' | 'scheduled'>('settled');
  const [defaultBankId, setDefaultBankId] = useState<string>('');

  useEffect(() => {
    if (tenantId) {
      loadCategories();
      loadBanks();
    }
  }, [tenantId]);

  const loadCategories = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, emoji')
        .eq('tenant_id', tenantId)
        .eq('archived', false)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadBanks = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split('\n')[0];
    const delimiters = [';', ',', '\t', '|'];
    
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV válido.');
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const delimiter = detectDelimiter(text);
        
        console.log('Delimitador detectado:', delimiter);
        
        const parsed = parse(text, {
          columns: true,
          skip_empty_lines: true,
          delimiter: delimiter,
          quote: '"',
          escape: '"',
          relax_column_count: true
        }) as CSVRow[];

        if (parsed.length === 0) {
          toast.error('O arquivo CSV está vazio ou não pôde ser processado.');
          return;
        }

        const headers = Object.keys(parsed[0]);
        
        // Log para debug - mostra os headers encontrados e a primeira linha
        console.log('Headers encontrados no CSV:', headers);
        console.log('Primeira linha de dados:', parsed[0]);
        console.log('Primeiras 3 linhas:', parsed.slice(0, 3));
        
        setCsvData(parsed);
        setCsvHeaders(headers);
        
        // Auto-mapear colunas com detecção aprimorada
        const autoMappings: ColumnMapping[] = headers.map(header => {
          const originalHeader = header;
          const lowerHeader = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          let systemField: ColumnMapping['systemField'] = 'ignore';
          
          // Título - buscar por diferentes variações incluindo "historico"
          if (lowerHeader.includes('descricao') || 
              lowerHeader.includes('description') || 
              lowerHeader.includes('titulo') || 
              lowerHeader.includes('title') || 
              lowerHeader.includes('nome') ||
              lowerHeader.includes('historico') ||
              lowerHeader.includes('history') ||
              lowerHeader.includes('transacao') ||
              lowerHeader.includes('transaction') ||
              lowerHeader === 'descr' ||
              lowerHeader === 'desc') {
            systemField = 'title';
          } 
          // Valor - buscar por diferentes variações
          else if (lowerHeader.includes('valor') || 
                   lowerHeader.includes('value') || 
                   lowerHeader.includes('amount') || 
                   lowerHeader.includes('quantia') ||
                   lowerHeader.includes('montante') ||
                   lowerHeader.includes('preco') ||
                   lowerHeader.includes('price') ||
                   lowerHeader === 'val' ||
                   lowerHeader.includes('credito') ||
                   lowerHeader.includes('debito')) {
            systemField = 'amount';
          } 
          // Data - buscar por diferentes variações
          else if (lowerHeader.includes('data') || 
                   lowerHeader.includes('date') ||
                   lowerHeader.includes('vencimento') ||
                   lowerHeader.includes('emissao') ||
                   lowerHeader.includes('lancamento') ||
                   lowerHeader === 'dt' ||
                   lowerHeader === 'dia') {
            systemField = 'date';
          } 
          // Categoria
          else if (lowerHeader.includes('categoria') || 
                   lowerHeader.includes('category') ||
                   lowerHeader.includes('classificacao') ||
                   lowerHeader === 'cat') {
            systemField = 'category';
          } 
          // Banco - buscar por diferentes variações
          else if (lowerHeader.includes('banco') || 
                   lowerHeader.includes('bank') ||
                   lowerHeader.includes('conta') ||
                   lowerHeader.includes('account') ||
                   lowerHeader.includes('instituicao') ||
                   lowerHeader.includes('agencia')) {
            systemField = 'bank';
          } 
          // Observações
          else if (lowerHeader.includes('nota') || 
                   lowerHeader.includes('note') || 
                   lowerHeader.includes('observacao') ||
                   lowerHeader.includes('obs') ||
                   lowerHeader.includes('comentario') ||
                   lowerHeader.includes('memo')) {
            systemField = 'note';
          } 
          // Tipo de transação
          else if (lowerHeader.includes('tipo') || 
                   lowerHeader.includes('type') ||
                   lowerHeader.includes('natureza') ||
                   lowerHeader.includes('operacao')) {
            systemField = 'transaction_type';
          } 
          // Status
          else if (lowerHeader.includes('status') || 
                   lowerHeader.includes('situacao') ||
                   lowerHeader.includes('estado') ||
                   lowerHeader.includes('pago') ||
                   lowerHeader.includes('pendente') ||
                   lowerHeader.includes('agendado') ||
                   lowerHeader.includes('liquidado') ||
                   lowerHeader.includes('processado')) {
            systemField = 'status';
          }
          
          console.log(`Mapeamento - Coluna: "${originalHeader}" -> Campo: "${systemField}"`);
          
          return { csvColumn: header, systemField };
        });
        
        setMappings(autoMappings);
        setStep(2);
        toast.success(`Arquivo carregado com ${parsed.length} transações.`);
      } catch (error) {
        console.error('Erro ao processar CSV:', error);
        toast.error('Erro ao processar o arquivo CSV. Verifique o formato.');
      }
    };
    
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (!csvFile) {
      toast.error('Por favor, arraste um arquivo CSV válido.');
      return;
    }

    processFile(csvFile);
  };

  const updateMapping = (csvColumn: string, systemField: ColumnMapping['systemField']) => {
    setMappings(prev => 
      prev.map(mapping => 
        mapping.csvColumn === csvColumn 
          ? { ...mapping, systemField }
          : mapping
      )
    );
  };

  const analyzeUnmappedData = () => {
    const categoryMapping = mappings.find(m => m.systemField === 'category');
    const bankMapping = mappings.find(m => m.systemField === 'bank');

    // Analisar categorias não mapeadas
    const unmappedCats = new Set<string>();
    if (categoryMapping) {
      csvData.forEach(row => {
        const categoryName = row[categoryMapping.csvColumn];
        if (categoryName && !categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
          unmappedCats.add(categoryName);
        }
      });
    }

    // Analisar bancos não mapeados
    const unmappedBnks = new Set<string>();
    if (bankMapping) {
      csvData.forEach(row => {
        const bankName = row[bankMapping.csvColumn];
        if (bankName && !banks.find(b => b.name.toLowerCase() === bankName.toLowerCase())) {
          unmappedBnks.add(bankName);
        }
      });
    }

    setUnmappedCategories(Array.from(unmappedCats));
    setUnmappedBanks(Array.from(unmappedBnks));
    
    if (unmappedCats.size > 0 || unmappedBnks.size > 0) {
      setStep(3);
    } else {
      setStep(4);
    }
  };

  const findBestMatch = (value: string, options: Array<{id: string, name: string}>) => {
    if (!value || !options.length) return null;
    
    const normalizedValue = value.toLowerCase().trim();
    
    // Busca exata
    let match = options.find(option => 
      option.name.toLowerCase() === normalizedValue
    );
    
    if (match) return match;
    
    // Busca parcial
    match = options.find(option => 
      option.name.toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(option.name.toLowerCase())
    );
    
    return match;
  };

  const processTransactions = (): ProcessedTransaction[] => {
    if (!user?.id || !tenantId) return [];

    const titleMapping = mappings.find(m => m.systemField === 'title');
    const amountMapping = mappings.find(m => m.systemField === 'amount');
    const dateMapping = mappings.find(m => m.systemField === 'date');
    const categoryMapping = mappings.find(m => m.systemField === 'category');
    const bankMapping = mappings.find(m => m.systemField === 'bank');
    const noteMapping = mappings.find(m => m.systemField === 'note');
    const typeMapping = mappings.find(m => m.systemField === 'transaction_type');
    const statusMapping = mappings.find(m => m.systemField === 'status');

    return csvData.map((row, index) => {
      const title = titleMapping ? (row[titleMapping.csvColumn]?.trim() || `Transação ${index + 1}`) : `Transação ${index + 1}`;
      
      // Debug log detalhado para todas as colunas
      if (index < 5) {
        console.log(`[IMPORTAÇÃO] Processando linha ${index + 1}:`, {
          dadosOriginais: row,
          mapeamentos: {
            titulo: titleMapping ? `${titleMapping.csvColumn} => ${row[titleMapping.csvColumn]}` : 'não mapeado',
            valor: amountMapping ? `${amountMapping.csvColumn} => ${row[amountMapping.csvColumn]}` : 'não mapeado',
            data: dateMapping ? `${dateMapping.csvColumn} => ${row[dateMapping.csvColumn]}` : 'não mapeado',
            banco: bankMapping ? `${bankMapping.csvColumn} => ${row[bankMapping.csvColumn]}` : 'não mapeado',
          }
        });
      }
      
      let amount = 0;
      if (amountMapping) {
        const rawValue = row[amountMapping.csvColumn];
        // Tratar diferentes formatos de valores monetários
        let amountStr = rawValue
          ?.toString()
          .replace(/R\$/gi, '') // Remove R$
          .replace(/\s/g, '') // Remove espaços
          .trim();
        
        // Se o valor usa vírgula como separador decimal (padrão brasileiro)
        if (amountStr && amountStr.includes(',')) {
          // Se tem ponto e vírgula, assumir que ponto é separador de milhares
          if (amountStr.includes('.') && amountStr.indexOf('.') < amountStr.indexOf(',')) {
            amountStr = amountStr.replace(/\./g, ''); // Remove pontos (separador de milhares)
          }
          amountStr = amountStr.replace(',', '.'); // Substitui vírgula por ponto
        }
        
        amount = Math.abs(parseFloat(amountStr) || 0);
        
        if (index < 5) {
          console.log(`[VALOR] Conversão: "${rawValue}" -> "${amountStr}" -> ${amount}`);
        }
      }
      
      let date = new Date().toISOString().split('T')[0];
      if (dateMapping) {
        const dateStr = row[dateMapping.csvColumn];
        if (dateStr) {
          // Tratar diferentes formatos de data brasileiros
          let parsedDate: Date | null = null;
          
          // Formato DD/MM/YYYY ou DD/MM/YY
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado
              let year = parseInt(parts[2], 10);
              
              // Se ano tem 2 dígitos, assumir 20XX
              if (year < 100) {
                year += 2000;
              }
              
              parsedDate = new Date(year, month, day);
            }
          }
          // Formato DD-MM-YYYY
          else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              // Tentar primeiro DD-MM-YYYY
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2], 10);
              
              if (day <= 31 && month >= 0 && month <= 11) {
                parsedDate = new Date(year, month, day);
              } else {
                // Senão, tentar YYYY-MM-DD
                parsedDate = new Date(dateStr);
              }
            }
          }
          // Outros formatos
          else {
            parsedDate = new Date(dateStr);
          }
          
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split('T')[0];
          }
        }
      }
      
      let category_id: string | undefined;
      if (categoryMapping) {
        const categoryValue = row[categoryMapping.csvColumn];
        if (categoryValue) {
          const categoryMatch = findBestMatch(categoryValue, categories);
          if (categoryMatch) {
            category_id = categoryMatch.id;
          } else if (categoryMappings[categoryValue]) {
            category_id = categoryMappings[categoryValue];
          }
        }
      }
      
      let bank_id: string | undefined;
      if (bankMapping) {
        const bankValue = row[bankMapping.csvColumn];
        if (bankValue) {
          const bankMatch = findBestMatch(bankValue, banks);
          if (bankMatch) {
            bank_id = bankMatch.id;
          } else if (bankMappings[bankValue]) {
            bank_id = bankMappings[bankValue];
          }
        }
      }
      
      const note = noteMapping ? row[noteMapping.csvColumn] : undefined;
      
      // Processar status
      let status: 'settled' | 'pending' | 'scheduled' = defaultStatus;
      if (statusMapping) {
        const statusValue = row[statusMapping.csvColumn]?.toLowerCase().trim();
        if (statusValue) {
          if (statusValue.includes('pago') || statusValue.includes('liquidado') || statusValue.includes('processado') || statusValue.includes('settled')) {
            status = 'settled';
          } else if (statusValue.includes('pendente') || statusValue.includes('pending') || statusValue.includes('aguardando')) {
            status = 'pending';
          } else if (statusValue.includes('agendado') || statusValue.includes('scheduled') || statusValue.includes('programado')) {
            status = 'scheduled';
          }
        }
      }
      
      let kind: 'expense' | 'income' = 'expense';
      
      // Determinar tipo baseado na configuração selecionada
      if (transactionType === 'expense') {
        kind = 'expense';
      } else if (transactionType === 'income') {
        kind = 'income';
      } else if (transactionType === 'auto' && typeMapping) {
        const typeValue = row[typeMapping.csvColumn]?.toLowerCase();
        if (typeValue?.includes('receita') || typeValue?.includes('income') || typeValue?.includes('entrada')) {
          kind = 'income';
        }
      }

      // Usar banco padrão se não foi mapeado do CSV
      const finalBankId = bank_id || (defaultBankId && defaultBankId !== 'none' ? defaultBankId : undefined);
      
      // Função inteligente para interpretar forma de pagamento
      const interpretPaymentMethod = (description: string, bankId?: string): string => {
        if (!description) return bankId ? 'Débito em conta' : 'Dinheiro';
        
        const desc = description.toLowerCase();
        
        // Débito em conta - várias variações
        if (desc.includes('débito') || desc.includes('debito') || 
            desc.includes('débito em conta') || desc.includes('debito em conta') ||
            desc.includes('conta corrente') || desc.includes('conta poupança') ||
            desc.includes('transferência') || desc.includes('transferencia') ||
            desc.includes('ted') || desc.includes('doc')) {
          return 'Débito em conta';
        }
        
        // PIX - várias variações
        if (desc.includes('pix') || desc.includes('pagamento instantâneo') ||
            desc.includes('pagamento instantaneo')) {
          return 'PIX';
        }
        
        // Cartão de crédito
        if (desc.includes('cartão') || desc.includes('cartao') ||
            desc.includes('crédito') || desc.includes('credito') ||
            desc.includes('visa') || desc.includes('mastercard') ||
            desc.includes('american express') || desc.includes('elo')) {
          return 'Cartão de crédito';
        }
        
        // Cartão de débito
        if (desc.includes('débito') && (desc.includes('cartão') || desc.includes('cartao'))) {
          return 'Cartão de débito';
        }
        
        // Dinheiro
        if (desc.includes('dinheiro') || desc.includes('espécie') || 
            desc.includes('especie') || desc.includes('cash') ||
            desc.includes('efetivo') || desc.includes('efectivo')) {
          return 'Dinheiro';
        }
        
        // Boleto
        if (desc.includes('boleto') || desc.includes('pagamento bancário') ||
            desc.includes('pagamento bancario')) {
          return 'Boleto';
        }
        
        // Se tem banco associado, assume débito em conta
        if (bankId) {
          return 'Débito em conta';
        }
        
        // Padrão: dinheiro
        return 'Dinheiro';
      };
      
      const paymentMethod = interpretPaymentMethod(note || title, finalBankId);
      
      const transaction = {
        title,
        amount,
        date,
        category_id,
        bank_id: finalBankId,
        note,
        kind,
        status,
        payment_method: paymentMethod,
        user_id: user.id,
        tenant_id: tenantId,
        created_at: new Date().toISOString()
      };

      // Log detalhado da transação final
      if (index < 5) {
        console.log(`[TRANSAÇÃO FINAL ${index + 1}]:`, {
          título: transaction.title,
          valor: transaction.amount,
          data: transaction.date,
          banco: transaction.bank_id || 'Sem banco',
          status: transaction.status,
          tipo: transaction.kind,
          forma_pagamento: transaction.payment_method
        });
      }

      return transaction;
    });
  };

  const handleImport = async () => {
    if (!user?.id || !tenantId) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setIsImporting(true);
    
    try {
      const transactions = processTransactions();
      
      if (transactions.length === 0) {
        toast.error('Nenhuma transação para importar.');
        return;
      }

      // Criar categorias não mapeadas
      for (const categoryName of unmappedCategories) {
        if (!categoryMappings[categoryName]) {
          const { data, error } = await supabase
            .from('categories')
            .insert({
              name: categoryName,
              emoji: '📦',
              tenant_id: tenantId,
              archived: false
            })
            .select()
            .single();

          if (error) throw error;
          setCategoryMappings(prev => ({ ...prev, [categoryName]: data.id }));
        }
      }

      // Criar bancos não mapeados
      for (const bankName of unmappedBanks) {
        if (!bankMappings[bankName]) {
          const { data, error } = await supabase
            .from('banks')
            .insert({
              name: bankName,
              tenant_id: tenantId,
              user_id: user.id,
              balance: 0
            })
            .select()
            .single();

          if (error) throw error;
          setBankMappings(prev => ({ ...prev, [bankName]: data.id }));
        }
      }

      // Inserir transações
      const { error } = await supabase
        .from('transactions')
        .insert(transactions);

      if (error) throw error;

      toast.success(`${transactions.length} transações importadas com sucesso!`);
      
      // Invalidar cache para atualizar dados na interface
      clearQueryCache();
      
      // Reset and close dialog
      resetImport();
      setIsDialogOpen(false);
      
      // Chamar callback se fornecido
      if (onImportComplete) {
        onImportComplete();
      }
      
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar transações. Tente novamente.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setMappings([]);
    setUnmappedCategories([]);
    setUnmappedBanks([]);
    setCategoryMappings({});
    setBankMappings({});
    setIsDragOver(false);
    setTransactionType(defaultTransactionType);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetImport();
    }
  };

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Passo 1: Selecionar Arquivo CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full ${isDragOver ? 'bg-primary/10' : 'bg-muted'}`}>
              <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragOver ? 'Solte o arquivo aqui' : 'Arraste seu arquivo CSV aqui'}
              </p>
              <p className="text-sm text-muted-foreground">
                ou clique no botão abaixo para selecionar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file" className="sr-only">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => document.getElementById('csv-file')?.click()}
                type="button"
              >
                <FileText className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        </div>
        
        {file && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Arquivo selecionado: <strong>{file.name}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="transaction-type">Tipo de Lançamento</Label>
          <Select value={transactionType} onValueChange={(value: 'expense' | 'income' | 'auto') => setTransactionType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="overflow-y-auto">
              <SelectItem value="auto">Automático (baseado nos dados)</SelectItem>
              <SelectItem value="expense">Todas como Despesas</SelectItem>
              <SelectItem value="income">Todas como Receitas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-status">Status Padrão</Label>
          <Select value={defaultStatus} onValueChange={(value: 'settled' | 'pending' | 'scheduled') => setDefaultStatus(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="settled">✅ Pago/Recebido</SelectItem>
              <SelectItem value="pending">⏳ Pendente</SelectItem>
              <SelectItem value="scheduled">📅 Agendado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Status que será aplicado a todas as transações (exceto se houver coluna de status no CSV)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-bank">Banco Padrão (Opcional)</Label>
          <Select value={defaultBankId} onValueChange={setDefaultBankId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um banco padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem banco padrão</SelectItem>
              {banks.map(bank => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Banco que será aplicado a todas as transações (exceto se houver coluna de banco no CSV)
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O arquivo CSV deve conter colunas como: título/descrição, valor, data, categoria, banco, etc.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => {
    // Preparar exemplo de dados mapeados
    const exampleData = csvData.slice(0, 3).map((row, index) => {
      const titleMapping = mappings.find(m => m.systemField === 'title');
      const amountMapping = mappings.find(m => m.systemField === 'amount');
      const dateMapping = mappings.find(m => m.systemField === 'date');
      const bankMapping = mappings.find(m => m.systemField === 'bank');
      
      return {
        title: titleMapping ? row[titleMapping.csvColumn] : 'Não mapeado',
        amount: amountMapping ? row[amountMapping.csvColumn] : 'Não mapeado',
        date: dateMapping ? row[dateMapping.csvColumn] : 'Não mapeado',
        bank: bankMapping ? row[bankMapping.csvColumn] : '',
        original: row
      };
    });
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Passo 2: Mapear Colunas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mapeie as colunas do seu CSV para os campos do sistema:
          </p>
          
          <div className="space-y-3">
            {csvHeaders.map((header) => {
              const mapping = mappings.find(m => m.csvColumn === header);
              const sampleValue = csvData[0] ? csvData[0][header] : '';
              return (
                <div key={header} className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-1/3">
                      <Badge variant="outline">{header}</Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="w-2/3">
                      <Select
                        value={mapping?.systemField || 'ignore'}
                        onValueChange={(value) => updateMapping(header, value as ColumnMapping['systemField'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="overflow-y-auto">
                          <SelectItem value="ignore">🚫 Ignorar</SelectItem>
                          <SelectItem value="title">📝 Título/Descrição</SelectItem>
                          <SelectItem value="amount">💰 Valor</SelectItem>
                          <SelectItem value="date">📅 Data</SelectItem>
                          <SelectItem value="category">🏷️ Categoria</SelectItem>
                          <SelectItem value="bank">🏦 Banco</SelectItem>
                          <SelectItem value="note">📋 Observação</SelectItem>
                          <SelectItem value="transaction_type">🔄 Tipo (Receita/Despesa)</SelectItem>
                          <SelectItem value="status">✅ Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {sampleValue && (
                    <div className="ml-4 text-xs text-muted-foreground">
                      Exemplo: "{sampleValue.substring(0, 50)}{sampleValue.length > 50 ? '...' : ''}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prévia dos dados mapeados */}
          <div className="mt-6 space-y-2">
            <h4 className="font-medium text-sm">Prévia dos dados mapeados (primeiras 3 linhas):</h4>
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              {exampleData.map((data, index) => (
                <div key={index} className="pb-2 border-b last:border-0">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Título:</span>
                    <span className="font-medium">{data.title}</span>
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{data.amount}</span>
                    <span className="text-muted-foreground">Data:</span>
                    <span className="font-medium">{data.date}</span>
                    {data.bank && (
                      <>
                        <span className="text-muted-foreground">Banco:</span>
                        <span className="font-medium">{data.bank}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Verifique se os campos estão mapeados corretamente. Ajuste o mapeamento se necessário.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={analyzeUnmappedData}>
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Passo 3: Resolver Conflitos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {unmappedCategories.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Categorias não encontradas:</h3>
            <div className="space-y-2">
              {unmappedCategories.map((categoryName) => (
                <div key={categoryName} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="outline">{categoryName}</Badge>
                  <span className="text-sm text-muted-foreground">será criada automaticamente</span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {unmappedBanks.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Bancos não encontrados:</h3>
            <div className="space-y-2">
              {unmappedBanks.map((bankName) => (
                <div key={bankName} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Badge variant="outline">{bankName}</Badge>
                  <span className="text-sm text-muted-foreground">será criado automaticamente</span>
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => setStep(2)}>
            Voltar
          </Button>
          <Button onClick={() => setStep(4)}>
            Continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => {
    const transactions = processTransactions();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Passo 4: Confirmar Importação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>{transactions.length} transações</strong> serão importadas.
              {unmappedCategories.length > 0 && (
                <><br />• {unmappedCategories.length} novas categorias serão criadas</>
              )}
              {unmappedBanks.length > 0 && (
                <><br />• {unmappedBanks.length} novos bancos serão criados</>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">Preview das primeiras 5 transações:</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 grid grid-cols-4 gap-2 text-sm font-medium">
                <div>Título</div>
                <div>Valor</div>
                <div>Data</div>
                <div>Tipo</div>
              </div>
              {transactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="p-2 grid grid-cols-4 gap-2 text-sm border-t">
                  <div className="truncate">{transaction.title}</div>
                  <div>R$ {transaction.amount.toFixed(2)}</div>
                  <div>{new Date(transaction.date).toLocaleDateString('pt-BR')}</div>
                  <div>
                    <Badge variant={transaction.kind === 'income' ? 'default' : 'secondary'}>
                      {transaction.kind === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep(unmappedCategories.length > 0 || unmappedBanks.length > 0 ? 3 : 2)}>
              Voltar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || transactions.length === 0}
              className="flex-1"
            >
              {isImporting ? 'Importando...' : `Importar ${transactions.length} Transações`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Transações via CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2">
            {[1, 2, 3, 4].map((num) => (
              <React.Fragment key={num}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > num ? <Check className="h-4 w-4" /> : num}
                </div>
                {num < 4 && (
                  <div className={`w-12 h-0.5 ${
                    step > num ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Steps */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
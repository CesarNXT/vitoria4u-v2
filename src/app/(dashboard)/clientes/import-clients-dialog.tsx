'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; nome: string; telefone: string; erro: string }>
}

interface ImportClientsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (clients: Array<{ name: string; phone: number }>) => Promise<void>
  existingPhones: number[]
}

export function ImportClientsDialog({
  open,
  onOpenChange,
  onImport,
  existingPhones,
}: ImportClientsDialogProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [sheetData, setSheetData] = useState<any[][]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [nameColumn, setNameColumn] = useState<string>('')
  const [phoneColumn, setPhoneColumn] = useState<string>('')
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'result'>('upload')
  const [validClients, setValidClients] = useState<Array<{ name: string; phone: number }>>([])
  const [invalidClients, setInvalidClients] = useState<Array<{ row: number; nome: string; telefone: string; erro: string }>>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ]

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        variant: 'destructive',
        title: 'Arquivo Inválido',
        description: 'Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV (.csv).',
      })
      return
    }

    setFile(selectedFile)
    readFile(selectedFile)
  }

  const readFile = (file: File) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        
        if (!sheetName) {
          toast({
            variant: 'destructive',
            title: 'Planilha Vazia',
            description: 'A planilha não contém dados.',
          })
          return
        }
        
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          toast({
            variant: 'destructive',
            title: 'Erro ao Ler Planilha',
            description: 'Não foi possível acessar os dados da planilha.',
          })
          return
        }
        
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length === 0 || !jsonData[0]) {
          toast({
            variant: 'destructive',
            title: 'Planilha Vazia',
            description: 'A planilha não contém dados.',
          })
          return
        }

        // Primeira linha = cabeçalhos
        const headers = jsonData[0].map((h: any) => String(h || '').trim())
        setColumns(headers)
        setSheetData(jsonData)
        setStep('mapping')
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Ler Arquivo',
          description: 'Não foi possível processar o arquivo. Verifique se está no formato correto.',
        })
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const validatePhoneNumber = (phone: string): number | null => {
    // Remove TUDO que não é número
    let cleaned = String(phone).replace(/\D/g, '')
    
    // Remove DDI 55 se presente (13 dígitos começando com 55)
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      cleaned = cleaned.substring(2)
    }
    
    // Limita a 11 dígitos
    cleaned = cleaned.slice(0, 11)
    
    // Deve ter exatamente 11 dígitos
    if (cleaned.length !== 11) {
      return null
    }

    const phoneNumber = parseInt(cleaned, 10)
    if (isNaN(phoneNumber)) {
      return null
    }

    return phoneNumber
  }

  const processData = () => {
    if (!nameColumn || !phoneColumn) {
      toast({
        variant: 'destructive',
        title: 'Seleção Incompleta',
        description: 'Por favor, selecione as colunas de Nome e Telefone.',
      })
      return
    }

    const nameIndex = columns.indexOf(nameColumn)
    const phoneIndex = columns.indexOf(phoneColumn)

    if (nameIndex === -1 || phoneIndex === -1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Colunas selecionadas não encontradas.',
      })
      return
    }

    const valid: Array<{ name: string; phone: number }> = []
    const invalid: Array<{ row: number; nome: string; telefone: string; erro: string }> = []

    // Pular linha de cabeçalho (índice 0)
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i]
      
      if (!row) continue
      
      const nome = String(row[nameIndex] || '').trim()
      const telefone = String(row[phoneIndex] || '').trim()

      // Validar nome
      if (!nome) {
        invalid.push({
          row: i + 1,
          nome: nome || '(vazio)',
          telefone: telefone || '(vazio)',
          erro: 'Nome vazio',
        })
        continue
      }

      // Validar telefone
      if (!telefone) {
        invalid.push({
          row: i + 1,
          nome,
          telefone: '(vazio)',
          erro: 'Telefone vazio',
        })
        continue
      }

      const validatedPhone = validatePhoneNumber(telefone)
      if (!validatedPhone) {
        invalid.push({
          row: i + 1,
          nome,
          telefone,
          erro: 'Telefone deve ter 11 dígitos (DDD + 9 + número)',
        })
        continue
      }

      // Verificar duplicata na planilha
      if (valid.some((c) => c.phone === validatedPhone)) {
        invalid.push({
          row: i + 1,
          nome,
          telefone,
          erro: 'Telefone duplicado na planilha',
        })
        continue
      }

      // Verificar duplicata no sistema
      if (existingPhones.includes(validatedPhone)) {
        invalid.push({
          row: i + 1,
          nome,
          telefone,
          erro: 'Telefone já cadastrado no sistema',
        })
        continue
      }

      valid.push({ name: nome, phone: validatedPhone })
    }

    setValidClients(valid)
    setInvalidClients(invalid)
    setStep('preview')
  }

  const handleImport = async () => {
    if (validClients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum Cliente Válido',
        description: 'Não há clientes válidos para importar.',
      })
      return
    }

    setStep('importing')

    try {
      await onImport(validClients)
      
      setImportResult({
        success: validClients.length,
        failed: invalidClients.length,
        errors: invalidClients,
      })
      setStep('result')
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: 'Ocorreu um erro ao importar os clientes. Tente novamente.',
      })
      setStep('preview')
    }
  }

  const resetDialog = () => {
    setFile(null)
    setSheetData([])
    setColumns([])
    setNameColumn('')
    setPhoneColumn('')
    setValidClients([])
    setInvalidClients([])
    setImportResult(null)
    setStep('upload')
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>
            Importe múltiplos clientes de uma planilha Excel ou CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-sm font-medium">
                      Clique para selecionar ou arraste o arquivo
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Arquivos suportados: Excel (.xlsx, .xls) ou CSV (.csv)
                    </div>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {file && (
                  <div className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium">{file.name}</span>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Requisitos para importação:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>A planilha deve conter uma linha de cabeçalho</li>
                      <li><strong>Nome:</strong> obrigatório</li>
                      <li><strong>Telefone:</strong> obrigatório, deve ter exatamente 11 dígitos (DDD + 9 + número)</li>
                      <li>Telefones duplicados serão ignorados</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Selecione em qual coluna da sua planilha está o <strong>Nome</strong> e o <strong>Telefone</strong> dos clientes.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Coluna do Nome *</Label>
                  <Select value={nameColumn} onValueChange={setNameColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna com o nome" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna do Telefone *</Label>
                  <Select value={phoneColumn} onValueChange={setPhoneColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna com o telefone" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={processData} disabled={!nameColumn || !phoneColumn} className="flex-1">
                  Processar Dados
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Válidos: {validClients.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clientes que serão importados
                  </p>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Inválidos: {invalidClients.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clientes que serão ignorados
                  </p>
                </div>
              </div>

              {validClients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-green-600 font-semibold">✅ Clientes Válidos (primeiros 10)</Label>
                  <div className="h-32 border rounded-lg p-2 overflow-y-auto">
                    <div className="space-y-1 text-sm">
                      {validClients.slice(0, 10).map((client, idx) => (
                        <div key={idx} className="flex justify-between py-1">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-muted-foreground">{client.phone}</span>
                        </div>
                      ))}
                      {validClients.length > 10 && (
                        <p className="text-muted-foreground italic pt-2">
                          ... e mais {validClients.length - 10} clientes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {invalidClients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-red-600 font-semibold">❌ Clientes Inválidos</Label>
                  <div className="h-40 border rounded-lg p-2 overflow-y-auto">
                    <div className="space-y-2 text-sm">
                      {invalidClients.map((client, idx) => (
                        <div key={idx} className="border-b pb-2 last:border-0">
                          <div className="font-medium">Linha {client.row}</div>
                          <div className="text-muted-foreground">
                            Nome: {client.nome} | Tel: {client.telefone}
                          </div>
                          <div className="text-red-600 text-xs">Erro: {client.erro}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep('mapping')} className="flex-1">
                  Voltar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validClients.length === 0}
                  className="flex-1"
                >
                  Importar {validClients.length} Cliente(s)
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Upload className="h-12 w-12 animate-pulse text-primary" />
              <p className="text-lg font-medium">Importando clientes...</p>
              <p className="text-sm text-muted-foreground">Por favor, aguarde.</p>
            </div>
          )}

          {step === 'result' && importResult && (
            <div className="space-y-4 py-4">
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-semibold">Importação Concluída!</p>
                  <p className="text-sm">
                    {importResult.success} cliente(s) importado(s) com sucesso.
                  </p>
                </AlertDescription>
              </Alert>

              {importResult.failed > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold">{importResult.failed} cliente(s) não foram importados</p>
                    <p className="text-sm mt-1">Verifique os erros acima e corrija na planilha.</p>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleClose} className="w-full">
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

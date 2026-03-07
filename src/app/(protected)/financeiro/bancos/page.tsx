'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  listarBancos,
  getTotalBancos,
  criarBanco,
  editarBanco,
  toggleBancoAtivo,
} from '@/actions/bancos'
import { formatCurrency } from '@/lib/formatters'
import { Building2, Plus, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BankWithBalance {
  id: string
  name: string
  initial_balance: number
  is_active: boolean
  saldo: number
}

export default function BancosPage() {
  const [banks, setBanks] = useState<BankWithBalance[]>([])
  const [totalBancos, setTotalBancos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)

    const [banksData, total] = await Promise.all([
      listarBancos(),
      getTotalBancos(),
    ])

    setBanks(banksData)
    setTotalBancos(total)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = () => {
    setName('')
    setEditingId(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setDialogOpen(true)
  }

  const handleEdit = (bank: BankWithBalance) => {
    setEditingId(bank.id)
    setName(bank.name)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do banco')
      return
    }

    setSaving(true)

    if (editingId) {
      const result = await editarBanco(editingId, { name: name.trim() })

      if (result.success) {
        toast.success('Banco atualizado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao atualizar banco')
      }
    } else {
      const result = await criarBanco({ name: name.trim() })

      if (result.success) {
        toast.success('Banco criado com sucesso!')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        toast.error(result.error || 'Erro ao criar banco')
      }
    }

    setSaving(false)
  }

  const handleToggleAtivo = async (id: string) => {
    const result = await toggleBancoAtivo(id)

    if (result.success) {
      loadData()
    } else {
      toast.error(result.error || 'Erro ao alterar status')
    }
  }

  const bankAtivos = banks.filter((b) => b.is_active)
  const bankInativos = banks.filter((b) => !b.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bancos</h1>
          <p className="text-gray-500">Gerencie as contas bancárias</p>
        </div>

        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Banco
        </Button>
      </div>

      {/* Card de total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Saldo Total (Bancos Ativos)
          </CardTitle>
          <div className="p-2 rounded-lg bg-green-50">
            <Building2 className="h-4 w-4 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalBancos)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {bankAtivos.length} banco{bankAtivos.length !== 1 ? 's' : ''} ativo{bankAtivos.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Lista de bancos ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Bancos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : bankAtivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Building2 className="h-8 w-8 mb-2 opacity-50" />
              <p>Nenhum banco ativo</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAtivos.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(bank.initial_balance)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span className={bank.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(bank.saldo)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(bank)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={bank.is_active}
                          onCheckedChange={() => handleToggleAtivo(bank.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lista de bancos inativos */}
      {bankInativos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-500">Bancos Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankInativos.map((bank) => (
                  <TableRow key={bank.id} className="opacity-60">
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(bank.initial_balance)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(bank.saldo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-gray-500">
                        Inativo
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(bank)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={bank.is_active}
                          onCheckedChange={() => handleToggleAtivo(bank.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize os dados do banco'
                : 'Adicione uma nova conta bancária'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Banco</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Banco do Brasil, Itaú, ChipPix..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                'Atualizar'
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  listarHistorico,
  getTabelasComLog,
  getUsuariosComLog,
} from '@/actions/historico'
import { formatTableName, formatAction } from '@/lib/historico-utils'
import { History, Filter, Eye, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLogEntry {
  id: string
  created_at: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  user: {
    name: string
  } | null
}

interface Usuario {
  id: string
  name: string
}

const PAGE_SIZE = 20

export default function HistoricoPage() {
  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(
    format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd')
  )
  const [dataFim, setDataFim] = useState(format(hoje, 'yyyy-MM-dd'))
  const [tabela, setTabela] = useState<string>('')
  const [usuario, setUsuario] = useState<string>('')
  const [registros, setRegistros] = useState<AuditLogEntry[]>([])
  const [tabelas, setTabelas] = useState<string[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // Detalhes modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  const loadFiltros = useCallback(async () => {
    const [tabelasData, usuariosData] = await Promise.all([
      getTabelasComLog(),
      getUsuariosComLog(),
    ])
    setTabelas(tabelasData)
    setUsuarios(usuariosData)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)

    const data = await listarHistorico({
      dataInicio,
      dataFim,
      tabela: tabela || undefined,
      usuario: usuario || undefined,
      limit: PAGE_SIZE + 1, // +1 para saber se tem mais
      offset: page * PAGE_SIZE,
    })

    if (data.length > PAGE_SIZE) {
      setHasMore(true)
      setRegistros(data.slice(0, PAGE_SIZE))
    } else {
      setHasMore(false)
      setRegistros(data)
    }

    setLoading(false)
  }, [dataInicio, dataFim, tabela, usuario, page])

  useEffect(() => {
    loadFiltros()
  }, [loadFiltros])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFiltrar = () => {
    setPage(0)
    loadData()
  }

  const handleLimparFiltros = () => {
    setDataInicio(format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd'))
    setDataFim(format(hoje, 'yyyy-MM-dd'))
    setTabela('')
    setUsuario('')
    setPage(0)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-700'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-700'
      case 'DELETE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Ações</h1>
          <p className="text-gray-500">Registro de todas as alterações no sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-500">Tabela</Label>
              <Select
                value={tabela}
                onValueChange={(v) => setTabela(v || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {tabelas.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTableName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Usuário</Label>
              <Select
                value={usuario}
                onValueChange={(v) => setUsuario(v || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleLimparFiltros}>
              Limpar
            </Button>
            <Button onClick={handleFiltrar}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de registros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(registro.created_at), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>{registro.user?.name || 'Sistema'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                            registro.action
                          )}`}
                        >
                          {formatAction(registro.action)}
                        </span>
                      </TableCell>
                      <TableCell>{formatTableName(registro.table_name)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry(registro)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Página {page + 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Data/Hora</Label>
                  <p className="font-medium">
                    {format(new Date(selectedEntry.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Usuário</Label>
                  <p className="font-medium">{selectedEntry.user?.name || 'Sistema'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Ação</Label>
                  <p>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                        selectedEntry.action
                      )}`}
                    >
                      {formatAction(selectedEntry.action)}
                    </span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Tabela</Label>
                  <p className="font-medium">{formatTableName(selectedEntry.table_name)}</p>
                </div>
              </div>

              {selectedEntry.record_id && (
                <div>
                  <Label className="text-sm text-gray-500">ID do Registro</Label>
                  <p className="font-mono text-sm">{selectedEntry.record_id}</p>
                </div>
              )}

              {selectedEntry.old_value && (
                <div>
                  <Label className="text-sm text-gray-500">Valor Anterior</Label>
                  <pre className="mt-1 p-3 bg-red-50 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedEntry.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.new_value && (
                <div>
                  <Label className="text-sm text-gray-500">Novo Valor</Label>
                  <pre className="mt-1 p-3 bg-green-50 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedEntry.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

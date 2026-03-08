'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Bank {
  id: string
  name: string
}

interface BankSelectorProps {
  value?: string
  onSelect: (bankId: string) => void
  placeholder?: string
  disabled?: boolean
}

export function BankSelector({
  value,
  onSelect,
  placeholder = 'Selecione um banco...',
  disabled = false,
}: BankSelectorProps) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBanks() {
      const supabase = createClient()
      const { data } = await supabase
        .from('banks')
        .select('id, name')
        .eq('is_active', true)
        .order('name') as { data: Bank[] | null }

      setBanks(data || [])
      setLoading(false)
    }

    loadBanks()
  }, [])

  // Encontrar o nome do banco selecionado
  const selectedBank = banks.find(b => b.id === value)

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) onSelect(val)
      }}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedBank?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {banks.map((bank) => (
          <SelectItem key={bank.id} value={bank.id}>
            {bank.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

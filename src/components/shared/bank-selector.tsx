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
  const supabase = createClient()

  useEffect(() => {
    async function loadBanks() {
      const { data } = await supabase
        .from('banks')
        .select('id, name')
        .eq('is_active', true)
        .order('name') as { data: Bank[] | null }

      setBanks(data || [])
      setLoading(false)
    }

    loadBanks()
  }, [supabase])

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        if (val) onSelect(val)
      }}
      disabled={disabled || loading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
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

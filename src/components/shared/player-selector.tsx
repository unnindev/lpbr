'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  nick: string
  name: string
  club_id: string
}

interface PlayerSelectorProps {
  value?: string
  onSelect: (playerId: string, player: Player | null) => void
  placeholder?: string
  disabled?: boolean
}

export function PlayerSelector({
  value,
  onSelect,
  placeholder = 'Selecione um jogador...',
  disabled = false,
}: PlayerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlayers() {
      const supabase = createClient()
      const { data } = await supabase
        .from('players')
        .select('id, nick, name, club_id')
        .eq('is_active', true)
        .order('nick') as { data: Player[] | null }

      setPlayers(data || [])
      setLoading(false)
    }

    loadPlayers()
  }, [])

  const selectedPlayer = players.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          />
        }
      >
        {selectedPlayer ? (
          <span className="truncate">
            {selectedPlayer.nick} - {selectedPlayer.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nick, nome ou código..." />
          <CommandList>
            <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={`${player.nick} ${player.name} ${player.club_id}`}
                  onSelect={() => {
                    onSelect(player.id, player)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === player.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{player.nick}</span>
                    <span className="text-sm text-muted-foreground">
                      {player.name} ({player.club_id})
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

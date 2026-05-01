/**
 * Tipos gerados pelo Supabase CLI
 * Execute: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
 *
 * Por enquanto, definindo manualmente baseado na especificação
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          created_at: string
          date: string
          operation_type: OperationType | null
          type: TransactionType
          competencia: string | null
          chips: number | null
          value: number | null
          is_debt: boolean
          origem: Origem | null
          club: Club | null
          player_id: string | null
          bank_id: string | null
          acordo_id: string | null
          modality: string | null
          has_receipt: boolean
          verified: boolean
          reconciled: boolean
          notes: string | null
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          operation_type?: OperationType | null
          type: TransactionType
          competencia?: string | null
          chips?: number | null
          value?: number | null
          is_debt?: boolean
          origem?: Origem | null
          club?: Club | null
          player_id?: string | null
          bank_id?: string | null
          acordo_id?: string | null
          modality?: string | null
          has_receipt?: boolean
          verified?: boolean
          reconciled?: boolean
          notes?: string | null
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          operation_type?: OperationType | null
          type?: TransactionType
          competencia?: string | null
          chips?: number | null
          value?: number | null
          is_debt?: boolean
          origem?: Origem | null
          club?: Club | null
          player_id?: string | null
          bank_id?: string | null
          acordo_id?: string | null
          modality?: string | null
          has_receipt?: boolean
          verified?: boolean
          reconciled?: boolean
          notes?: string | null
          created_by?: string
        }
      }
      players: {
        Row: {
          id: string
          created_at: string
          club_id: string
          nick: string
          name: string
          is_active: boolean
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          club_id: string
          nick: string
          name: string
          is_active?: boolean
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          club_id?: string
          nick?: string
          name?: string
          is_active?: boolean
          notes?: string | null
        }
      }
      agents: {
        Row: {
          id: string
          created_at: string
          player_id: string
          pct_rakeback: number
          pct_lpbr: number
          pct_suprema: number | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          player_id: string
          pct_rakeback: number
          pct_lpbr: number
          pct_suprema?: number | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          player_id?: string
          pct_rakeback?: number
          pct_lpbr?: number
          pct_suprema?: number | null
          is_active?: boolean
        }
      }
      agent_folders: {
        Row: {
          id: string
          created_at: string
          agent_id: string
          player_id: string
          platform: Platform
          pct_rakeback: number | null
          pct_lpbr: number | null
          since: string
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          agent_id: string
          player_id: string
          platform: Platform
          pct_rakeback?: number | null
          pct_lpbr?: number | null
          since?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          agent_id?: string
          player_id?: string
          platform?: Platform
          pct_rakeback?: number | null
          pct_lpbr?: number | null
          since?: string
          is_active?: boolean
        }
      }
      banks: {
        Row: {
          id: string
          created_at: string
          name: string
          initial_balance: number
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          initial_balance?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          initial_balance?: number
          is_active?: boolean
        }
      }
      ranking_transactions: {
        Row: {
          id: string
          created_at: string
          date: string
          player_id: string
          type: RankingType
          chips: number
          total_prize: number | null
          pct_collected: number | null
          payment_method: PaymentMethod | null
          bank_id: string | null
          transaction_id: string | null
          competencia: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          player_id: string
          type: RankingType
          chips: number
          total_prize?: number | null
          pct_collected?: number | null
          payment_method?: PaymentMethod | null
          bank_id?: string | null
          transaction_id?: string | null
          competencia?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          player_id?: string
          type?: RankingType
          chips?: number
          total_prize?: number | null
          pct_collected?: number | null
          payment_method?: PaymentMethod | null
          bank_id?: string | null
          transaction_id?: string | null
          competencia?: string | null
          notes?: string | null
        }
      }
      costs: {
        Row: {
          id: string
          created_at: string
          date: string
          description: string
          category: string | null
          value: number
          bank_id: string
          competencia: string | null
          transaction_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          description: string
          category?: string | null
          value: number
          bank_id: string
          competencia?: string | null
          transaction_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          description?: string
          category?: string | null
          value?: number
          bank_id?: string
          competencia?: string | null
          transaction_id?: string | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          name: string
          role: UserRole
          is_active: boolean
        }
        Insert: {
          id: string
          created_at?: string
          name: string
          role: UserRole
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          role?: UserRole
          is_active?: boolean
        }
      }
      audit_log: {
        Row: {
          id: string
          created_at: string
          user_id: string
          action: string
          table_name: string
          record_id: string | null
          old_value: Json | null
          new_value: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          action: string
          table_name: string
          record_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_bank_balance: {
        Args: { p_bank_id: string }
        Returns: number
      }
      get_saldo_geral: {
        Args: Record<string, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Enums baseados na especificação
export type OperationType =
  | 'COMPRA_FICHAS'
  | 'CREDITO_FICHAS'
  | 'SAQUE_FICHAS'
  | 'CREDITO_PAGAMENTO_DINHEIRO'
  | 'CREDITO_PAGAMENTO_FICHAS'
  | 'CUSTO_DESPESA'
  | 'DEPOSITO_AVULSO'
  | 'SAQUE_AVULSO'
  | 'ACORDO_COLETA'
  | 'ACORDO_PAGAMENTO'
  | 'RANKING_COLETA'
  | 'RANKING_PAGAMENTO_FICHAS'
  | 'RANKING_PAGAMENTO_DINHEIRO'
  | 'CASHBACK_DINHEIRO'
  | 'CASHBACK_FICHAS'
  | 'CASHBACK_PAGAMENTO_DIVIDA'
  | 'RAKE'
  | 'RAKE_AGENTE'
  | 'RAKE_SUPREMA'
  | 'AJUSTE_INICIAL'

export type TransactionType = 'LOG' | 'FINANCIAL' | 'CONTROL'

export type Origem = 'MANUAL' | 'CHIPPIX'

export type Club = 'ADM' | 'PPOKER' | 'SUPREMA'

export type Platform = 'PPOKER' | 'SUPREMA'

export type RankingType = 'COLETA' | 'PAGAMENTO'

export type PaymentMethod = 'DINHEIRO' | 'FICHAS' | 'ABATE_DIVIDA'

export type UserRole = 'CODE' | 'ADMIN' | 'USER'

// Helpers para acesso às tabelas
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

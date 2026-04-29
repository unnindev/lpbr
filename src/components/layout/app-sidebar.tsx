'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Percent,
  Trophy,
  Calculator,
  Users,
  UserCircle,
  CreditCard,
  Wallet,
  PiggyBank,
  Building2,
  History,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'

interface AppSidebarProps {
  userRole: UserRole
  userName: string
}

const menuGroups = [
  {
    label: 'GERAL',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['CODE', 'ADMIN'] },
    ],
  },
  {
    label: 'OPERACIONAL',
    items: [
      { title: 'LOG PPPoker', href: '/operacional/log', icon: FileText, roles: ['CODE', 'ADMIN', 'USER'] },
      { title: 'Conciliação', href: '/operacional/conciliacao', icon: CheckSquare, roles: ['CODE', 'ADMIN', 'USER'] },
      { title: 'Rake', href: '/operacional/rake', icon: Percent, roles: ['CODE', 'ADMIN'] },
    ],
  },
  {
    label: 'RANKING',
    items: [
      { title: 'Controle Ranking', href: '/ranking', icon: Trophy, roles: ['CODE', 'ADMIN', 'USER'] },
      { title: 'Calculadora', href: '/ranking/calculadora', icon: Calculator, roles: ['CODE', 'ADMIN', 'USER'] },
    ],
  },
  {
    label: 'AGENTES',
    items: [
      { title: 'Agentes PPPoker', href: '/agentes', icon: Users, roles: ['CODE', 'ADMIN'] },
      { title: 'Agentes Suprema', href: '/agentes/suprema', icon: Users, roles: ['CODE', 'ADMIN'] },
      { title: 'Rake Semanal', href: '/rake-semanal', icon: Wallet, roles: ['CODE', 'ADMIN', 'USER'] },
    ],
  },
  {
    label: 'JOGADORES',
    items: [
      { title: 'Lista de Jogadores', href: '/jogadores', icon: UserCircle, roles: ['CODE', 'ADMIN', 'USER'] },
      { title: 'Crédito', href: '/jogadores/credito', icon: CreditCard, roles: ['CODE', 'ADMIN', 'USER'] },
    ],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { title: 'Custos', href: '/financeiro/custos', icon: PiggyBank, roles: ['CODE', 'ADMIN'] },
      { title: 'Resultado', href: '/financeiro/resultado', icon: Wallet, roles: ['CODE', 'ADMIN'] },
      { title: 'Bancos', href: '/financeiro/bancos', icon: Building2, roles: ['CODE', 'ADMIN'] },
      { title: 'Relatórios', href: '/financeiro/relatorios', icon: BarChart3, roles: ['CODE', 'ADMIN'] },
    ],
  },
  {
    label: 'DESENVOLVEDOR',
    items: [
      { title: 'Histórico', href: '/historico', icon: History, roles: ['CODE'] },
      { title: 'Usuários', href: '/usuarios', icon: Settings, roles: ['CODE'] },
      { title: 'Ajuste Inicial', href: '/ajuste-inicial', icon: Settings, roles: ['CODE'] },
      { title: 'Config. Ranking', href: '/ranking-config', icon: Trophy, roles: ['CODE'] },
    ],
  },
]

export function AppSidebar({ userRole, userName }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar>
      <SidebarHeader className="h-16 border-b px-6 flex-row items-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="LIVEBR Logo"
            width={48}
            height={48}
            className="drop-shadow-sm"
          />
          <span className="text-xl font-bold text-gray-900">LIVEBR</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-500 px-3">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        className={isActive ? 'bg-primary/10 text-primary' : ''}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{userName}</span>
              <span className="text-xs text-gray-500">{userRole}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

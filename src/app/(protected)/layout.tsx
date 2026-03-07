import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Separator } from '@/components/ui/separator'
import type { UserRole } from '@/types'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar dados do usuário na tabela users
  const { data: userData } = await supabase
    .from('users')
    .select('name, role, is_active')
    .eq('id', user.id)
    .single<{ name: string; role: string; is_active: boolean }>()

  if (!userData || !userData.is_active) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar
        userRole={userData.role as UserRole}
        userName={userData.name}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

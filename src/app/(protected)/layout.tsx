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
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-white/80 backdrop-blur-sm px-6 sticky top-0 z-10">
          <SidebarTrigger className="-ml-2 h-9 w-9" />
          <Separator orientation="vertical" className="h-5" />
        </header>
        <main className="flex-1 overflow-auto p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Se não está logado e não é rota pública, redireciona para login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Caminhos permitidos para o role USER (whitelist)
  const userAllowedPrefixes = [
    '/ranking',
    '/rake-semanal',
    '/jogadores',
  ]

  // Se está logado e está na página de login, redireciona para a home apropriada
  if (user && request.nextUrl.pathname === '/login') {
    const { data: userDataLogin } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const url = request.nextUrl.clone()
    url.pathname = userDataLogin?.role === 'USER' ? '/ranking' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Se está logado, verifica se o usuário está ativo na tabela users
  if (user && !isPublicRoute) {
    const { data: userData } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .single()

    // Se usuário não existe ou está inativo, faz logout e redireciona
    if (!userData || !userData.is_active) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Rotas restritas a CODE
    const codeOnlyRoutes = ['/usuarios', '/ajuste-inicial', '/ranking-config', '/historico', '/debug-fichas']
    const isCodeOnlyRoute = codeOnlyRoutes.some((route) =>
      request.nextUrl.pathname.includes(route)
    )

    if (isCodeOnlyRoute && userData.role !== 'CODE') {
      const url = request.nextUrl.clone()
      url.pathname = userData.role === 'USER' ? '/ranking' : '/dashboard'
      return NextResponse.redirect(url)
    }

    // Restrições do role USER — só pode acessar a whitelist
    if (userData.role === 'USER') {
      const isAllowed = userAllowedPrefixes.some(prefix =>
        request.nextUrl.pathname === prefix ||
        request.nextUrl.pathname.startsWith(prefix + '/')
      )
      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/ranking'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/supabase/database.types"
import { hasSupabaseEnv } from "@/lib/supabase/config"

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv() && process.env.NODE_ENV === "development") return NextResponse.next()

  let response = NextResponse.next({ request })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    if (request.nextUrl.pathname === "/login") return response
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims)
  const isLogin = request.nextUrl.pathname === "/login"

  if (!isAuthenticated && !isLogin) return NextResponse.redirect(new URL("/login", request.url))
  if (isAuthenticated && isLogin) return NextResponse.redirect(new URL("/", request.url))
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

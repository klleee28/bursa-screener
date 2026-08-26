"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleUserRoundIcon, ListFilterIcon, LogOutIcon, ShieldMinusIcon } from "lucide-react"

import { signOutAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { href: "/", label: "Whitelist", icon: ListFilterIcon },
  { href: "/blacklist", label: "Blacklist", icon: ShieldMinusIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[258px_minmax(0,1fr)]">
      <aside className="sidebar-shell">
        <Link href="/" className="brand-lockup"><span className="brand-mark">B</span><span>Bursa Filter</span></Link>
        <nav aria-label="Primary navigation" className="flex gap-2 lg:flex-col">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("nav-link", active && "nav-link-active")}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto hidden flex-col gap-1 lg:flex">
          <div className="user-row"><CircleUserRoundIcon /><span>Trading Desk</span></div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              <LogOutIcon data-icon="inline-start" />Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  )
}

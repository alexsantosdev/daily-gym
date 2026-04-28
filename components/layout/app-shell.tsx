"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Barbell,
  CalendarBlank,
  ChartBar,
  House,
  SignOut,
  Trophy,
  User,
  ForkKnife,
} from "@phosphor-icons/react"

import { FloatingActionMenu } from "@/components/layout/FloatingActionMenu"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/workouts", label: "Treinos", icon: Barbell },
  { href: "/calendar", label: "Calendario", icon: CalendarBlank },
  { href: "/meals", label: "Refeicoes", icon: ForkKnife },
  { href: "/reports", label: "Relatorios", icon: ChartBar },
  { href: "/groups", label: "Competicao", icon: Trophy },
]

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOutUser } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:py-3.5">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">daily-gym</p>
            <h1 className="text-base font-semibold md:text-lg">Painel</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-1.5 rounded-xl border border-border/70 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <User className="size-4" />
              <span>{user?.displayName || user?.email}</span>
            </div>
            <Link
              href="/groups"
              className={cn(
                "inline-flex items-center justify-center rounded-lg border border-border/70 bg-background p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:hidden",
                pathname === "/groups" && "border-primary/40 bg-primary/10 text-primary"
              )}
              aria-label="Competicao"
            >
              <Trophy className="size-4" />
            </Link>
            <Button size="sm" variant="outline" onClick={() => void signOutUser()}>
              <SignOut className="size-4 md:mr-1" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-6xl gap-2 overflow-x-auto px-3 pb-3 sm:px-4 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary/35 bg-primary/12 text-primary"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:pb-10 md:pt-6">
        {children}
      </main>

      <FloatingActionMenu />
      <MobileBottomNav items={MOBILE_NAV_ITEMS} pathname={pathname} />
    </div>
  )
}

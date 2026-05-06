"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import {
  Barbell,
  CalendarBlank,
  CaretDown,
  ChartBar,
  Drop,
  ForkKnife,
  Moon,
  SignOut,
  Sparkle,
  Sun,
  Trophy,
  User,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"

import { FloatingActionMenu } from "@/components/layout/FloatingActionMenu"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { ProfileLifecycleManager } from "@/components/profile/ProfileLifecycleManager"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { DESKTOP_NAV_ITEMS, MOBILE_NAV_ITEMS } from "@/lib/navigation"

const iconByNavItem = {
  calendar: CalendarBlank,
  workouts: Barbell,
  meals: ForkKnife,
  reports: ChartBar,
  groups: Trophy,
  water: Drop,
  "personal-ai": Sparkle,
} as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOutUser } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const mobileNavItems = MOBILE_NAV_ITEMS.map((item) => ({
    ...item,
    icon: iconByNavItem[item.icon],
  }))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) {
        return
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return
    }

    void navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Non-blocking: app keeps working without service worker.
    })
  }, [])

  const displayName = user?.displayName || user?.email || "Conta"

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 md:py-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
              daily-gym
            </p>
            <h1 className="text-sm font-medium md:text-base">Calendario</h1>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative" ref={menuRef}>
              <Button
                size="sm"
                variant="outline"
                className="max-w-[11.5rem] gap-1.5 rounded-lg border-border/60"
                onClick={() => setIsMenuOpen((prev) => !prev)}
              >
                <User className="size-4" />
                <span className="truncate text-xs">{displayName}</span>
                <CaretDown
                  className={cn(
                    "size-4 transition-transform",
                    isMenuOpen && "rotate-180"
                  )}
                />
              </Button>

              {isMenuOpen ? (
                <div className="absolute top-11 right-0 z-50 w-52 rounded-xl border border-border/70 bg-card p-1.5 shadow-sm">
                  <div className="rounded-lg px-2 py-2 text-xs text-muted-foreground">
                    Conectado como
                    <p className="mt-1 truncate font-medium text-foreground">
                      {displayName}
                    </p>
                  </div>
                  <Link
                    href="/personal-ai"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Sparkle className="size-4" />
                    Personal IA
                  </Link>
                  <Link
                    href="/groups"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Trophy className="size-4" />
                    Competicao
                  </Link>
                  <Link
                    href="/water"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Drop className="size-4" />
                    Hidratacao
                  </Link>
                  <Link
                    href="/profile"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="size-4" />
                    Perfil
                  </Link>
                  <button
                    type="button"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60"
                    onClick={() => {
                      setIsMenuOpen(false)
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    }}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                    Alternar tema
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-muted/60"
                    onClick={() => {
                      setIsMenuOpen(false)
                      void signOutUser()
                    }}
                  >
                    <SignOut className="size-4" />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-6xl gap-1.5 overflow-x-auto px-3 pb-2.5 sm:px-4 md:flex">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = iconByNavItem[item.icon]

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-border bg-secondary text-secondary-foreground"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pt-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] sm:px-4 md:pt-5 md:pb-8">
        {children}
      </main>

      <FloatingActionMenu />
      <MobileBottomNav items={mobileNavItems} pathname={pathname} />
      <ProfileLifecycleManager />
    </div>
  )
}

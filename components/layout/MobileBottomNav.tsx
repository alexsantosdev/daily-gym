"use client"

import Link from "next/link"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

export interface MobileBottomNavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export function MobileBottomNav({
  items,
  pathname,
}: {
  items: MobileBottomNavItem[]
  pathname: string
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden">
      <div
        className="mx-auto grid max-w-2xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

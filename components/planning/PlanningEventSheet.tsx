"use client"

import { X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export function PlanningEventSheet({
  open,
  title,
  subtitle,
  onOpenChange,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-[100dvh] w-full max-w-3xl flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}


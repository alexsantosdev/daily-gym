"use client"

import { X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WorkoutExecutionSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function WorkoutExecutionSheet({
  open,
  title,
  subtitle,
  onOpenChange,
  children,
}: WorkoutExecutionSheetProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[90] bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[100dvh] w-full max-w-4xl flex-col bg-background">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3")}>{children}</div>
      </div>
    </div>
  )
}

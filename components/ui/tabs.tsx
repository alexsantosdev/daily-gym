"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error("Tabs components must be wrapped by <Tabs>")
  }

  return context
}

function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const selectedValue = value ?? internalValue

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }

      onValueChange?.(nextValue)
    },
    [onValueChange, value]
  )

  return (
    <TabsContext.Provider value={{ value: selectedValue, setValue }}>
      <div className={cn("flex flex-col gap-4", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-start rounded-xl border border-border/70 bg-muted/70 p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, value, ...props }: React.ComponentProps<"button"> & { value: string }) {
  const tabs = useTabsContext()
  const isActive = tabs.value === value

  return (
    <button
      type="button"
      onClick={() => tabs.setValue(value)}
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, value, ...props }: React.ComponentProps<"div"> & { value: string }) {
  const tabs = useTabsContext()

  if (tabs.value !== value) {
    return null
  }

  return <div className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

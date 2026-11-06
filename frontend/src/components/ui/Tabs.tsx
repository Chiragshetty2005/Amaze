import type { ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        'no-scrollbar flex w-full gap-1 overflow-x-auto rounded-lg bg-paper p-1 sm:w-auto',
        className,
      )}
    >
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors duration-300 ease-out-expo hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink',
        className,
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={cn('mt-4 focus-visible:outline-none', className)}
    >
      {children}
    </TabsPrimitive.Content>
  )
}

import type { ReactNode } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from '@phosphor-icons/react'

interface AccordionItem {
  value: string
  question: string
  answer: ReactNode
}

export function FaqAccordion({ items }: { items: AccordionItem[] }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="w-full">
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          className="border-b border-line last:border-b-0"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
              <span className="title-3 text-ink">{item.question}</span>
              <Plus
                className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 ease-out-expo group-data-[state=open]:rotate-45"
                aria-hidden="true"
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden">
            <div className="pb-4 pr-8 body-6 text-muted">{item.answer}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}

import type { Invoice } from '../types'

export interface InvoiceTotals {
  subtotal: number
  tax: number
  total: number
}

export function getInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0)
  const tax = Math.round(subtotal * invoice.taxRate)
  return { subtotal, tax, total: subtotal + tax }
}

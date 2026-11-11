'use client'

import { useState } from 'react'
import { Search, Plus, DollarSign, TrendingUp, AlertCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const invoices = [
  {
    id: 'INV-2024-001',
    customer: 'Amit Patel',
    amount: 2450,
    date: '2024-12-23',
    dueDate: '2024-12-30',
    status: 'paid',
    items: 8,
  },
  {
    id: 'INV-2024-002',
    customer: 'Priya Sharma',
    amount: 1820,
    date: '2024-12-22',
    dueDate: '2024-12-29',
    status: 'paid',
    items: 6,
  },
  {
    id: 'INV-2024-003',
    customer: 'Rahul Gupta',
    amount: 3200,
    date: '2024-12-23',
    dueDate: '2024-12-30',
    status: 'pending',
    items: 12,
  },
  {
    id: 'INV-2024-004',
    customer: 'Neha Singh',
    amount: 1200,
    date: '2024-12-21',
    dueDate: '2024-12-28',
    status: 'overdue',
    items: 4,
  },
  {
    id: 'INV-2024-005',
    customer: 'Vikram Reddy',
    amount: 2890,
    date: '2024-12-22',
    dueDate: '2024-12-29',
    status: 'paid',
    items: 10,
  },
  {
    id: 'INV-2024-006',
    customer: 'Anjali Desai',
    amount: 1950,
    date: '2024-12-23',
    dueDate: '2024-12-30',
    status: 'pending',
    items: 7,
  },
]

export function BillingView() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive" className="bg-destructive/10 hover:bg-destructive/20">Overdue</Badge>
      default:
        return null
    }
  }

  const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
  const pendingAmount = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="flex-1 space-y-6 p-6 pb-20">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p>
            </div>
            <DollarSign className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
        <Card className="p-4 border-success/50 bg-success/5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-success">₹{(paidAmount / 1000).toFixed(1)}K</p>
            </div>
            <TrendingUp className="size-8 text-success/50" />
          </div>
        </Card>
        <Card className={cn('p-4', pendingAmount > 0 && 'border-destructive/50 bg-destructive/5')}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
              <p className={cn('text-2xl font-bold', pendingAmount > 0 && 'text-destructive')}>₹{(pendingAmount / 1000).toFixed(1)}K</p>
            </div>
            <AlertCircle className={cn('size-8 text-muted-foreground/50', pendingAmount > 0 && 'text-destructive')} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
            <DollarSign className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Create Invoice
        </Button>
      </div>

      {/* Invoices Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <TableCell className="font-mono text-sm font-medium">{invoice.id}</TableCell>
                  <TableCell className="font-medium">{invoice.customer}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.items} items</TableCell>
                  <TableCell className="text-right font-medium">₹{invoice.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.dueDate}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Download className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

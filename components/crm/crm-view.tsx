'use client'

import { useState } from 'react'
import { Search, Plus, Users, TrendingUp, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const customers = [
  {
    id: 1,
    name: 'Amit Patel',
    phone: '+91-98765-43210',
    email: 'amit.patel@email.com',
    totalSpent: 15240,
    visits: 12,
    lastVisit: '2 days ago',
    tier: 'gold',
  },
  {
    id: 2,
    name: 'Priya Sharma',
    phone: '+91-98765-43211',
    email: 'priya.sharma@email.com',
    totalSpent: 8500,
    visits: 6,
    lastVisit: '1 week ago',
    tier: 'silver',
  },
  {
    id: 3,
    name: 'Rahul Gupta',
    phone: '+91-98765-43212',
    email: 'rahul.gupta@email.com',
    totalSpent: 22100,
    visits: 18,
    lastVisit: '3 days ago',
    tier: 'platinum',
  },
  {
    id: 4,
    name: 'Neha Singh',
    phone: '+91-98765-43213',
    email: 'neha.singh@email.com',
    totalSpent: 4200,
    visits: 3,
    lastVisit: '2 weeks ago',
    tier: 'bronze',
  },
  {
    id: 5,
    name: 'Vikram Reddy',
    phone: '+91-98765-43214',
    email: 'vikram.reddy@email.com',
    totalSpent: 12800,
    visits: 10,
    lastVisit: '5 days ago',
    tier: 'silver',
  },
  {
    id: 6,
    name: 'Anjali Desai',
    phone: '+91-98765-43215',
    email: 'anjali.desai@email.com',
    totalSpent: 19500,
    visits: 15,
    lastVisit: 'Today',
    tier: 'gold',
  },
]

export function CRMView() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTierBadge = (tier: string) => {
    const tierConfig: Record<string, { bg: string; text: string }> = {
      platinum: { bg: 'bg-blue-100 text-blue-800', text: 'Platinum' },
      gold: { bg: 'bg-amber-100 text-amber-800', text: 'Gold' },
      silver: { bg: 'bg-slate-200 text-slate-800', text: 'Silver' },
      bronze: { bg: 'bg-orange-100 text-orange-800', text: 'Bronze' },
    }
    const config = tierConfig[tier]
    return <Badge className={config.bg}>{config.text}</Badge>
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const averageSpent = Math.round(totalRevenue / customers.length)

  return (
    <div className="flex-1 space-y-6 p-6 pb-20">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
            <Users className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{(totalRevenue / 1000).toFixed(1)}K</p>
            </div>
            <TrendingUp className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Avg. Spent</p>
              <p className="text-2xl font-bold">₹{averageSpent.toLocaleString()}</p>
            </div>
            <TrendingUp className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Premium Tier</p>
              <p className="text-2xl font-bold">{customers.filter(c => c.tier === 'platinum' || c.tier === 'gold').length}</p>
            </div>
            <Users className="size-8 text-muted-foreground/50" />
          </div>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gap-2">
          <Plus className="size-4" />
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      <span className="text-sm">{customer.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">₹{customer.totalSpent.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{customer.visits}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{customer.lastVisit}</TableCell>
                  <TableCell>{getTierBadge(customer.tier)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

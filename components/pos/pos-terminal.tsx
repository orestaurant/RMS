'use client'

import { useState } from 'react'
import {
  Search, Plus, Minus, Trash2, ChevronRight, CreditCard,
  Banknote, Smartphone, CheckCircle2, X, Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { menuItems, menuCategories, tables, type MenuItem, type PaymentMethod } from '@/lib/mock-data'
import { usePOSStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'razorpay', label: 'Razorpay', icon: CreditCard },
  { id: 'paytm', label: 'Paytm', icon: Smartphone },
]

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addItem } = usePOSStore()

  return (
    <button
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card p-3 text-left',
        'touch-active transition-all duration-150 hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm',
        !item.isAvailable && 'opacity-40 pointer-events-none'
      )}
      onClick={() => addItem({
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        price: item.price,
      })}
    >
      {/* Veg / Non-veg indicator */}
      <div className={cn(
        'absolute top-2.5 right-2.5 size-3 rounded-sm border-2',
        item.isVeg ? 'border-success' : 'border-destructive'
      )}>
        <div className={cn(
          'size-1.5 rounded-full m-[1px]',
          item.isVeg ? 'bg-success' : 'bg-destructive'
        )} />
      </div>

      <div className="flex flex-col gap-1.5 pr-5">
        <span className="text-xs font-semibold leading-tight">{item.name}</span>
        <span className="text-lg font-bold text-primary">₹{item.price}</span>
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground">{item.prepTime}m</span>
          {item.tags?.slice(0, 1).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[9px] h-3.5 px-1 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Add button overlay */}
      <div className="absolute bottom-2.5 right-2.5 flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus className="size-3.5" />
      </div>
    </button>
  )
}

function PaymentDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { cartItems, paymentMethod, setPaymentMethod, getTotal, clearCart, selectedTableId } = usePOSStore()
  const [paid, setPaid] = useState(false)
  const total = getTotal()

  const handleConfirm = () => {
    setPaid(true)
    setTimeout(() => {
      clearCart()
      setPaid(false)
      onClose()
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paid ? 'Payment Successful' : 'Confirm Payment'}
          </DialogTitle>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">₹{total.toLocaleString('en-IN')}</p>
              <p className="text-sm text-muted-foreground mt-1">Payment received via {paymentMethod}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Order summary */}
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">ORDER SUMMARY</p>
              <div className="flex flex-col gap-1.5">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.quantity}× {item.name}</span>
                    <span className="font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-2.5" />
              <div className="flex items-center justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2.5">PAYMENT METHOD</p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all',
                      'touch-active',
                      paymentMethod === pm.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <pm.icon className="size-5" />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <Button size="lg" className="w-full h-12 text-base font-semibold" onClick={handleConfirm}>
              Confirm ₹{total.toLocaleString('en-IN')}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function POSTerminal() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [discountInput, setDiscountInput] = useState('')

  const {
    cartItems, selectedTableId, setSelectedTable,
    updateQuantity, removeItem, setDiscount, discount,
    getSubtotal, getTax, getTotal,
  } = usePOSStore()

  const filtered = menuItems.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const subtotal = getSubtotal()
  const tax = getTax()
  const total = getTotal()

  return (
    <>
      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} />

      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* ── Left: Menu browser ────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
          {/* Table selector + search bar */}
          <div className="flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Table:</span>
              <div className="flex flex-wrap gap-1.5 max-w-xs">
                {tables.filter((t) => t.status === 'available' || t.status === 'occupied').slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(selectedTableId === t.id ? null : t.id)}
                    className={cn(
                      'flex h-8 min-w-[36px] items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-all touch-active',
                      selectedTableId === t.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : t.status === 'occupied'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:border-primary/40'
                    )}
                  >
                    {t.number}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex-1 max-w-sm ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu..."
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-border no-scrollbar shrink-0">
            {menuCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Menu grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Cart ───────────────────────────────── */}
        <div className="flex w-[340px] shrink-0 flex-col bg-card">
          {/* Cart header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Cart</span>
              {selectedTableId && (
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  T{tables.find((t) => t.id === selectedTableId)?.number}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {cartItems.reduce((s, i) => s + i.quantity, 0)} items
            </Badge>
          </div>

          {/* Cart items */}
          <ScrollArea className="flex-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <span className="text-2xl">🛒</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tap menu items to add them
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0 divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6 rounded-lg"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-[56px] justify-end">
                      <span className="text-sm font-semibold">₹{(item.price * item.quantity).toLocaleString()}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Bill summary */}
          {cartItems.length > 0 && (
            <div className="border-t border-border bg-background/50 p-4">
              <div className="flex flex-col gap-2 mb-4 text-sm">
                {/* Discount input */}
                <div className="flex items-center gap-2">
                  <Tag className="size-3.5 text-muted-foreground shrink-0" />
                  <Input
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value)
                      setDiscount(Number(e.target.value) || 0)
                    }}
                    placeholder="Discount (₹)"
                    className="h-7 text-xs"
                    type="number"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-xs mt-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{tax.toLocaleString('en-IN')}</span>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex justify-between font-bold text-base text-foreground">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                disabled={cartItems.length === 0}
                onClick={() => setPaymentOpen(true)}
              >
                <CreditCard className="size-5" />
                Charge ₹{total.toLocaleString('en-IN')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

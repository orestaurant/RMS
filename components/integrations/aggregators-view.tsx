'use client'

import { useState, useEffect } from 'react'
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Settings2,
  RefreshCw,
  Key,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Aggregator {
  type: string
  name: string
  icon: string
  portalName: string
  isConfigured: boolean
  isActive: boolean
  status: string
  restaurantIdOnAggregator: string
  apiKeyMasked: string
  hasSecret: boolean
  commissionPercentage: number | null
  webhookUrl: string
  lastSyncAt: string | null
  syncError: string | null
}

export function AggregatorsView() {
  const [aggregators, setAggregators] = useState<Aggregator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Configure Modal State
  const [selectedAgg, setSelectedAgg] = useState<Aggregator | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [outletId, setOutletId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [commission, setCommission] = useState('18.5')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const fetchAggregators = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/integrations/aggregators')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setAggregators(data.data)
      } else {
        throw new Error(data.message || 'Failed to load aggregators')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAggregators()
  }, [])

  const handleOpenConfigure = (agg: Aggregator) => {
    setSelectedAgg(agg)
    setOutletId(agg.restaurantIdOnAggregator || '')
    setApiKey(agg.apiKeyMasked || '')
    setApiSecret(agg.hasSecret ? '••••••••' : '')
    setCommission(agg.commissionPercentage ? String(agg.commissionPercentage) : '18.5')
    setIsActive(agg.isActive)
    setSaveSuccess(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgg) return

    try {
      setSaving(true)
      const payload: any = {
        aggregatorType: selectedAgg.type,
        restaurantIdOnAggregator: outletId.trim(),
        commissionPercentage: Number(commission) || 0,
        isActive: isActive,
      }

      if (apiKey && !apiKey.includes('****')) {
        payload.apiKey = apiKey.trim()
      }
      if (apiSecret && !apiSecret.includes('••••')) {
        payload.apiSecret = apiSecret.trim()
      }

      const res = await fetch('/api/integrations/aggregators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || 'Failed to save credentials')
      }

      setSaveSuccess('Credentials successfully verified and saved!')
      setTimeout(() => {
        setIsModalOpen(false)
        fetchAggregators()
      }, 1000)
    } catch (err: any) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-orange-500/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛵</span>
            <h2 className="text-xl font-bold tracking-tight">Food Delivery Aggregators (BYOK)</h2>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
              Client API Keys
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your restaurant's own Zomato, Swiggy, and Uber Eats merchant partner accounts. Incoming orders are automatically routed to KDS & POS.
          </p>
        </div>
        <Button onClick={fetchAggregators} variant="outline" size="sm" className="gap-2 shrink-0">
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Aggregators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {aggregators.map((agg) => (
          <Card key={agg.type} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow border-border/80">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{agg.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {agg.name}
                      {agg.isActive && agg.isConfigured ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                          Live Sync
                        </Badge>
                      ) : agg.isConfigured ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-xs">
                          Paused
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-xs">
                          Not Connected
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{agg.portalName}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenConfigure(agg)}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Settings2 className="size-3.5" />
                  {agg.isConfigured ? 'Configure' : 'Connect'}
                </Button>
              </div>

              {/* Status Details */}
              <div className="bg-muted/50 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Outlet ID:</span>
                  <span className="font-mono font-medium">
                    {agg.restaurantIdOnAggregator || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">API Key:</span>
                  <span className="font-mono text-muted-foreground">
                    {agg.apiKeyMasked || '••••••••'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Commission:</span>
                  <span className="font-medium">
                    {agg.commissionPercentage ? `${agg.commissionPercentage}%` : 'Standard'}
                  </span>
                </div>
                {agg.lastSyncAt && (
                  <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">Last Order Sync:</span>
                    <span className="text-emerald-600 font-medium">
                      {new Date(agg.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-primary" />
                End-to-End Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Zap className="size-3.5 text-amber-500" />
                Auto Kitchen Printing
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Configure Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedAgg?.icon}</span>
              <DialogTitle>Configure {selectedAgg?.name} Integration</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Enter the merchant credentials provided by {selectedAgg?.name} Partner Portal. Your system will use these to fetch and sync orders.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {selectedAgg?.name} Restaurant / Outlet ID <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. 104829 or ZOM-BLR-01"
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Found in your {selectedAgg?.name} merchant app under Outlet Profile.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                API Key / Client Token
              </Label>
              <Input
                type="password"
                placeholder={selectedAgg?.apiKeyMasked || 'Enter API Key provided by partner portal'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                API Secret
              </Label>
              <Input
                type="password"
                placeholder={selectedAgg?.hasSecret ? '••••••••' : 'Enter Secret (optional)'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commission %</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="18.5"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <Label htmlFor="isActiveToggle" className="text-xs font-semibold cursor-pointer">
                    Enable Live Order Ingestion
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? 'Saving...' : 'Save & Verify Keys'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

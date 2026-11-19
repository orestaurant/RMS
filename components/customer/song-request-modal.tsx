'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Music,
  Headphones,
  Radio,
  Clock,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Flame,
  ListMusic,
  Disc3,
  X,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SongRequest {
  id: string
  songTitle: string
  artist?: string
  language?: string
  tableNumber: string
  guestName: string
  requestedBy?: string
  notes?: string
  status: 'pending' | 'queued' | 'playing' | 'played' | 'declined'
  createdAt: string
}

interface SongRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableNumber: string | number
  guestName?: string
}

const statusBadgeConfig: Record<string, { label: string; className: string; icon: any }> = {
  pending: {
    label: 'Pending Approval',
    className: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    icon: Clock,
  },
  queued: {
    label: 'In DJ Queue',
    className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    icon: ListMusic,
  },
  playing: {
    label: 'Playing Now 🔥',
    className: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 animate-pulse',
    icon: Flame,
  },
  played: {
    label: 'Played',
    className: 'bg-muted text-muted-foreground border-border',
    icon: CheckCircle2,
  },
  declined: {
    label: 'Unavailable',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: X,
  },
}

export function SongRequestModal({
  open,
  onOpenChange,
  tableNumber,
  guestName = 'Guest',
}: SongRequestModalProps) {
  const [songTitle, setSongTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [language, setLanguage] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [requests, setRequests] = useState<SongRequest[]>([])
  const [loading, setLoading] = useState(false)

  const cleanTable = String(tableNumber || 'Table 1').trim()

  // Fetch song requests for this table
  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/dj-requests?tableNumber=${encodeURIComponent(cleanTable)}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data)
      }
    } catch {
      // background polling
    }
  }, [cleanTable])

  useEffect(() => {
    if (open) {
      setFeedback(null)
      fetchRequests()
    }
  }, [open, fetchRequests])

  // Visibility-aware polling
  useEffect(() => {
    if (!open) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchRequests()
      }
    }

    const interval = setInterval(tick, 4000)
    return () => clearInterval(interval)
  }, [open, fetchRequests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!songTitle.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a song title.' })
      return
    }

    try {
      setSubmitting(true)
      setFeedback(null)

      const res = await fetch('/api/dj-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle: songTitle.trim(),
          artist: artist.trim() || undefined,
          language: language.trim() || undefined,
          tableNumber: cleanTable,
          guestName: guestName.trim() || 'Guest',
          notes: notes.trim() || undefined,
          requestedBy: 'Customer',
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to submit song request.')
      }

      setFeedback({
        type: 'success',
        message: `"${songTitle.trim()}" sent to the DJ booth! Watch status below.`,
      })
      setSongTitle('')
      setArtist('')
      setLanguage('')
      setNotes('')
      fetchRequests()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Network error submitting request.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border shadow-2xl rounded-3xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-sm shadow-pink-500/25">
                <Music className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  Request a Song
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Headphones className="size-3 text-pink-500" />
                  <span>DJ Sync · {cleanTable}</span>
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-pink-500/30 text-pink-500 text-[10px] font-bold">
              Live DJ Booth
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {feedback && (
            <div
              role="alert"
              className={cn(
                'p-3 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in',
                feedback.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              )}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              ) : (
                <X className="size-4 shrink-0 text-destructive" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="song-title" className="text-xs font-bold text-foreground">
                Song Title <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Disc3 className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  id="song-title"
                  placeholder="e.g. Kesariya, Starboy, Levitating..."
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  required
                  disabled={submitting}
                  className="pl-9 text-xs h-9.5 rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="song-artist" className="text-xs font-medium text-foreground">
                  Artist / Band <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="song-artist"
                  placeholder="e.g. Arijit Singh..."
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  disabled={submitting}
                  className="text-xs h-9.5 rounded-xl bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="song-lang" className="text-xs font-medium text-foreground">
                  Language <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="song-lang"
                  placeholder="e.g. Hindi, English..."
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={submitting}
                  className="text-xs h-9.5 rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="song-note" className="text-xs font-medium text-foreground">
                Dedication / Note <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="song-note"
                placeholder="e.g. For Rahul's Birthday at Table 4!"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                className="text-xs h-9.5 rounded-xl bg-background"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !songTitle.trim()}
              className="w-full h-10 rounded-xl font-bold text-xs gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 hover:opacity-95 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sending to DJ...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Request to DJ Booth</span>
                </>
              )}
            </Button>
          </form>

          {/* Active Song Requests List for Table */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="size-3.5 text-pink-500" />
                Live DJ Queue ({requests.length})
              </h4>
              <span className="text-[10px] text-muted-foreground">Auto-syncs live</span>
            </div>

            {requests.length === 0 ? (
              <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center space-y-1 text-xs text-muted-foreground">
                <Music className="size-5 mx-auto opacity-50" />
                <p className="font-semibold text-foreground">No song requests yet</p>
                <p className="text-[11px]">Request your favorite track above to play it live!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {requests.map((req) => {
                  const cfg = statusBadgeConfig[req.status] || statusBadgeConfig.pending
                  const Icon = cfg.icon

                  return (
                    <div
                      key={req.id}
                      className={cn(
                        'p-3 rounded-2xl border transition-all space-y-1',
                        req.status === 'playing'
                          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-sm'
                          : 'border-border/70 bg-card'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {req.songTitle}
                          </p>
                          {req.artist && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              by {req.artist}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-bold shrink-0 gap-1 px-2 py-0.5', cfg.className)}
                        >
                          <Icon className="size-3" />
                          <span>{cfg.label}</span>
                        </Badge>
                      </div>

                      {req.notes && (
                        <p className="text-[10px] text-pink-500/90 italic truncate">
                          💬 &ldquo;{req.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card shrink-0">
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

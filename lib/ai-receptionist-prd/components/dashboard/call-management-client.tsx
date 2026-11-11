'use client'

import { useState } from 'react'
import Link from 'next/link'
import { deleteCallRecord } from '@/app/actions/call'

interface Company {
  id: string
  name: string
}

interface CallRecord {
  id: string
  companyId: string
  receptionistId?: string
  contactId?: string
  phoneNumber: string
  status: string
  duration?: number
  recordingUrl?: string
  transcription?: string
  sentiment?: string
  callNotes?: string
  createdAt: Date
  updatedAt: Date
}

interface CallStats {
  totalCalls: number
  completedCalls: number
  missedCalls: number
  failedCalls: number
  averageDuration: number
  successRate: number
}

interface CallManagementClientProps {
  company: Company
  initialCalls: CallRecord[]
  initialStats: CallStats
}

export default function CallManagementClient({
  company,
  initialCalls,
  initialStats,
}: CallManagementClientProps) {
  const [calls, setCalls] = useState<CallRecord[]>(initialCalls)
  const [stats] = useState(initialStats)
  const [filter, setFilter] = useState<'all' | 'completed' | 'missed' | 'failed'>('all')

  const filteredCalls = calls.filter((call) => {
    if (filter === 'all') return true
    return call.status === filter
  })

  const handleDeleteCall = async (callId: string) => {
    if (window.confirm('Are you sure you want to delete this call record?')) {
      try {
        await deleteCallRecord(callId)
        setCalls(calls.filter((c) => c.id !== callId))
      } catch (error) {
        console.error('[v0] Failed to delete call:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'missed':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'active':
        return 'bg-blue-100 text-blue-800'
      case 'ringing':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href={`/dashboard/company/${company.id}`} className="text-primary hover:text-primary/90 text-sm mb-4 inline-block">
            ← Back to Company
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{company.name} - Call Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage all incoming and outgoing calls</p>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Calls</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalCalls}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedCalls}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Missed</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.missedCalls}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold text-foreground">{stats.successRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(['all', 'completed', 'missed', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Calls Table */}
        {filteredCalls.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg border border-border">
            <p className="text-muted-foreground">No calls found</p>
          </div>
        ) : (
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-6 py-3 text-left text-foreground font-semibold">Phone Number</th>
                    <th className="px-6 py-3 text-left text-foreground font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-foreground font-semibold">Duration</th>
                    <th className="px-6 py-3 text-left text-foreground font-semibold">Date & Time</th>
                    <th className="px-6 py-3 text-left text-foreground font-semibold">Notes</th>
                    <th className="px-6 py-3 text-right text-foreground font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="px-6 py-3 text-foreground font-mono">{call.phoneNumber}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(call.status)}`}>
                          {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-foreground">
                        {call.duration ? `${call.duration}s` : '—'}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {new Date(call.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-foreground text-xs max-w-xs truncate">
                        {call.callNotes || '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDeleteCall(call.id)}
                          className="text-destructive hover:text-destructive/90 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

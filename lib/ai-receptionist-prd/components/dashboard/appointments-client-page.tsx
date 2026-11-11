'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createAppointment, deleteAppointment, updateAppointment } from '@/app/actions/appointment'

interface Company {
  id: string
  name: string
}

interface Appointment {
  id: string
  companyId: string
  contactId?: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  status: string
  location?: string
  conferenceUrl?: string
  reminderSent: boolean
  createdAt: Date
  updatedAt: Date
}

interface AppointmentStats {
  totalAppointments: number
  upcomingAppointments: number
  completedAppointments: number
  cancelledAppointments: number
}

interface AppointmentsClientPageProps {
  company: Company
  initialAppointments: Appointment[]
  stats: AppointmentStats
}

export default function AppointmentsClientPage({
  company,
  initialAppointments,
  stats,
}: AppointmentsClientPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    conferenceUrl: '',
  })

  const now = new Date()
  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.startTime) > now
  )
  const pastAppointments = appointments.filter(
    (a) => new Date(a.startTime) <= now
  )

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)

      const newAppointment = await createAppointment({
        companyId: company.id,
        title: formData.title,
        description: formData.description,
        startTime: startDateTime,
        endTime: endDateTime,
        location: formData.location,
        conferenceUrl: formData.conferenceUrl,
      })

      setAppointments([...appointments, newAppointment])
      setFormData({
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        location: '',
        conferenceUrl: '',
      })
      setShowForm(false)
    } catch (error) {
      console.error('[v0] Failed to create appointment:', error)
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteAppointment(appointmentId)
        setAppointments(appointments.filter((a) => a.id !== appointmentId))
      } catch (error) {
        console.error('[v0] Failed to delete appointment:', error)
      }
    }
  }

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus })
      setAppointments(
        appointments.map((a) =>
          a.id === appointmentId ? { ...a, status: newStatus } : a
        )
      )
    } catch (error) {
      console.error('[v0] Failed to update appointment:', error)
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
          <h1 className="text-3xl font-bold text-foreground">{company.name} - Appointments</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage appointments</p>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Appointments</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalAppointments}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-blue-600">{stats.upcomingAppointments}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedAppointments}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelledAppointments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Upcoming Appointments</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            {showForm ? 'Cancel' : 'Schedule Appointment'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateAppointment} className="mb-12 p-6 bg-muted rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-4">New Appointment</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Client Call"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Appointment details"
                  rows={3}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Conference room or address"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Conference URL</label>
                <input
                  type="url"
                  value={formData.conferenceUrl}
                  onChange={(e) => setFormData({ ...formData, conferenceUrl: e.target.value })}
                  placeholder="https://meet.example.com"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
            >
              Schedule Appointment
            </button>
          </form>
        )}

        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg border border-border mb-12">
            <p className="text-muted-foreground">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-4 mb-12">
            {upcomingAppointments.map((appt) => (
              <div key={appt.id} className="p-6 bg-background border border-border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{appt.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(appt.startTime).toLocaleString()} - {new Date(appt.endTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {appt.status}
                  </span>
                </div>
                {appt.description && (
                  <p className="text-sm text-foreground mb-2">{appt.description}</p>
                )}
                {appt.location && (
                  <p className="text-sm text-muted-foreground mb-2">📍 {appt.location}</p>
                )}
                {appt.conferenceUrl && (
                  <a
                    href={appt.conferenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/90 text-sm mb-4 inline-block"
                  >
                    Join Conference
                  </a>
                )}
                <div className="flex gap-2 mt-4">
                  <select
                    value={appt.status}
                    onChange={(e) => handleUpdateStatus(appt.id, e.target.value)}
                    className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => handleDeleteAppointment(appt.id)}
                    className="text-destructive hover:text-destructive/90 text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Past Appointments</h3>
            <div className="space-y-4">
              {pastAppointments.slice(0, 10).map((appt) => (
                <div key={appt.id} className="p-4 bg-muted rounded-lg opacity-60">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-foreground">{appt.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.startTime).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

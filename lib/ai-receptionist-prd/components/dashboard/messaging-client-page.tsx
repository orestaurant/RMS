'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sendMessage, deleteMessage } from '@/app/actions/message'

interface Company {
  id: string
  name: string
}

interface Message {
  id: string
  companyId: string
  contactId?: string
  recipientPhoneNumber?: string
  messageType: 'sms' | 'email' | 'internal'
  subject?: string
  content: string
  attachments: string[]
  status: string
  createdAt: Date
  updatedAt: Date
}

interface ConversationStats {
  totalMessages: number
  sentMessages: number
  smsMessages: number
  emailMessages: number
}

interface MessagingClientPageProps {
  company: Company
  initialMessages: Message[]
  stats: ConversationStats
}

type MessageType = 'sms' | 'email' | 'internal'

export default function MessagingClientPage({
  company,
  initialMessages,
  stats,
}: MessagingClientPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<MessageType | 'all'>('all')
  const [formData, setFormData] = useState({
    recipientPhoneNumber: '',
    messageType: 'sms' as MessageType,
    subject: '',
    content: '',
  })

  const filteredMessages = messages.filter((m) => {
    if (filter === 'all') return true
    return m.messageType === filter
  })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newMessage = await sendMessage({
        companyId: company.id,
        recipientPhoneNumber: formData.recipientPhoneNumber,
        messageType: formData.messageType,
        subject: formData.messageType === 'email' ? formData.subject : undefined,
        content: formData.content,
      })

      setMessages([...messages, newMessage])
      setFormData({
        recipientPhoneNumber: '',
        messageType: 'sms',
        subject: '',
        content: '',
      })
      setShowForm(false)
    } catch (error) {
      console.error('[v0] Failed to send message:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteMessage(messageId)
        setMessages(messages.filter((m) => m.id !== messageId))
      } catch (error) {
        console.error('[v0] Failed to delete message:', error)
      }
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return '💬'
      case 'email':
        return '📧'
      case 'internal':
        return '📝'
      default:
        return '📨'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'read':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
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
          <h1 className="text-3xl font-bold text-foreground">{company.name} - Messages</h1>
          <p className="text-muted-foreground mt-1">Send and manage SMS, email, and internal messages</p>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Total Messages</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalMessages}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-bold text-blue-600">{stats.sentMessages}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">SMS Messages</p>
              <p className="text-2xl font-bold text-foreground">{stats.smsMessages}</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Email Messages</p>
              <p className="text-2xl font-bold text-foreground">{stats.emailMessages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-foreground">Messages</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            {showForm ? 'Cancel' : 'New Message'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSendMessage} className="mb-12 p-6 bg-muted rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-4">Send New Message</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message Type *</label>
                <select
                  value={formData.messageType}
                  onChange={(e) => setFormData({ ...formData, messageType: e.target.value as MessageType })}
                  required
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="internal">Internal Note</option>
                </select>
              </div>

              {formData.messageType !== 'internal' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Recipient *</label>
                  <input
                    type="text"
                    value={formData.recipientPhoneNumber}
                    onChange={(e) => setFormData({ ...formData, recipientPhoneNumber: e.target.value })}
                    required={formData.messageType !== 'internal'}
                    placeholder={formData.messageType === 'sms' ? '+1234567890' : 'recipient@example.com'}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {formData.messageType === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Email subject"
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  placeholder="Message content"
                  rows={5}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-semibold"
            >
              Send Message
            </button>
          </form>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'sms', 'email', 'internal'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all'
                ? 'All Messages'
                : f === 'sms'
                  ? 'SMS'
                  : f === 'email'
                    ? 'Email'
                    : 'Notes'}
            </button>
          ))}
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg border border-border">
            <p className="text-muted-foreground">
              {filter === 'all' ? 'No messages' : `No ${filter} messages`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((msg) => (
                <div key={msg.id} className="p-4 bg-background border border-border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{getMessageIcon(msg.messageType)}</span>
                      <div className="flex-1">
                        {msg.subject && (
                          <h4 className="font-semibold text-foreground">{msg.subject}</h4>
                        )}
                        <p className="text-sm text-foreground break-words">{msg.content}</p>
                        {msg.recipientPhoneNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            To: {msg.recipientPhoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(msg.status)}`}>
                        {msg.status}
                      </span>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-destructive hover:text-destructive/90 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  )
}

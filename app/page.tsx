'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  UtensilsCrossed,
  ChefHat,
  LayoutDashboard,
  Receipt,
  CreditCard,
  Users,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Layers,
  Store,
  Menu,
  X,
  Star,
  Check,
  ChevronDown,
  Percent,
  LogIn,
  UserCheck,
  HeartHandshake,
} from 'lucide-react'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  const faqs = [
    {
      q: 'How fast can our restaurant get up and running?',
      a: 'You can go live in under 15 minutes! RestoSphere works on any tablet, iPad, laptop, or desktop without proprietary hardware. Simply sign in, import your menu, and start taking orders instantly.',
    },
    {
      q: 'Is there a separate portal for staff and customers?',
      a: 'Yes! Staff, managers, and kitchen crew have a high-security Admin & Staff Portal with role-based permissions (POS, KDS, inventory, billing). Customers have a dedicated Guest Portal to browse digital menus, reserve tables, track orders, and view reward points.',
    },
    {
      q: 'Does it support Razorpay and contactless UPI payments?',
      a: 'Absolutely. RestoSphere has native Razorpay integration with dynamic UPI QR codes on bills, card swipes, cash splits, and instant SMS/WhatsApp e-invoices with zero paper waste.',
    },
    {
      q: 'Can it handle high-rush kitchen hours without lag?',
      a: 'Yes, our Live Kitchen Display (KDS) synchronizes in real-time with zero latency. Orders placed by waitstaff or via customer QR codes instantly ping the chef’s station with prep countdown timers and color-coded alerts.',
    },
    {
      q: 'Can I manage multiple restaurant branches or cloud kitchens?',
      a: 'Yes, RestoSphere provides centralized multi-outlet management, unified ingredient inventory, consolidated sales reporting, and role-based staff access across all your locations.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* ────────────────── TOP GLOW & AMBIENT EFFECTS ────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-orange-500/20 via-rose-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-96 -left-48 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 -right-48 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full" />
      </div>

      {/* ────────────────── NAVIGATION BAR ────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
              <UtensilsCrossed className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Resto<span className="text-orange-400">Sphere</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-orange-400/90 uppercase -mt-0.5">
                Restaurant OS & POS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Cleaned: Live POS & KDS and Roles removed) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-orange-400 transition-colors">
              Features
            </a>
            <a href="#portals" className="hover:text-orange-400 transition-colors">
              Sign In Portals
            </a>
            <a href="#pricing" className="hover:text-orange-400 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-orange-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action & Sign In Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Customer Sign In Pill */}
            <Link
              href="/customer/auth"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Customer Login</span>
            </Link>

            {/* Staff Sign In Primary */}
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 border border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10 transition-all flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Staff Sign In</span>
            </Link>

            {/* Launch App / Dashboard */}
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 shadow-lg shadow-orange-500/25 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu (Cleaned: Live POS & KDS and Roles removed) */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-6 bg-slate-950/95 border-b border-slate-800 space-y-4">
            <div className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-orange-400"
              >
                Features
              </a>
              <a
                href="#portals"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-orange-400"
              >
                Sign In Portals
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-orange-400"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-orange-400"
              >
                FAQ
              </a>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-slate-900 text-slate-100 border border-orange-500/40 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                Staff & Admin Sign In
              </Link>
              <Link
                href="/customer/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-slate-900 text-slate-200 border border-slate-800 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-rose-400" />
                Customer & Guest Portal
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-rose-500 shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ────────────────── HERO SECTION ────────────────── */}
      <section className="relative z-10 pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-semibold shadow-inner mb-6 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Next-Generation Restaurant Operating System 2026</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="hidden sm:inline-block text-slate-400 font-normal">Cloud & AI Powered</span>
        </div>

        {/* Main Headline (Reduced Font Size: text-2xl sm:text-4xl lg:text-5xl) */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-4xl mx-auto leading-tight text-white">
          Run Your Restaurant With{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Unstoppable Speed
          </span>{' '}
          & Pure Elegance.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          From lightning-fast POS billing and live kitchen displays to interactive table reservations,
          smart inventory, and contactless Razorpay UPI checkout — everything you need to scale your food business.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          {/* Primary Staff Sign In Button */}
          <Link
            href="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group"
          >
            <ShieldCheck className="w-4 h-4 text-amber-200" />
            <span>Staff Sign In</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Customer Portal Sign In */}
          <Link
            href="/customer/auth"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <UserCheck className="w-4 h-4 text-rose-400" />
            <span>Customer Sign In</span>
          </Link>

          {/* Direct Dashboard Link */}
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-orange-400 hover:text-orange-300 font-semibold text-sm border border-orange-500/30 hover:border-orange-500/60 transition-all flex items-center justify-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-5 sm:gap-10 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero Proprietary Hardware</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Sub-second 0.8s POS Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Instant Razorpay & UPI QR</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Live Kitchen Sync (KDS)</span>
          </div>
        </div>
      </section>

      {/* ────────────────── DEDICATED SIGN IN ACCESS HUB ────────────────── */}
      <section id="portals" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-orange-400 mb-3">
            <LogIn className="w-3.5 h-3.5" />
            <span>Quick Access</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Choose Your <span className="text-orange-400">Sign In Portal</span>
          </h2>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Separate, purpose-built workspaces designed specifically for operational staff and valued diners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Staff & Admin Card */}
          <div className="group relative rounded-3xl p-8 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-orange-500/30 hover:border-orange-500/70 transition-all duration-300 shadow-xl shadow-orange-500/5 hover:shadow-orange-500/15 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-orange-500/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-300">
                  Staff & Management
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Restaurant Staff Portal</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Secure access for Owners, Restaurant Managers, Cashiers, Waiters, and Head Chefs. Manage orders,
                inventory, billing, live kitchen, and staff rosters.
              </p>

              <div className="space-y-2.5 text-xs text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ultra-fast POS Terminal & Split Billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Kitchen Order Tickets (KDS Dispatch)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Floor Plan, Table Occupancy & Server Assignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Stock Alerts, Recipe Costs & Daily EOD Reports</span>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all group-hover:scale-[1.01]"
            >
              <span>Sign In to Staff Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Customer & Guest Card */}
          <div className="group relative rounded-3xl p-8 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-rose-500/30 hover:border-rose-500/70 transition-all duration-300 shadow-xl shadow-rose-500/5 hover:shadow-rose-500/15 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-500/20 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
                  <UserCheck className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  Diners & Guests
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Customer & Guest Portal</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Personalized dining lounge for guests. Reserve tables in advance, view digital photo menus, order from
                phone, track live prep, and earn loyalty perks.
              </p>

              <div className="space-y-2.5 text-xs text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant Table Reservations & Pre-orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Order Tracking from Kitchen to Table</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Loyalty Coins & Exclusive Food Discounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Digital Receipts & WhatsApp Order History</span>
                </div>
              </div>
            </div>

            <Link
              href="/customer/auth"
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white font-bold text-sm border border-rose-500/40 hover:border-rose-500/80 shadow-lg flex items-center justify-center gap-2 transition-all group-hover:scale-[1.01]"
            >
              <span>Sign In as Customer</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────── 6 CORE PILLARS / FEATURES ────────────────── */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-orange-400 mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Enterprise Hospitality Engine</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Every Operation Connected.{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Zero Friction.
            </span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            From single-counter cafes to high-volume multi-floor dining lounges, RestoSphere elevates every step of your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 1. POS */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-6 group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Lightning Cloud POS</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Designed for extreme speed. Split bills by items or seats, customize ingredients, apply promo codes, and print KOTs in under 1 second.
            </p>
          </div>

          {/* 2. KDS */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Live Kitchen Display (KDS)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Eliminate lost paper tickets. Real-time digital dispatch with cook-time countdowns, prep urgency colors, and kitchen bump bar support.
            </p>
          </div>

          {/* 3. Table Floor Plan */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Visual Floor & Table Map</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Drag-and-drop table layouts matching your real dining room. Instantly see vacant, seated, billing, and reserved statuses at a glance.
            </p>
          </div>

          {/* 4. Inventory & Recipes */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Recipe & Inventory</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automatic raw ingredient deductions on every order. Real-time low-stock alerts prevent 86'd menu items during prime dinner rushes.
            </p>
          </div>

          {/* 5. Razorpay & Payments */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Razorpay & UPI Payments</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Direct UPI QR integration on bill prints and customer phones. Support credit cards, tap-to-pay, cash, and digital split payments.
            </p>
          </div>

          {/* 6. Customer CRM & Loyalty */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-6 group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Customer CRM & Loyalty</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Reward your regulars automatically. Track diner preferences, allergy notes, birthdays, and send instant WhatsApp bills and discount coupons.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── PRICING PLANS ────────────────── */}
      <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-orange-400 mb-3">
            <Percent className="w-3.5 h-3.5" />
            <span>Fair & Simple Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Transparent Plans for Every Dining Scale
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            No hidden setup fees. No proprietary terminal rental charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Starter Plan */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Starter Cafe</h3>
              <p className="text-xs text-slate-400 mb-6">Perfect for small bistros, food trucks, and single-counter coffee shops.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">₹1,499</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> 1 POS Billing Terminal
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Digital QR Menu & UPI
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Daily WhatsApp Sales Report
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Up to 15 Tables
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-all"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Growth Plan - Highlighted */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-orange-500 relative shadow-2xl shadow-orange-500/10 flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-extrabold tracking-wider uppercase shadow-md">
              Most Popular
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Pro Dining</h3>
              <p className="text-xs text-slate-400 mb-6">For busy multi-floor restaurants, bars, and high-volume diners.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">₹3,499</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Unlimited POS Billing Devices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Live Kitchen KDS with Sound Alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Interactive 2D Floor Plan Builder
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Recipe Inventory & Cost Tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Razorpay Instant Settlement & SMS
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs text-center shadow-lg shadow-orange-500/25 transition-all"
            >
              Get Started with Pro
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Franchise & Chain</h3>
              <p className="text-xs text-slate-400 mb-6">Centralized control for multi-branch dining brands and franchises.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">₹7,999</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Multi-Outlet Master Admin Console
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Central Kitchen Commissary Sync
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Custom Loyalty Points & Gift Cards
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Dedicated 24/7 Account Support
                </li>
              </ul>
            </div>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-all"
            >
              Contact Enterprise Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────── TESTIMONIALS ────────────────── */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Trusted by 500+ Top Restaurateurs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
              "We slashed our weekend table waiting times from 25 minutes down to 8. The live KDS sync between our
              waiters and kitchen has virtually wiped out wrong orders."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-xs">
                AK
              </div>
              <div>
                <div className="text-xs font-bold text-white">Anand Kulkarni</div>
                <div className="text-[11px] text-slate-400">Founder, Urban Hearth Bistro</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
              "The Razorpay QR on the bill is a gamechanger. Diners scan and pay right at their table without waiting for
              the card machine during Friday peak hours."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs">
                SM
              </div>
              <div>
                <div className="text-xs font-bold text-white">Sara Mehta</div>
                <div className="text-[11px] text-slate-400">GM, Olive Hearth Cafe & Bar</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="flex gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
              "Recipe level inventory tracking helped us cut wastage by 22% in our very first month. We know our exact food
              margins on every single pizza we sell."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                RD
              </div>
              <div>
                <div className="text-xs font-bold text-white">Rohan Deshmukh</div>
                <div className="text-[11px] text-slate-400">Head Chef, Rustico Pizzeria</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── FAQ ACCORDION ────────────────── */}
      <section id="faq" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-2 text-slate-400 text-sm">Everything you need to know about setting up RestoSphere.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-all"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-orange-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    faqOpen === i ? 'rotate-180 text-orange-400' : ''
                  }`}
                />
              </button>
              {faqOpen === i && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────── FINAL VIBRANT CTA BANNER ────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 shadow-2xl shadow-orange-500/20 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Modernize Your Restaurant Experience?
            </h2>
            <p className="mt-4 text-orange-100 text-sm sm:text-lg max-w-xl mx-auto">
              Get started right now. Sign in to your staff portal or access the customer dining lounge with one click.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-orange-50 font-bold text-sm shadow-xl hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-orange-600" />
                <span>Staff & Admin Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/customer/auth"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950/40 hover:bg-slate-950/60 text-white font-bold text-sm border border-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-amber-200" />
                <span>Customer Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Col 1 */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-white">
                Resto<span className="text-orange-400">Sphere</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed mb-4">
              The intelligent, cloud-native Restaurant Operating System powering high-velocity dining, kitchen precision, and customer loyalty.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (99.99%)</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Operations</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/pos" className="hover:text-white transition-colors">
                  POS Terminal
                </Link>
              </li>
              <li>
                <Link href="/kitchen" className="hover:text-white transition-colors">
                  Kitchen KDS
                </Link>
              </li>
              <li>
                <Link href="/tables" className="hover:text-white transition-colors">
                  Table Floor Map
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-white transition-colors">
                  Live Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Management</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Executive Dashboard
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-white transition-colors">
                  Stock & Inventory
                </Link>
              </li>
              <li>
                <Link href="/billing" className="hover:text-white transition-colors">
                  Invoices & Razorpay
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Sign In Portals</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Staff Sign In
                </Link>
              </li>
              <li>
                <Link href="/customer/auth" className="text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Customer Sign In
                </Link>
              </li>
              <li>
                <Link href="/customer/register" className="hover:text-white transition-colors">
                  Guest Registration
                </Link>
              </li>
              <li>
                <Link href="/reservations" className="hover:text-white transition-colors">
                  Online Reservations
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} RestoSphere Operating System. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
  ArrowDown,
  CheckCircle2,
  Layers,
  Store,
  Menu,
  X,
  Star,
  Check,
  ChevronDown,
  Percent,
  UserCheck,
  HeartHandshake,
  Zap,
  Clock,
  TrendingUp,
  Smartphone,
  ExternalLink,
  Printer,
  MessageSquare,
  Phone,
  QrCode,
  BookOpen,
  Bell,
} from 'lucide-react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  const heroRef = useRef<HTMLElement>(null)
  const heroVisualRef = useRef<HTMLDivElement>(null)

  // ── GSAP TIMELINES, PARALLAX & SCROLLTRIGGERS ──
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Hero Entrance Timeline
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.gsap-hero-badge', { y: -25, opacity: 0, scale: 0.9, duration: 0.7 })
        .from('.gsap-hero-title', { y: 35, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.4')
        .from('.gsap-hero-subtitle', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
        .from('.gsap-hero-btn', { y: 20, opacity: 0, scale: 0.94, stagger: 0.1, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.4')
        .from('.gsap-hero-trust', { opacity: 0, y: 15, duration: 0.6 }, '-=0.3')
        .from('.gsap-float-chip', { opacity: 0, scale: 0.8, stagger: 0.1, duration: 0.7, ease: 'back.out(1.5)' }, '-=0.5')

      // 2. Continuous Floating Sinusoidal Ambient Motion
      gsap.to('.gsap-float-chip-1', { y: -10, rotation: 1.5, repeat: -1, yoyo: true, duration: 3.2, ease: 'sine.inOut' })
      gsap.to('.gsap-float-chip-2', { y: 12, rotation: -2, repeat: -1, yoyo: true, duration: 3.8, ease: 'sine.inOut', delay: 0.3 })
      gsap.to('.gsap-float-chip-3', { y: -8, rotation: 1.8, repeat: -1, yoyo: true, duration: 4.1, ease: 'sine.inOut', delay: 0.6 })
      gsap.to('.gsap-float-chip-4', { y: 10, rotation: -1.5, repeat: -1, yoyo: true, duration: 3.5, ease: 'sine.inOut', delay: 0.9 })
    })

    return () => ctx.revert()
  }, [])

  // ── MOUSE PARALLAX TILT EFFECT ──
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)

    gsap.to('.gsap-float-chip-1', { x: x * 22, y: y * 22, duration: 0.5, ease: 'power2.out' })
    gsap.to('.gsap-float-chip-2', { x: -x * 20, y: -y * 20, duration: 0.5, ease: 'power2.out' })
    gsap.to('.gsap-float-chip-3', { x: x * 18, y: -y * 18, duration: 0.5, ease: 'power2.out' })
    gsap.to('.gsap-float-chip-4', { x: -x * 24, y: y * 24, duration: 0.5, ease: 'power2.out' })

    if (heroVisualRef.current) {
      gsap.to(heroVisualRef.current, {
        rotateY: x * 6,
        rotateX: -y * 6,
        transformPerspective: 1000,
        duration: 0.6,
        ease: 'power2.out',
      })
    }
  }

  const handleHeroMouseLeave = () => {
    gsap.to('.gsap-float-chip-1, .gsap-float-chip-2, .gsap-float-chip-3, .gsap-float-chip-4', {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
    if (heroVisualRef.current) {
      gsap.to(heroVisualRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: 'power2.out',
      })
    }
  }

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
        <div className="gsap-orb-top absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-orange-500/20 via-rose-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="gsap-orb-mid absolute top-96 -left-48 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 -right-48 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full" />
      </div>

      {/* ────────────────── NAVIGATION BAR ────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
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

          {/* Desktop Nav Links (Pure Marketing) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#capabilities" className="hover:text-orange-400 transition-colors">
              Capabilities
            </a>
            <a href="#pricing" className="hover:text-orange-400 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-orange-400 transition-colors">
              Reviews
            </a>
            <a href="#faq" className="hover:text-orange-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Hamburger Menu Trigger */}
          <div className="flex items-center gap-3">
            {/* Live Interactive Demo CTA (Marketing) */}
            <Link
              href="/dashboard"
              className="hidden sm:flex px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 shadow-lg shadow-orange-500/25 transition-all items-center gap-1.5 active:scale-95"
            >
              <span>Explore Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Hamburger Menu Button - Hosts Login and Full Navigation */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 transition-all flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              aria-label="Open Navigation and Sign In Menu"
            >
              <Menu className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300 font-medium">Menu & Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* ────────────────── SLIDE-OVER HAMBURGER DRAWER (LOGINS + NAVIGATION) ────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside
            className="relative w-full max-w-sm sm:max-w-md bg-slate-950 border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-10"
            role="dialog"
            aria-label="Site Navigation and Login Portals"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">
                      Resto<span className="text-orange-400">Sphere</span>
                    </span>
                    <span className="text-[10px] text-slate-400 tracking-wider uppercase block">
                      Sign In Portals
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ─── PRIMARY SECTION: LOGIN PORTALS ─── */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sign In Portals
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Staff & Admin Sign In */}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group block p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-orange-500/30 hover:border-orange-500 transition-all hover:shadow-lg hover:shadow-orange-500/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors block">
                            Staff & Admin Sign In
                          </span>
                          <span className="text-[11px] text-orange-400/90 font-medium">
                            Owners, Managers & Kitchen
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-400 pl-12 leading-relaxed">
                      Role-based access for POS Billing, Live Kitchen KDS, Inventory, and Admin controls.
                    </p>
                  </Link>

                  {/* Customer & Guest Login */}
                  <Link
                    href="/customer/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group block p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/60 border border-rose-500/30 hover:border-rose-500 transition-all hover:shadow-lg hover:shadow-rose-500/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors block">
                            Customer & Guest Portal
                          </span>
                          <span className="text-[11px] text-rose-400/90 font-medium">
                            Diners & Table Guests
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-400 pl-12 leading-relaxed">
                      Browse digital photo menus, book tables, track live orders, and redeem reward coins.
                    </p>
                  </Link>

                  {/* Customer Register Link */}
                  <div className="pt-2 flex items-center justify-between px-2 text-xs">
                    <span className="text-slate-400">New dining guest?</span>
                    <Link
                      href="/customer/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2"
                    >
                      Create Guest Account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ────────────────── HERO SECTION (MARKETING-FOCUSED) ────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative z-10 pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center"
      >
        {/* Floating 3D Parallax Glassmorphism Badges */}
        <div className="gsap-float-chip gsap-float-chip-1 absolute top-2 sm:top-6 left-0 sm:left-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-orange-500/30 backdrop-blur-md shadow-xl shadow-orange-500/10">
          <Zap className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-white">0.8s Superfast POS</span>
        </div>

        <div className="gsap-float-chip gsap-float-chip-2 absolute top-4 sm:top-8 right-0 sm:right-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-md shadow-xl shadow-amber-500/10">
          <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-white">Live KDS Active</span>
        </div>

        <div className="gsap-float-chip gsap-float-chip-3 absolute -bottom-6 left-2 sm:left-10 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md shadow-xl shadow-emerald-500/10">
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">Dynamic UPI QR Checkout</span>
        </div>

        <div className="gsap-float-chip gsap-float-chip-4 absolute -bottom-4 right-2 sm:right-10 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-md shadow-xl shadow-indigo-500/10">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white">Daily Sales Auto-Settled</span>
        </div>

        {/* Animated Badge */}
        <div className="gsap-hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-semibold shadow-inner mb-6 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Next-Generation Restaurant Operating System 2026</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="hidden sm:inline-block text-slate-400 font-normal">Cloud & AI Powered</span>
        </div>

        {/* Main Headline */}
        <h1 className="gsap-hero-title text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight max-w-4xl mx-auto leading-tight text-white">
          Run Your Restaurant With{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
            Unstoppable Speed
          </span>{' '}
          & Pure Elegance.
        </h1>

        {/* Subtitle */}
        <p className="gsap-hero-subtitle mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          From lightning-fast POS billing and live kitchen displays to interactive table reservations,
          smart inventory, and contactless Razorpay UPI checkout — everything you need to scale your food business.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          {/* Primary Capabilities Explorer Button */}
          <a
            href="#capabilities"
            className="gsap-hero-btn w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-sm shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Explore Capabilities</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Interactive Live Demo */}
          <Link
            href="/dashboard"
            className="gsap-hero-btn w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <LayoutDashboard className="w-4 h-4 text-orange-400" />
            <span>View Live Demo</span>
          </Link>

          {/* Pricing Jump */}
          <a
            href="#pricing"
            className="gsap-hero-btn w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-orange-400 hover:text-orange-300 font-semibold text-sm border border-orange-500/30 hover:border-orange-500/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Percent className="w-4 h-4" />
            <span>Pricing Plans</span>
          </a>
        </div>

        {/* Trust Badges Bar */}
        <div className="gsap-hero-trust mt-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-5 sm:gap-10 text-xs text-slate-400">
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

      {/* ────────────────── PRODUCT CAPABILITIES & ARCHITECTURE SHOWCASE ────────────────── */}
      <section id="capabilities" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-orange-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Purpose-Built Hospitality Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Engineered for <span className="text-orange-400">High-Velocity Operations</span>
          </h2>
          <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            RestoSphere connects your front of house, kitchen line, and business analytics into one synchronized engine.
          </p>
        </div>

        {/* 2 Big Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Front of House Card */}
          <div className="gsap-cap-card relative rounded-3xl p-8 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-orange-500/30 hover:border-orange-500/60 transition-all duration-300 shadow-xl shadow-orange-500/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
                  <Receipt className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-300">
                  Front of House
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Lightning Fast Billing & Floor Control</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Equip your cashiers and waitstaff with an intuitive interface. Split bills by item or cover, manage table turnovers, and accept dynamic UPI QR payments with instant settlements.
              </p>

              <div className="space-y-2.5 text-xs text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sub-second 0.8s order punching & thermal receipt printing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interactive visual floor map with live vacant/seated statuses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Razorpay UPI QR codes directly printed on diner bill slips</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Multi-counter split payments, cash drawers, and discount controls</span>
                </div>
              </div>
            </div>

            <Link
              href="/pos"
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 text-orange-400 hover:text-white font-bold text-sm border border-orange-500/40 hover:border-orange-500 flex items-center justify-center gap-2 transition-all"
            >
              <span>Explore POS Terminal Experience</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Kitchen & Back of House Card */}
          <div className="gsap-cap-card relative rounded-3xl p-8 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-rose-500/30 hover:border-rose-500/60 transition-all duration-300 shadow-xl shadow-rose-500/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white">
                  <ChefHat className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  Kitchen & Operations
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Live Kitchen KDS & Smart Inventory</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Replace chaotic paper kitchen slips with real-time digital ticket dispatch. Track prep times, send acoustic alerts, and automatically deduct raw ingredients with every dish served.
              </p>

              <div className="space-y-2.5 text-xs text-slate-400 mb-8">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Kitchen Display System (KDS) with color-coded countdowns</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated recipe-level raw stock deductions per order</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Smart low-stock alerts before ingredients hit critical levels</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Consolidated daily revenue, food cost margins, and audit logs</span>
                </div>
              </div>
            </div>

            <Link
              href="/kitchen"
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-850 text-rose-300 hover:text-white font-bold text-sm border border-rose-500/40 hover:border-rose-500 flex items-center justify-center gap-2 transition-all"
            >
              <span>Explore Kitchen KDS Workflow</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 4 Impact Numbers */}
        <div className="gsap-stats-row mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="gsap-stat-box p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center hover:border-orange-500/40 transition-colors">
            <div className="text-2xl sm:text-3xl font-extrabold text-orange-400">0.8s</div>
            <div className="text-xs text-slate-400 mt-1">POS Billing Speed</div>
          </div>
          <div className="gsap-stat-box p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center hover:border-amber-500/40 transition-colors">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">&lt; 15 min</div>
            <div className="text-xs text-slate-400 mt-1">Setup & Onboarding</div>
          </div>
          <div className="gsap-stat-box p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center hover:border-emerald-500/40 transition-colors">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">-22%</div>
            <div className="text-xs text-slate-400 mt-1">Food Waste Reduction</div>
          </div>
          <div className="gsap-stat-box p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center hover:border-rose-500/40 transition-colors">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">+35%</div>
            <div className="text-xs text-slate-400 mt-1">Faster Table Turns</div>
          </div>
        </div>
      </section>

      {/* ────────────────── PRICING PLANS ────────────────── */}
      <section id="pricing" className="relative z-10 py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-orange-500 shadow-xl shadow-orange-500/10 flex flex-col justify-between">
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
              href="/dashboard"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-all block"
            >
              Explore Starter Demo
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
              href="/dashboard"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs text-center shadow-lg shadow-orange-500/25 transition-all block"
            >
              Get Started with Pro Demo
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-orange-500 shadow-xl shadow-orange-500/10 flex flex-col justify-between">
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
            <a
              href="#faq"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs text-center transition-all block"
            >
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────── TESTIMONIALS ────────────────── */}
      <section id="testimonials" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
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

      {/* ────────────────── FINAL MARKETING CTA BANNER ────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl p-8 sm:p-14 overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 shadow-2xl shadow-orange-500/20 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Modernize Your Restaurant Experience?
            </h2>
            <p className="mt-4 text-orange-100 text-sm sm:text-lg max-w-xl mx-auto">
              Experience the modern cloud POS and live kitchen operating system. Explore the interactive demo or choose a plan to get started.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-orange-50 font-bold text-sm shadow-xl hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-orange-600" />
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#pricing"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950/40 hover:bg-slate-950/60 text-white font-bold text-sm border border-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2"
              >
                <Percent className="w-4 h-4 text-amber-200" />
                <span>View Pricing Plans</span>
              </a>
            </div>

            <p className="mt-4 text-orange-200/80 text-xs">
              Looking for portal access? Open the top-right <span className="font-semibold text-white">Menu & Login</span> button anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
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
            <h4 className="font-bold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Portals & Access</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors flex items-center gap-1 text-left"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Staff Sign In (Menu)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="text-rose-400 hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 text-left"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Customer Sign In (Menu)
                </button>
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

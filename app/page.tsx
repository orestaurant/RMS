'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  UtensilsCrossed,
  ChefHat,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
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
  Sliders,
  Flame,
  Award,
  CircleDot,
  Radio,
  Coffee,
  Wine,
  Pizza,
  Monitor,
  Tablet,
  Sparkle,
} from 'lucide-react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')
  const [activeTab, setActiveTab] = useState<'pos' | 'kds' | 'tables' | 'inventory'>('pos')

  const pageRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const heroVisualRef = useRef<HTMLDivElement>(null)

  // Mouse Parallax quickTo function references for 60/120fps reactive movement
  const quickPill1X = useRef<((value: number) => void) | null>(null)
  const quickPill1Y = useRef<((value: number) => void) | null>(null)
  const quickPill2X = useRef<((value: number) => void) | null>(null)
  const quickPill2Y = useRef<((value: number) => void) | null>(null)
  const quickPill3X = useRef<((value: number) => void) | null>(null)
  const quickPill3Y = useRef<((value: number) => void) | null>(null)
  const quickPill4X = useRef<((value: number) => void) | null>(null)
  const quickPill4Y = useRef<((value: number) => void) | null>(null)
  const quickOrbTopX = useRef<((value: number) => void) | null>(null)
  const quickOrbTopY = useRef<((value: number) => void) | null>(null)
  const quickOrbMidX = useRef<((value: number) => void) | null>(null)
  const quickOrbMidY = useRef<((value: number) => void) | null>(null)

  // ────────────────── GSAP ANIMATIONS, SCROLLTRIGGER & PARALLAX ──────────────────
  useEffect(() => {
    // Check initial scroll state
    if (typeof window !== 'undefined' && window.scrollY > 40) {
      setIsScrolled(true)
    }

    const ctx = gsap.context(() => {
      const prefersReducedMotion =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // ── 1. STICKY NAVBAR SCROLL POLISH ──
      ScrollTrigger.create({
        start: 'top -40',
        onUpdate: (self) => {
          setIsScrolled(self.scroll() > 40)
        },
      })

      // Skip heavy motion if user prefers reduced motion (prevents invisible stuck elements)
      if (prefersReducedMotion) return

      // ── 2. QUICKTO INSTANCES FOR MOUSE PARALLAX ──
      quickPill1X.current = gsap.quickTo('.gsap-pill-mouse-1', 'x', { duration: 0.6, ease: 'power2.out' })
      quickPill1Y.current = gsap.quickTo('.gsap-pill-mouse-1', 'y', { duration: 0.6, ease: 'power2.out' })
      quickPill2X.current = gsap.quickTo('.gsap-pill-mouse-2', 'x', { duration: 0.6, ease: 'power2.out' })
      quickPill2Y.current = gsap.quickTo('.gsap-pill-mouse-2', 'y', { duration: 0.6, ease: 'power2.out' })
      quickPill3X.current = gsap.quickTo('.gsap-pill-mouse-3', 'x', { duration: 0.6, ease: 'power2.out' })
      quickPill3Y.current = gsap.quickTo('.gsap-pill-mouse-3', 'y', { duration: 0.6, ease: 'power2.out' })
      quickPill4X.current = gsap.quickTo('.gsap-pill-mouse-4', 'x', { duration: 0.6, ease: 'power2.out' })
      quickPill4Y.current = gsap.quickTo('.gsap-pill-mouse-4', 'y', { duration: 0.6, ease: 'power2.out' })
      quickOrbTopX.current = gsap.quickTo('.gsap-orb-top', 'x', { duration: 1.2, ease: 'power2.out' })
      quickOrbTopY.current = gsap.quickTo('.gsap-orb-top', 'y', { duration: 1.2, ease: 'power2.out' })
      quickOrbMidX.current = gsap.quickTo('.gsap-orb-mid', 'x', { duration: 1.4, ease: 'power2.out' })
      quickOrbMidY.current = gsap.quickTo('.gsap-orb-mid', 'y', { duration: 1.4, ease: 'power2.out' })

      // ── 3. HERO ENTRANCE CHOREOGRAPHY (ON PAGE LOAD) ──
      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      heroTl
        .from('.gsap-hero-badge', { y: 28, opacity: 0, scale: 0.95, duration: 0.8 })
        .from('.gsap-hero-title', { y: 28, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.gsap-hero-subtitle', { y: 28, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.gsap-hero-trust-item', { y: 28, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.5')
        .from(
          '.gsap-hero-btn',
          { y: 20, opacity: 0, scale: 0.94, stagger: 0.08, duration: 0.6, ease: 'back.out(1.4)' },
          '-=0.4'
        )
        .from(
          '.gsap-float-chip',
          { opacity: 0, scale: 0.85, stagger: 0.1, duration: 0.8, ease: 'back.out(1.4)' },
          '-=0.5'
        )
        .from(
          '.gsap-hero-mockup-wrapper',
          { y: 50, opacity: 0, scale: 0.94, duration: 1.0, ease: 'power3.out' },
          '-=0.6'
        )

      // ── 4. CONTINUOUS AMBIENT FLOAT (YOYO SINE WAVE) ──
      gsap.to('.gsap-pill-ambient-1', {
        y: 6,
        rotation: 1.2,
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('.gsap-pill-ambient-2', {
        y: -6,
        rotation: -1.5,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.3,
      })
      gsap.to('.gsap-pill-ambient-3', {
        y: 6,
        rotation: 1.5,
        duration: 4.0,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.6,
      })
      gsap.to('.gsap-pill-ambient-4', {
        y: -6,
        rotation: -1.2,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.9,
      })

      // ── 5. MULTI-SPEED SCROLL PARALLAX ──
      // Top Pills: scrubbed at yPercent: -35
      gsap.to('.gsap-pill-parallax-top', {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        yPercent: -35,
        ease: 'none',
      })

      // Bottom Pills: scrubbed at faster yPercent: -65 for multi-layer 3D depth
      gsap.to('.gsap-pill-parallax-bottom', {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
        yPercent: -65,
        ease: 'none',
      })

      // Hero Centerpiece 3D Mockup Elevation on Scroll
      if (heroVisualRef.current) {
        gsap.to(heroVisualRef.current, {
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
          yPercent: 10,
          rotateX: 8,
          scale: 0.97,
          ease: 'none',
        })
      }

      // Background Ambient Glow Orbs Parallax
      gsap.to('.gsap-orb-top', {
        scrollTrigger: {
          trigger: pageRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2,
        },
        yPercent: -20,
        ease: 'none',
      })

      gsap.to('.gsap-orb-mid', {
        scrollTrigger: {
          trigger: pageRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.6,
        },
        yPercent: 30,
        ease: 'none',
      })

      gsap.to('.gsap-orb-bottom', {
        scrollTrigger: {
          trigger: pageRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 2,
        },
        yPercent: -25,
        ease: 'none',
      })

      // ── 6. CAPABILITIES SECTION STAGGERED REVEAL ──
      gsap.from('.gsap-cap-header', {
        scrollTrigger: {
          trigger: '#capabilities',
          start: 'top 85%',
          once: true,
        },
        y: 35,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      gsap.from('.gsap-cap-card', {
        scrollTrigger: {
          trigger: '.gsap-cap-cards-grid',
          start: 'top 82%',
          once: true,
        },
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      gsap.from('.gsap-stat-box', {
        scrollTrigger: {
          trigger: '.gsap-stats-row',
          start: 'top 85%',
          once: true,
        },
        y: 25,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      })

      // ── 7. PRICING SECTION STAGGER & DEPTH ──
      gsap.from('.gsap-pricing-header', {
        scrollTrigger: {
          trigger: '#pricing',
          start: 'top 85%',
          once: true,
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      gsap.from('.gsap-pricing-card', {
        scrollTrigger: {
          trigger: '.gsap-pricing-grid',
          start: 'top 80%',
          once: true,
        },
        scale: 0.96,
        y: 35,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform,scale',
      })

      // ── 8. REVIEWS / TESTIMONIALS REVEAL ──
      gsap.from('.gsap-reviews-header', {
        scrollTrigger: {
          trigger: '#testimonials',
          start: 'top 85%',
          once: true,
        },
        y: 25,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      gsap.from('.gsap-testimonial-card', {
        scrollTrigger: {
          trigger: '.gsap-reviews-grid',
          start: 'top 80%',
          once: true,
        },
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      // ── 9. FAQ ACCORDION REVEAL (CLEAN CLEARPROPS SO ACCORDION NEVER BREAKS) ──
      gsap.from('.gsap-faq-header', {
        scrollTrigger: {
          trigger: '#faq',
          start: 'top 85%',
          once: true,
        },
        y: 25,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })

      gsap.from('.gsap-faq-item', {
        scrollTrigger: {
          trigger: '.gsap-faq-list',
          start: 'top 80%',
          once: true,
        },
        y: 20,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      })

      // ── 10. FINAL MARKETING CTA BANNER REVEAL ──
      gsap.from('.gsap-cta-banner', {
        scrollTrigger: {
          trigger: '.gsap-cta-section',
          start: 'top 85%',
          once: true,
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  // ── DESKTOP CURSOR PARALLAX (REACTIVELY SHIFTS PILLS & BACKGROUND ORBS & 3D TILT) ──
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)

    quickPill1X.current?.(x * 18)
    quickPill1Y.current?.(y * 18)
    quickPill2X.current?.(-x * 16)
    quickPill2Y.current?.(-y * 16)
    quickPill3X.current?.(x * 20)
    quickPill3Y.current?.(-y * 20)
    quickPill4X.current?.(-x * 22)
    quickPill4Y.current?.(y * 22)

    // Shift background ambient glow slightly opposite to foreground pills for genuine 3D parallax depth
    quickOrbTopX.current?.(-x * 30)
    quickOrbTopY.current?.(-y * 25)
    quickOrbMidX.current?.(-x * 20)
    quickOrbMidY.current?.(-y * 18)

    // 3D Perspective Tilt on the Centerpiece Mockup
    if (heroVisualRef.current) {
      gsap.to(heroVisualRef.current, {
        rotateY: x * 5,
        rotateX: -y * 5,
        transformPerspective: 1200,
        duration: 0.5,
        ease: 'power2.out',
      })
    }
  }

  const handleHeroMouseLeave = () => {
    quickPill1X.current?.(0)
    quickPill1Y.current?.(0)
    quickPill2X.current?.(0)
    quickPill2Y.current?.(0)
    quickPill3X.current?.(0)
    quickPill3Y.current?.(0)
    quickPill4X.current?.(0)
    quickPill4Y.current?.(0)
    quickOrbTopX.current?.(0)
    quickOrbTopY.current?.(0)
    quickOrbMidX.current?.(0)
    quickOrbMidY.current?.(0)

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
    <div
      ref={pageRef}
      className="min-h-screen bg-[#FAFAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-orange-500 selection:text-white font-sans antialiased overflow-x-hidden transition-colors duration-300 relative"
    >
      {/* ────────────────── LUXURY AMBIENT BACKGROUND MATRIX & GLOW ────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-300">
        {/* Subtle Luxury Engineering Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800e_1px,transparent_1px),linear-gradient(to_bottom,#8080800e_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff07_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_65%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Multi-Layered Cinematic Glow Orbs */}
        <div className="gsap-orb-top absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-b from-orange-500/[0.12] via-rose-500/[0.08] dark:from-orange-500/25 dark:via-rose-500/15 to-transparent blur-[150px] rounded-full will-change-transform" />
        <div className="gsap-orb-mid absolute top-96 -left-48 w-[650px] h-[650px] bg-amber-500/[0.08] dark:bg-amber-500/15 blur-[160px] rounded-full will-change-transform" />
        <div className="gsap-orb-bottom absolute top-1/2 -right-48 w-[650px] h-[650px] bg-indigo-500/[0.06] dark:bg-indigo-500/15 blur-[160px] rounded-full will-change-transform" />
      </div>

      {/* ────────────────── STICKY NAVBAR WITH SCROLL FROSTED GLASS ────────────────── */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'backdrop-blur-2xl bg-white/90 dark:bg-slate-950/90 border-b border-orange-500/20 dark:border-orange-500/30 shadow-lg shadow-orange-500/5 dark:shadow-orange-500/10'
            : 'backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-slate-800/70 shadow-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <UtensilsCrossed className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-1.5">
                Resto<span className="text-orange-600 dark:text-orange-400">Sphere</span>
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-black rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 tracking-widest uppercase">
                  OS
                </span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-orange-600 dark:text-orange-400/90 uppercase -mt-0.5">
                Next-Gen Restaurant OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <a href="#capabilities" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Capabilities
            </a>
            <a href="#demo-preview" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Live Preview
            </a>
            <a href="#pricing" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              Reviews
            </a>
            <a href="#faq" className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Hamburger Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Interactive Demo CTA (Marketing) */}
            <Link
              href="/dashboard"
              className="relative group hidden sm:flex px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 shadow-lg shadow-orange-500/25 transition-all items-center gap-1.5 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              <span>Explore Demo</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Theme Toggle Button (Zero-Flicker Micro-Transition) */}
            <ThemeToggle showLabel={false} />

            {/* Hamburger Menu Button - Hosts Login and Full Navigation */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-orange-600 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-orange-500/50 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer"
              aria-label="Open Navigation and Sign In Menu"
            >
              <Menu className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Menu & Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* ────────────────── SLIDE-OVER HAMBURGER DRAWER (LOGINS + NAVIGATION) ────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 transition-colors duration-300"
            role="dialog"
            aria-label="Site Navigation and Login Portals"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-slate-900 dark:text-white block">
                      Resto<span className="text-orange-600 dark:text-orange-400">Sphere</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase block">
                      Sign In Portals
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle showLabel={false} />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Quick Navigation */}
              <div className="mt-5 pb-5 border-b border-slate-200 dark:border-slate-800/80 md:hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  Navigation
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <a
                    href="#capabilities"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Capabilities
                  </a>
                  <a
                    href="#pricing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Pricing
                  </a>
                  <a
                    href="#testimonials"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    Reviews
                  </a>
                  <a
                    href="#faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                  >
                    FAQ
                  </a>
                </div>
              </div>

              {/* ─── PRIMARY SECTION: LOGIN PORTALS ─── */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sign In Portals
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Staff & Admin Sign In */}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group block p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-900/60 border border-orange-500/20 dark:border-orange-500/30 hover:border-orange-500 transition-all hover:shadow-lg hover:shadow-orange-500/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 dark:border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors block">
                            Staff & Admin Sign In
                          </span>
                          <span className="text-[11px] text-orange-600 dark:text-orange-400/90 font-medium">
                            Owners, Managers & Kitchen
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-orange-500 dark:text-orange-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-12 leading-relaxed">
                      Role-based access for POS Billing, Live Kitchen KDS, Inventory, and Admin controls.
                    </p>
                  </Link>

                  {/* Customer & Guest Login */}
                  <Link
                    href="/customer/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="group block p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-900/60 border border-rose-500/20 dark:border-rose-500/30 hover:border-rose-500 transition-all hover:shadow-lg hover:shadow-rose-500/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors block">
                            Customer & Guest Portal
                          </span>
                          <span className="text-[11px] text-rose-600 dark:text-rose-400/90 font-medium">
                            Diners & Table Guests
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-12 leading-relaxed">
                      Browse digital photo menus, book tables, track live orders, and redeem reward coins.
                    </p>
                  </Link>

                  {/* Customer Register Link */}
                  <div className="pt-2 flex items-center justify-between px-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">New dining guest?</span>
                    <Link
                      href="/customer/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold underline underline-offset-2"
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

      {/* ────────────────── HERO SECTION (DARK LUXURY WITH 3D TERMINAL SHOWCASE) ────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative z-10 pt-8 pb-14 md:pt-12 md:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center"
      >
        {/* ── Multi-Speed Scroll & Mouse Parallax Floating Glass Pills ── */}

        {/* Pill 1 - Top Left (0.8s Superfast POS) */}
        <div className="gsap-pill-parallax-top absolute top-2 sm:top-6 left-0 sm:left-4 z-20 pointer-events-none hidden sm:block will-change-transform">
          <div className="gsap-pill-mouse-1 will-change-transform">
            <div className="gsap-pill-ambient-1 gsap-float-chip flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-orange-500/40 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-orange-500/15 transition-colors duration-300">
              <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-500">
                <Zap className="w-4 h-4 fill-orange-500" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">0.8s Superfast POS</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Sub-second order punch</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pill 2 - Top Right (Live KDS Active) */}
        <div className="gsap-pill-parallax-top absolute top-4 sm:top-8 right-0 sm:right-4 z-20 pointer-events-none hidden sm:block will-change-transform">
          <div className="gsap-pill-mouse-2 will-change-transform">
            <div className="gsap-pill-ambient-2 gsap-float-chip flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-amber-500/40 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-amber-500/15 transition-colors duration-300">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Live KDS Active</div>
                <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Zero Kitchen Latency
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pill 3 - Bottom Left (Dynamic UPI QR Checkout) */}
        <div className="gsap-pill-parallax-bottom absolute bottom-24 left-2 sm:left-8 z-20 pointer-events-none hidden md:block will-change-transform">
          <div className="gsap-pill-mouse-3 will-change-transform">
            <div className="gsap-pill-ambient-3 gsap-float-chip flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-emerald-500/40 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-emerald-500/15 transition-colors duration-300">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                <QrCode className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Dynamic UPI QR Checkout</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Razorpay auto-settled</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pill 4 - Bottom Right (Daily Sales Auto-Settled) */}
        <div className="gsap-pill-parallax-bottom absolute bottom-24 right-2 sm:right-8 z-20 pointer-events-none hidden md:block will-change-transform">
          <div className="gsap-pill-mouse-4 will-change-transform">
            <div className="gsap-pill-ambient-4 gsap-float-chip flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-indigo-500/40 backdrop-blur-xl shadow-lg dark:shadow-2xl dark:shadow-indigo-500/15 transition-colors duration-300">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-500">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Daily Sales Auto-Settled</div>
                <div className="text-[10px] text-emerald-500 font-semibold">+34.8% Weekend Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Badge */}
        <div className="gsap-hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-orange-500/10 border border-slate-200/90 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-semibold shadow-sm dark:shadow-[0_0_20px_rgba(249,115,22,0.2)] mb-5 backdrop-blur-md transition-colors duration-300">
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Next-Generation Restaurant Operating System 2026</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-orange-500 dark:bg-orange-400" />
          <span className="hidden sm:inline-block text-slate-500 dark:text-slate-400 font-normal">Cloud & AI Powered</span>
        </div>

        {/* Main Headline */}
        <h1 className="gsap-hero-title text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl mx-auto leading-[1.1] text-slate-900 dark:text-white transition-colors duration-300">
          Run Your Restaurant With{' '}
          <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent drop-shadow-sm">
            Unstoppable Speed
          </span>{' '}
          & Pure Elegance.
        </h1>

        {/* Subtitle */}
        <p className="gsap-hero-subtitle mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal transition-colors duration-300">
          From lightning-fast POS billing and live kitchen displays to interactive table reservations,
          smart inventory, and contactless Razorpay UPI checkout — everything you need to scale your food business.
        </p>

        {/* Trust Badges Bar (Directly below subtitle) */}
        <div className="gsap-hero-trust mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-700 dark:text-slate-300 transition-colors duration-300">
          <div className="gsap-hero-trust-item flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero Proprietary Hardware</span>
          </div>
          <div className="gsap-hero-trust-item flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Sub-second 0.8s POS Billing</span>
          </div>
          <div className="gsap-hero-trust-item flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Instant Razorpay & UPI QR</span>
          </div>
          <div className="gsap-hero-trust-item flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Live Kitchen Sync (KDS)</span>
          </div>
        </div>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-2xl mx-auto">
          {/* Primary Capabilities Explorer Button */}
          <a
            href="#capabilities"
            className="gsap-hero-btn group relative w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-extrabold text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700" />
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Explore Capabilities</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Interactive Live Demo */}
          <Link
            href="/dashboard"
            className="gsap-hero-btn w-full sm:w-auto px-7 py-4 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-300 dark:border-slate-700 hover:border-orange-500/50 dark:hover:border-orange-500/50 shadow-sm dark:shadow-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <LayoutDashboard className="w-4 h-4 text-orange-500" />
            <span>Live Demo</span>
          </Link>

          {/* Pricing Jump */}
          <a
            href="#pricing"
            className="gsap-hero-btn w-full sm:w-auto px-6 py-4 rounded-2xl bg-white dark:bg-slate-950/80 hover:bg-orange-50/50 dark:hover:bg-slate-900 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-bold text-sm border border-orange-300 dark:border-orange-500/30 hover:border-orange-500 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Percent className="w-4 h-4" />
            <span>Pricing</span>
          </a>
        </div>

        {/* ── 3D HERO PERSPECTIVE VISUAL SHOWCASE (CROWN JEWEL INTERACTIVE CENTERPIECE) ── */}
        <div id="demo-preview" className="gsap-hero-mockup-wrapper mt-14 sm:mt-18 relative max-w-5xl mx-auto">
          {/* Ambient Multi-Hue Rim Glow */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 rounded-3xl blur-2xl opacity-20 dark:opacity-35 pointer-events-none -z-10" />

          {/* 3D Perspective Card Container */}
          <div
            ref={heroVisualRef}
            className="relative rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl dark:shadow-[0_20px_90px_-15px_rgba(249,115,22,0.25)] overflow-hidden transition-all text-left"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* macOS Browser / Terminal Chrome Top Bar */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline-flex items-center gap-2">
                  <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-bold">resto-pos://live-terminal</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span>Branch: Mumbai Flagship #01</span>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/25">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  KDS Realtime Sync (0.18s)
                </span>
                <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">v4.2 PRO</span>
              </div>
            </div>

            {/* Terminal Live Interface Body */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (Floor Status & Quick KPIs) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Real-time Sales Ticker */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Today's Live Revenue</span>
                    <span className="text-emerald-500 font-bold">+28.4% vs yday</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    ₹1,48,920<span className="text-sm font-medium text-slate-400">.00</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span>184 Orders Placed</span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">Avg ₹809 / order</span>
                  </div>
                </div>

                {/* Table Floor Snapshot */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white mb-2.5 flex items-center justify-between">
                    <span>Floor Tables (Live Status)</span>
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 uppercase tracking-wider font-semibold">16 / 20 Occupied</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      T-01
                      <div className="text-[9px] font-normal">Active</div>
                    </div>
                    <div className="p-2 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 animate-pulse">
                      T-04
                      <div className="text-[9px] font-normal">Billing</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      T-07
                      <div className="text-[9px] font-normal">Rush</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      T-12
                      <div className="text-[9px] font-normal">Vacant</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Column: Live Active Order (Table #04) */}
              <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Table #04 (VIP Terrace)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Prep Ready
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Waitstaff: Vikram K. • 4 Guests • KOT #108</div>
                    </div>
                    <Printer className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mt-3 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-600 dark:text-orange-400">2x</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">Woodfired Truffle Burrata Pizza</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹1,398</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-600 dark:text-orange-400">1x</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">Charcoal Smoked Chicken Skewers</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹485</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-600 dark:text-orange-400">3x</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">Wild Berry Mint Cooler Mocktail</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">₹597</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Bill (Incl. GST 5%)</div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white">₹2,599<span className="text-xs text-slate-400">.00</span></div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20">
                    <Zap className="w-3.5 h-3.5" /> Instant Punch
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic UPI QR Checkout Preview */}
              <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-orange-50/30 dark:from-slate-950/80 dark:to-orange-950/20 border border-orange-500/25 flex flex-col items-center justify-between text-center">
                <div className="w-full">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 mb-2">
                    <QrCode className="w-4 h-4" />
                    <span>Dynamic UPI QR</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">Table #04 Bill Slip QR</div>

                  {/* Stylized QR Code Frame */}
                  <div className="relative mx-auto w-28 h-28 p-2 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-xl p-1.5 flex items-center justify-center relative overflow-hidden">
                      <QrCode className="w-20 h-20 text-white" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/30 to-transparent animate-pulse" />
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-2">
                    GPay • PhonePe • Paytm • BHIM
                  </div>
                </div>

                <div className="w-full mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Razorpay Instant Sync
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RESTAURANT SOCIAL PROOF MARQUEE STRIP ── */}
        <div className="mt-14 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-5">
            Trusted by 500+ Top Diners, Luxury Cafes & Cloud Kitchens Across India
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 text-slate-600 dark:text-slate-400 font-extrabold text-sm sm:text-base opacity-75">
            <span className="flex items-center gap-2 hover:text-orange-500 transition-colors">
              <Flame className="w-4 h-4 text-orange-500" /> Charcoal & Hearth
            </span>
            <span className="flex items-center gap-2 hover:text-orange-500 transition-colors">
              <Wine className="w-4 h-4 text-rose-500" /> Olive Grove Bistro
            </span>
            <span className="flex items-center gap-2 hover:text-orange-500 transition-colors">
              <Pizza className="w-4 h-4 text-amber-500" /> Rustico Pizzeria
            </span>
            <span className="flex items-center gap-2 hover:text-orange-500 transition-colors">
              <Coffee className="w-4 h-4 text-orange-600" /> Artisan Roast Bar
            </span>
            <span className="flex items-center gap-2 hover:text-orange-500 transition-colors">
              <Award className="w-4 h-4 text-indigo-500" /> The Imperial Dining
            </span>
          </div>
        </div>
      </section>

      {/* ────────────────── PRODUCT CAPABILITIES & ARCHITECTURE SHOWCASE ────────────────── */}
      <section id="capabilities" className="relative z-10 pt-10 pb-16 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="gsap-cap-header text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-orange-600 dark:text-orange-400 shadow-sm mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Purpose-Built Hospitality Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Engineered for <span className="text-orange-600 dark:text-orange-400">High-Velocity Operations</span>
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            RestoSphere connects your front of house, kitchen line, and business analytics into one synchronized engine.
          </p>

          {/* Interactive Capabilities Mode Switcher Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              01. 0.8s POS Billing
            </button>
            <button
              onClick={() => setActiveTab('kds')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'kds'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              02. Live Kitchen KDS
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              03. Interactive Floor Map
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              04. Smart Inventory
            </button>
          </div>
        </div>

        {/* 2 Big Feature Highlights with Hover Lift (-6px) & Glow */}
        <div className="gsap-cap-cards-grid grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Front of House Card */}
          <div className="gsap-cap-card group relative rounded-3xl p-8 sm:p-9 bg-white dark:bg-gradient-to-b dark:from-slate-900/95 dark:via-slate-900/70 dark:to-slate-950 border border-slate-200/90 dark:border-orange-500/30 hover:border-orange-500/80 dark:hover:border-orange-500/80 hover:-translate-y-1.5 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 dark:shadow-xl dark:shadow-orange-500/5 dark:hover:shadow-orange-500/25 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 text-white group-hover:scale-105 transition-transform duration-300">
                  <Receipt className="w-7 h-7" />
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400">
                  Front of House
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                Lightning Fast Billing & Floor Control
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                Equip your cashiers and waitstaff with an intuitive interface. Split bills by item or cover, manage table turnovers, and accept dynamic UPI QR payments with instant settlements.
              </p>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Sub-second 0.8s order punching & thermal receipt printing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Interactive visual floor map with live vacant/seated statuses</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Razorpay UPI QR codes directly printed on diner bill slips</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Multi-counter split payments, cash drawers, and discount controls</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pos"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Open POS Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Kitchen & Back of House Card */}
          <div className="gsap-cap-card group relative rounded-3xl p-8 sm:p-9 bg-white dark:bg-gradient-to-b dark:from-slate-900/95 dark:via-slate-900/70 dark:to-slate-950 border border-slate-200/90 dark:border-rose-500/30 hover:border-rose-500/80 dark:hover:border-rose-500/80 hover:-translate-y-1.5 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-rose-500/20 dark:shadow-xl dark:shadow-rose-500/5 dark:hover:shadow-rose-500/25 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/25 text-white group-hover:scale-105 transition-transform duration-300">
                  <ChefHat className="w-7 h-7" />
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  Kitchen & Operations
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                Live Kitchen KDS & Smart Inventory
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                Replace chaotic paper kitchen slips with real-time digital ticket dispatch. Track prep times, send acoustic alerts, and automatically deduct raw ingredients with every dish served.
              </p>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Live Kitchen Display System (KDS) with color-coded countdowns</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Automated recipe-level raw stock deductions per order</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Smart low-stock alerts before ingredients hit critical levels</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span>Consolidated daily revenue, food cost margins, and audit logs</span>
                </div>
              </div>
            </div>

            <Link
              href="/kitchen"
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-800 dark:text-rose-300 hover:text-rose-600 dark:hover:text-white font-bold text-sm border border-slate-200 dark:border-rose-500/40 hover:border-rose-500 flex items-center justify-center gap-2 transition-all shadow-sm dark:shadow-none"
            >
              <span>Explore Kitchen KDS Workflow</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 4 Impact Numbers with Elevated Luxury Borders */}
        <div className="gsap-stats-row mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          <div className="gsap-stat-box p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 text-center hover:border-orange-500/60 hover:-translate-y-1.5 transition-all shadow-md dark:shadow-xl dark:shadow-orange-500/5">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">0.8s</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold">POS Billing Speed</div>
            <div className="text-[10px] text-slate-400 mt-0.5">3x faster than legacy POS</div>
          </div>
          <div className="gsap-stat-box p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 text-center hover:border-amber-500/60 hover:-translate-y-1.5 transition-all shadow-md dark:shadow-xl dark:shadow-amber-500/5">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">&lt; 15 min</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold">Setup & Onboarding</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Zero installation delays</div>
          </div>
          <div className="gsap-stat-box p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 text-center hover:border-emerald-500/60 hover:-translate-y-1.5 transition-all shadow-md dark:shadow-xl dark:shadow-emerald-500/5">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">-22%</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold">Food Waste Reduction</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Automated recipe tracking</div>
          </div>
          <div className="gsap-stat-box p-6 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 text-center hover:border-rose-500/60 hover:-translate-y-1.5 transition-all shadow-md dark:shadow-xl dark:shadow-rose-500/5">
            <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">+35%</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold">Faster Table Turns</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peak weekend throughput</div>
          </div>
        </div>
      </section>

      {/* ────────────────── PRICING PLANS (WITH MONTHLY/ANNUAL TOGGLE & LUXURY SHIMMER) ────────────────── */}
      <section id="pricing" className="relative z-10 py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="gsap-pricing-header text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-orange-600 dark:text-orange-400 shadow-sm mb-3">
            <Percent className="w-3.5 h-3.5" />
            <span>Fair & Simple Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Transparent Plans for Every Dining Scale
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            No hidden setup fees. No proprietary terminal rental charges.
          </p>

          {/* Billing Cycle Switcher Toggle */}
          <div className="mt-7 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white/20 text-white uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="gsap-pricing-grid grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Starter Plan */}
          <div className="gsap-pricing-card group p-8 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:-translate-y-2 shadow-md dark:shadow-xl hover:shadow-xl dark:hover:shadow-orange-500/10 flex flex-col justify-between transition-all duration-300">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Starter Cafe</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Perfect for small bistros, food trucks, and single-counter coffee shops.</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {billingCycle === 'annual' ? '₹1,199' : '₹1,499'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400"> / month</span>
                {billingCycle === 'annual' && (
                  <div className="text-[11px] text-emerald-500 font-semibold mt-1">Billed annually (Save ₹3,600/yr)</div>
                )}
              </div>
              <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> 1 POS Billing Terminal
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Digital QR Menu & UPI Checkout
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Daily WhatsApp Sales Report
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Up to 15 Tables & Takeaway
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs text-center border border-slate-200 dark:border-transparent transition-all block"
            >
              Explore Starter Demo
            </Link>
          </div>

          {/* Growth Plan - Highlighted Featured Plan */}
          <div className="gsap-pricing-card group p-8 sm:p-9 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-2 border-orange-500 relative shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/35 hover:-translate-y-2.5 flex flex-col justify-between transition-all duration-300">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-white text-[11px] font-black tracking-wider uppercase shadow-lg shadow-orange-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <span>Most Popular</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Pro Dining</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">For busy multi-floor restaurants, bars, and high-volume diners.</p>
              <div className="mb-6">
                <span className="text-5xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  {billingCycle === 'annual' ? '₹2,799' : '₹3,499'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400"> / month</span>
                {billingCycle === 'annual' && (
                  <div className="text-[11px] text-emerald-500 font-semibold mt-1">Billed annually (Save ₹8,400/yr)</div>
                )}
              </div>
              <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-200 mb-8 font-medium">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" /> Unlimited POS Billing Devices
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" /> Live Kitchen KDS with Sound Alerts
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" /> Interactive 2D Floor Plan Builder
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" /> Recipe Inventory & Food Cost Tracking
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 stroke-[2.5]" /> Razorpay Instant Settlement & SMS Bills
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:opacity-95 text-white font-black text-xs text-center shadow-lg shadow-orange-500/30 transition-all block"
            >
              Get Started with Pro Demo
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="gsap-pricing-card group p-8 rounded-3xl bg-white dark:bg-gradient-to-b dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:-translate-y-2 shadow-md dark:shadow-xl hover:shadow-xl dark:hover:shadow-orange-500/10 flex flex-col justify-between transition-all duration-300">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Franchise & Chain</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Centralized control for multi-branch dining brands and franchises.</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {billingCycle === 'annual' ? '₹6,399' : '₹7,999'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400"> / month</span>
                {billingCycle === 'annual' && (
                  <div className="text-[11px] text-emerald-500 font-semibold mt-1">Billed annually (Save ₹19,200/yr)</div>
                )}
              </div>
              <ul className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Multi-Outlet Master Admin Console
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Central Kitchen Commissary Sync
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Custom Loyalty Points & Gift Cards
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Dedicated 24/7 Account Support
                </li>
              </ul>
            </div>
            <a
              href="#faq"
              className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs text-center border border-slate-200 dark:border-transparent transition-all block cursor-pointer"
            >
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────── TESTIMONIALS ────────────────── */}
      <section id="testimonials" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="gsap-reviews-header text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-orange-600 dark:text-orange-400 shadow-sm mb-3">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Proven Customer Success</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Trusted by 500+ Top Restaurateurs
          </h2>
        </div>

        <div className="gsap-reviews-grid grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="gsap-testimonial-card p-7 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 hover:-translate-y-1.5 shadow-md hover:shadow-xl dark:shadow-none transition-all duration-300">
            <div className="flex gap-1 text-amber-500 dark:text-amber-400 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-5">
              "We slashed our weekend table waiting times from 25 minutes down to 8. The live KDS sync between our
              waiters and kitchen has virtually wiped out wrong orders."
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold flex items-center justify-center text-xs shadow-md">
                AK
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Anand Kulkarni</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Founder, Urban Hearth Bistro</div>
              </div>
            </div>
          </div>

          <div className="gsap-testimonial-card p-7 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 hover:-translate-y-1.5 shadow-md hover:shadow-xl dark:shadow-none transition-all duration-300">
            <div className="flex gap-1 text-amber-500 dark:text-amber-400 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-5">
              "The Razorpay QR on the bill is a gamechanger. Diners scan and pay right at their table without waiting for
              the card machine during Friday peak hours."
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-bold flex items-center justify-center text-xs shadow-md">
                SM
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Sara Mehta</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">GM, Olive Hearth Cafe & Bar</div>
              </div>
            </div>
          </div>

          <div className="gsap-testimonial-card p-7 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:-translate-y-1.5 shadow-md hover:shadow-xl dark:shadow-none transition-all duration-300">
            <div className="flex gap-1 text-amber-500 dark:text-amber-400 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 dark:fill-amber-400" />
              ))}
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic mb-5">
              "Recipe level inventory tracking helped us cut wastage by 22% in our very first month. We know our exact food
              margins on every single pizza we sell."
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-md">
                RD
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Rohan Deshmukh</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Head Chef, Rustico Pizzeria</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── FAQ ACCORDION ────────────────── */}
      <section id="faq" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="gsap-faq-header text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">Everything you need to know about setting up RestoSphere.</p>
        </div>

        <div className="gsap-faq-list space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="gsap-faq-item rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-none transition-all"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    faqOpen === i ? 'rotate-180 text-orange-600 dark:text-orange-400' : ''
                  }`}
                />
              </button>
              {faqOpen === i && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────── FINAL MARKETING CTA BANNER (LUXURY GLOW) ────────────────── */}
      <section className="gsap-cta-section relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="gsap-cta-banner relative rounded-3xl p-8 sm:p-14 overflow-hidden bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 shadow-2xl shadow-orange-500/25 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Modernize Your Restaurant Experience?
            </h2>
            <p className="mt-4 text-orange-100 text-sm sm:text-lg max-w-xl mx-auto font-medium">
              Experience the modern cloud POS and live kitchen operating system. Explore the interactive demo or choose a plan to get started.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-950 hover:bg-orange-50 font-black text-sm shadow-2xl hover:scale-105 active:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-orange-600" />
                <span>Launch Interactive Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#pricing"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-950/40 hover:bg-slate-950/60 text-white font-bold text-sm border border-white/20 hover:border-white/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Percent className="w-4 h-4 text-amber-200" />
                <span>View Pricing Plans</span>
              </a>
            </div>

            <p className="mt-5 text-orange-200/90 text-xs">
              Looking for portal access? Open the top-right <span className="font-semibold text-white">Menu & Login</span> button anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-600 dark:text-slate-400 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Col 1 */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                Resto<span className="text-orange-600 dark:text-orange-400">Sphere</span>
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-sm text-xs leading-relaxed mb-4">
              The intelligent, cloud-native Restaurant Operating System powering high-velocity dining, kitchen precision, and customer loyalty.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (99.99% Cloud Uptime)</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Operations</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/pos" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  POS Terminal
                </Link>
              </li>
              <li>
                <Link href="/kitchen" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Kitchen KDS
                </Link>
              </li>
              <li>
                <Link href="/tables" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Table Floor Map
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Live Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Management</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Executive Dashboard
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Stock & Inventory
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-200 mb-3 uppercase tracking-wider text-[11px]">Portals & Access</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold transition-colors flex items-center gap-1 text-left cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Staff Sign In (Menu)
                </button>
              </li>
              <li>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold transition-colors flex items-center gap-1 text-left cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Customer Sign In (Menu)
                </button>
              </li>
              <li>
                <Link href="/customer/register" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Guest Registration
                </Link>
              </li>
              <li>
                <Link href="/reservations" className="hover:text-orange-600 dark:hover:text-white transition-colors">
                  Online Reservations
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} RestoSphere Operating System. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-orange-600 dark:hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-orange-600 dark:hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-orange-600 dark:hover:text-white cursor-pointer transition-colors">Security</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

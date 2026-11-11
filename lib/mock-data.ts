// ── Types ──────────────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service'
export type OrderStatus = 'pending' | 'accepted' | 'cooking' | 'ready' | 'served'
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'razorpay' | 'paytm'

export interface DiningTable {
  id: string
  number: number
  section: 'indoor' | 'outdoor' | 'vip' | 'beach'
  capacity: number
  status: TableStatus
  waiter?: string
  occupiedSince?: string
  guestCount?: number
  currentOrderId?: string
  x: number
  y: number
}

export interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  image: string
  description: string
  isVeg: boolean
  isAvailable: boolean
  gst: number
  rating: number
  prepTime: number
  variants?: { name: string; price: number }[]
  addons?: { name: string; price: number }[]
  tags?: string[]
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  price: number
  notes?: string
  addons?: string[]
}

export interface Order {
  id: string
  tableId: string
  tableNumber: number
  items: OrderItem[]
  status: OrderStatus
  waiter: string
  createdAt: string
  updatedAt: string
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod?: PaymentMethod
  specialNotes?: string
  priority: 'normal' | 'high' | 'urgent'
  ticketTime: number // minutes since order placed
}

export interface StaffMember {
  id: string
  name: string
  role: string
  avatar: string
  status: 'active' | 'break' | 'offline'
  tablesAssigned: number[]
  ordersToday: number
  performanceScore: number
}

export interface Reservation {
  id: string
  guestName: string
  guestPhone: string
  guestEmail: string
  tableId: string
  tableNumber: number
  date: string
  time: string
  guestCount: number
  status: 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'seated'
  notes?: string
  prepayment?: number
}

// ── Revenue Data ──────────────────────────────────────────────────────────

export const revenueData = [
  { time: '6am', revenue: 1200, orders: 8 },
  { time: '8am', revenue: 4800, orders: 32 },
  { time: '10am', revenue: 3200, orders: 21 },
  { time: '12pm', revenue: 18400, orders: 124 },
  { time: '2pm', revenue: 14200, orders: 98 },
  { time: '4pm', revenue: 6800, orders: 45 },
  { time: '6pm', revenue: 22100, orders: 148 },
  { time: '8pm', revenue: 28400, orders: 192 },
  { time: '10pm', revenue: 16200, orders: 109 },
]

export const weeklyRevenue = [
  { day: 'Mon', revenue: 84200, target: 80000 },
  { day: 'Tue', revenue: 91500, target: 85000 },
  { day: 'Wed', revenue: 78900, target: 80000 },
  { day: 'Thu', revenue: 102400, target: 90000 },
  { day: 'Fri', revenue: 138200, target: 120000 },
  { day: 'Sat', revenue: 172800, target: 150000 },
  { day: 'Sun', revenue: 156400, target: 140000 },
]

export const categoryRevenue = [
  { name: 'Main Course', value: 42, color: 'var(--chart-1)' },
  { name: 'Beverages', value: 22, color: 'var(--chart-2)' },
  { name: 'Appetizers', value: 18, color: 'var(--chart-3)' },
  { name: 'Desserts', value: 12, color: 'var(--chart-4)' },
  { name: 'Specials', value: 6, color: 'var(--chart-5)' },
]

// ── Tables ──────────────────────────────────────────────────────────────

export const tables: DiningTable[] = [
  { id: 't1', number: 1, section: 'indoor', capacity: 2, status: 'occupied', waiter: 'Arjun S.', occupiedSince: '19:15', guestCount: 2, x: 60, y: 80 },
  { id: 't2', number: 2, section: 'indoor', capacity: 4, status: 'available', x: 200, y: 80 },
  { id: 't3', number: 3, section: 'indoor', capacity: 4, status: 'reserved', x: 340, y: 80 },
  { id: 't4', number: 4, section: 'indoor', capacity: 6, status: 'occupied', waiter: 'Priya M.', occupiedSince: '18:45', guestCount: 5, x: 480, y: 80 },
  { id: 't5', number: 5, section: 'indoor', capacity: 4, status: 'cleaning', x: 60, y: 220 },
  { id: 't6', number: 6, section: 'indoor', capacity: 2, status: 'available', x: 200, y: 220 },
  { id: 't7', number: 7, section: 'indoor', capacity: 8, status: 'occupied', waiter: 'Rohit K.', occupiedSince: '20:00', guestCount: 7, x: 340, y: 220 },
  { id: 't8', number: 8, section: 'indoor', capacity: 4, status: 'available', x: 480, y: 220 },
  { id: 't9', number: 9, section: 'outdoor', capacity: 2, status: 'available', x: 60, y: 360 },
  { id: 't10', number: 10, section: 'outdoor', capacity: 4, status: 'occupied', waiter: 'Arjun S.', occupiedSince: '19:30', guestCount: 3, x: 200, y: 360 },
  { id: 't11', number: 11, section: 'outdoor', capacity: 4, status: 'reserved', x: 340, y: 360 },
  { id: 't12', number: 12, section: 'outdoor', capacity: 2, status: 'available', x: 480, y: 360 },
  { id: 'v1', number: 101, section: 'vip', capacity: 8, status: 'occupied', waiter: 'Neha R.', occupiedSince: '18:00', guestCount: 6, x: 60, y: 500 },
  { id: 'v2', number: 102, section: 'vip', capacity: 10, status: 'reserved', x: 240, y: 500 },
  { id: 'v3', number: 103, section: 'vip', capacity: 12, status: 'available', x: 440, y: 500 },
]

// ── Menu Items ──────────────────────────────────────────────────────────

export const menuCategories = [
  { id: 'all', label: 'All Items', icon: '🍽️' },
  { id: 'appetizers', label: 'Appetizers', icon: '🥗' },
  { id: 'mains', label: 'Main Course', icon: '🍛' },
  { id: 'breads', label: 'Breads', icon: '🫓' },
  { id: 'beverages', label: 'Beverages', icon: '🥤' },
  { id: 'desserts', label: 'Desserts', icon: '🍰' },
  { id: 'specials', label: "Chef's Specials", icon: '⭐' },
]

export const menuItems: MenuItem[] = [
  {
    id: 'm1', name: 'Paneer Tikka', category: 'appetizers', price: 320, image: '/food/paneer-tikka.jpg',
    description: 'Tender cottage cheese marinated in spiced yogurt, char-grilled in tandoor',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.8, prepTime: 15,
    addons: [{ name: 'Extra Chutney', price: 30 }, { name: 'Cheese Topping', price: 50 }],
    tags: ['bestseller', 'spicy'],
  },
  {
    id: 'm2', name: 'Dal Makhani', category: 'mains', price: 280, image: '/food/dal-makhani.jpg',
    description: 'Slow-cooked black lentils with butter and cream, a timeless classic',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.9, prepTime: 20,
    tags: ['bestseller'],
  },
  {
    id: 'm3', name: 'Butter Chicken', category: 'mains', price: 420, image: '/food/butter-chicken.jpg',
    description: 'Succulent chicken in rich tomato-cream sauce with aromatic spices',
    isVeg: false, isAvailable: true, gst: 5, rating: 4.7, prepTime: 18,
    variants: [{ name: 'Half', price: 280 }, { name: 'Full', price: 420 }],
    addons: [{ name: 'Extra Gravy', price: 60 }, { name: 'Bone-in', price: 0 }],
    tags: ['popular'],
  },
  {
    id: 'm4', name: 'Garlic Naan', category: 'breads', price: 60, image: '/food/garlic-naan.jpg',
    description: 'Freshly baked leavened bread with garlic butter and coriander',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.6, prepTime: 8,
    tags: ['quick'],
  },
  {
    id: 'm5', name: 'Biryani Hyderabadi', category: 'mains', price: 480, image: '/food/biryani.jpg',
    description: 'Aromatic long-grain basmati with slow-cooked meat and saffron',
    isVeg: false, isAvailable: true, gst: 5, rating: 4.9, prepTime: 25,
    variants: [{ name: 'Veg', price: 360 }, { name: 'Chicken', price: 480 }, { name: 'Mutton', price: 560 }],
    tags: ['bestseller', 'popular'],
  },
  {
    id: 'm6', name: 'Masala Chai', category: 'beverages', price: 60, image: '/food/chai.jpg',
    description: 'Traditional Indian spiced tea with milk',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.5, prepTime: 5,
    variants: [{ name: 'Regular', price: 60 }, { name: 'Large', price: 90 }],
    tags: ['quick'],
  },
  {
    id: 'm7', name: 'Gulab Jamun', category: 'desserts', price: 120, image: '/food/gulab-jamun.jpg',
    description: 'Milk-solid dumplings soaked in rose-flavored sugar syrup',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.7, prepTime: 5,
    addons: [{ name: 'Vanilla Ice Cream', price: 80 }],
    tags: ['popular'],
  },
  {
    id: 'm8', name: 'Tandoori Platter', category: 'specials', price: 890, image: '/food/tandoori-platter.jpg',
    description: "Chef's signature platter with assorted tandoor specialties for 2",
    isVeg: false, isAvailable: true, gst: 5, rating: 4.9, prepTime: 30,
    tags: ['bestseller', 'chef-special'],
  },
  {
    id: 'm9', name: 'Mango Lassi', category: 'beverages', price: 140, image: '/food/mango-lassi.jpg',
    description: 'Refreshing blend of yogurt with Alphonso mangoes',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.8, prepTime: 5,
    tags: ['popular'],
  },
  {
    id: 'm10', name: 'Chole Bhature', category: 'mains', price: 220, image: '/food/chole-bhature.jpg',
    description: 'Spiced chickpea curry served with deep-fried bread',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.6, prepTime: 15,
    tags: ['vegetarian'],
  },
  {
    id: 'm11', name: 'Chicken Tikka', category: 'appetizers', price: 380, image: '/food/chicken-tikka.jpg',
    description: 'Boneless chicken marinated in yogurt and spices, grilled in tandoor',
    isVeg: false, isAvailable: true, gst: 5, rating: 4.7, prepTime: 18,
    tags: ['popular'],
  },
  {
    id: 'm12', name: 'Rasmalai', category: 'desserts', price: 150, image: '/food/rasmalai.jpg',
    description: 'Soft cottage cheese dumplings in sweetened saffron milk',
    isVeg: true, isAvailable: true, gst: 5, rating: 4.8, prepTime: 5,
    tags: ['popular'],
  },
]

// ── Orders ─────────────────────────────────────────────────────────────

export const liveOrders: Order[] = [
  {
    id: 'ORD-0291', tableId: 't1', tableNumber: 1,
    items: [
      { id: 'oi1', menuItemId: 'm3', name: 'Butter Chicken', quantity: 1, price: 420 },
      { id: 'oi2', menuItemId: 'm4', name: 'Garlic Naan', quantity: 2, price: 60 },
    ],
    status: 'cooking', waiter: 'Arjun S.', createdAt: '2024-01-15T19:18:00', updatedAt: '2024-01-15T19:22:00',
    subtotal: 540, tax: 27, discount: 0, total: 567, priority: 'normal', ticketTime: 12,
  },
  {
    id: 'ORD-0292', tableId: 't4', tableNumber: 4,
    items: [
      { id: 'oi3', menuItemId: 'm5', name: 'Biryani Hyderabadi', quantity: 3, price: 480, notes: 'Extra spicy' },
      { id: 'oi4', menuItemId: 'm9', name: 'Mango Lassi', quantity: 3, price: 140 },
      { id: 'oi5', menuItemId: 'm7', name: 'Gulab Jamun', quantity: 2, price: 120 },
    ],
    status: 'pending', waiter: 'Priya M.', createdAt: '2024-01-15T20:05:00', updatedAt: '2024-01-15T20:05:00',
    subtotal: 2100, tax: 105, discount: 200, total: 2005, priority: 'urgent', ticketTime: 3,
  },
  {
    id: 'ORD-0293', tableId: 't7', tableNumber: 7,
    items: [
      { id: 'oi6', menuItemId: 'm8', name: 'Tandoori Platter', quantity: 2, price: 890 },
      { id: 'oi7', menuItemId: 'm6', name: 'Masala Chai', quantity: 4, price: 60 },
    ],
    status: 'ready', waiter: 'Rohit K.', createdAt: '2024-01-15T19:55:00', updatedAt: '2024-01-15T20:18:00',
    subtotal: 2020, tax: 101, discount: 0, total: 2121, priority: 'high', ticketTime: 18,
  },
  {
    id: 'ORD-0294', tableId: 't10', tableNumber: 10,
    items: [
      { id: 'oi8', menuItemId: 'm1', name: 'Paneer Tikka', quantity: 1, price: 320 },
      { id: 'oi9', menuItemId: 'm2', name: 'Dal Makhani', quantity: 1, price: 280 },
    ],
    status: 'accepted', waiter: 'Arjun S.', createdAt: '2024-01-15T20:02:00', updatedAt: '2024-01-15T20:06:00',
    subtotal: 600, tax: 30, discount: 0, total: 630, priority: 'normal', ticketTime: 6,
  },
  {
    id: 'ORD-0295', tableId: 'v1', tableNumber: 101,
    items: [
      { id: 'oi10', menuItemId: 'm8', name: 'Tandoori Platter', quantity: 3, price: 890 },
      { id: 'oi11', menuItemId: 'm5', name: 'Biryani Hyderabadi', quantity: 2, price: 480 },
      { id: 'oi12', menuItemId: 'm12', name: 'Rasmalai', quantity: 4, price: 150 },
    ],
    status: 'cooking', waiter: 'Neha R.', createdAt: '2024-01-15T18:20:00', updatedAt: '2024-01-15T18:35:00',
    subtotal: 4230, tax: 211.5, discount: 500, total: 3941.5, priority: 'high', ticketTime: 22,
  },
]

// ── Staff ─────────────────────────────────────────────────────────────

export const staff: StaffMember[] = [
  { id: 's1', name: 'Arjun Sharma', role: 'Senior Waiter', avatar: 'AS', status: 'active', tablesAssigned: [1, 10], ordersToday: 24, performanceScore: 96 },
  { id: 's2', name: 'Priya Mehta', role: 'Waiter', avatar: 'PM', status: 'active', tablesAssigned: [4, 5], ordersToday: 18, performanceScore: 88 },
  { id: 's3', name: 'Rohit Kumar', role: 'Waiter', avatar: 'RK', status: 'active', tablesAssigned: [7, 8], ordersToday: 21, performanceScore: 92 },
  { id: 's4', name: 'Neha Reddy', role: 'VIP Attendant', avatar: 'NR', status: 'active', tablesAssigned: [101, 102], ordersToday: 12, performanceScore: 98 },
  { id: 's5', name: 'Vikram Singh', role: 'Waiter', avatar: 'VS', status: 'break', tablesAssigned: [3, 6], ordersToday: 16, performanceScore: 84 },
  { id: 's6', name: 'Aisha Khan', role: 'Hostess', avatar: 'AK', status: 'active', tablesAssigned: [], ordersToday: 0, performanceScore: 94 },
]

// ── Reservations ──────────────────────────────────────────────────────

export const reservations: Reservation[] = [
  { id: 'R001', guestName: 'Rahul Gupta', guestPhone: '+91 98765 43210', guestEmail: 'rahul@email.com', tableId: 't3', tableNumber: 3, date: '2024-01-15', time: '21:00', guestCount: 4, status: 'confirmed', notes: 'Anniversary dinner, needs cake' },
  { id: 'R002', guestName: 'Sunita Patel', guestPhone: '+91 87654 32109', guestEmail: 'sunita@email.com', tableId: 't11', tableNumber: 11, date: '2024-01-15', time: '20:30', guestCount: 3, status: 'confirmed' },
  { id: 'R003', guestName: 'Amit Verma', guestPhone: '+91 76543 21098', guestEmail: 'amit@email.com', tableId: 'v2', tableNumber: 102, date: '2024-01-15', time: '21:30', guestCount: 8, status: 'confirmed', prepayment: 2000, notes: 'Corporate dinner, need projector setup' },
  { id: 'R004', guestName: 'Deepa Krishnan', guestPhone: '+91 65432 10987', guestEmail: 'deepa@email.com', tableId: 't3', tableNumber: 3, date: '2024-01-16', time: '19:00', guestCount: 2, status: 'pending' },
  { id: 'R005', guestName: 'Manoj Tiwari', guestPhone: '+91 54321 09876', guestEmail: 'manoj@email.com', tableId: 't11', tableNumber: 11, date: '2024-01-16', time: '20:00', guestCount: 6, status: 'confirmed' },
]

// ── Top Dishes ────────────────────────────────────────────────────────

export const topDishes = [
  { id: 'm5', name: 'Biryani Hyderabadi', orders: 48, revenue: 23040, trend: '+12%', isVeg: false },
  { id: 'm8', name: 'Tandoori Platter', orders: 36, revenue: 32040, trend: '+8%', isVeg: false },
  { id: 'm3', name: 'Butter Chicken', orders: 52, revenue: 21840, trend: '+5%', isVeg: false },
  { id: 'm1', name: 'Paneer Tikka', orders: 44, revenue: 14080, trend: '+18%', isVeg: true },
  { id: 'm2', name: 'Dal Makhani', orders: 38, revenue: 10640, trend: '+3%', isVeg: true },
]

// ── Summary Stats ─────────────────────────────────────────────────────

export const todayStats = {
  revenue: { value: 115400, change: '+18.4%', positive: true },
  orders: { value: 248, change: '+22 vs yesterday', positive: true },
  avgTicket: { value: 465, change: '-₹12 vs yesterday', positive: false },
  tableOccupancy: { value: 73, change: '+8% vs last week', positive: true },
  newCustomers: { value: 34, change: '+11 vs yesterday', positive: true },
  satisfaction: { value: 4.7, change: '+0.2 vs last month', positive: true },
}

export const inventoryAlerts = [
  { id: 'inv1', item: 'Saffron', current: 12, unit: 'grams', threshold: 50, status: 'critical' },
  { id: 'inv2', item: 'Cream', current: 2.5, unit: 'liters', threshold: 5, status: 'low' },
  { id: 'inv3', item: 'Tandoor Coal', current: 8, unit: 'kg', threshold: 15, status: 'low' },
  { id: 'inv4', item: 'Basmati Rice', current: 5, unit: 'kg', threshold: 10, status: 'low' },
]

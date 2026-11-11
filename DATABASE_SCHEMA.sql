-- ============================================================================
-- RESTAURANT MANAGEMENT PLATFORM - PRODUCTION DATABASE SCHEMA
-- PostgreSQL 14+
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS - Global Status Types
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM (
  'super_admin',
  'restaurant_owner',
  'branch_manager',
  'waiter',
  'chef',
  'cashier',
  'customer',
  'aggregator_integration'
);

CREATE TYPE order_status_enum AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled',
  'refunded'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded',
  'partially_refunded',
  'cancelled'
);

CREATE TYPE reservation_status_enum AS ENUM (
  'pending',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE payment_method_enum AS ENUM (
  'cash',
  'card',
  'upi',
  'wallet',
  'bank_transfer',
  'cheque',
  'online_payment'
);

CREATE TYPE aggregator_enum AS ENUM (
  'zomato',
  'swiggy',
  'uber_eats',
  'ondc'
);

CREATE TYPE kitchen_ticket_status_enum AS ENUM (
  'pending',
  'preparing',
  'ready',
  'served',
  'cancelled'
);

CREATE TYPE table_status_enum AS ENUM (
  'available',
  'occupied',
  'reserved',
  'maintenance'
);

CREATE TYPE bill_type_enum AS ENUM (
  'dine_in',
  'takeaway',
  'delivery',
  'aggregator'
);

-- ============================================================================
-- SCHEMA: SaaS & TENANT MANAGEMENT
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  country VARCHAR(100),
  industry VARCHAR(100),
  subscription_tier VARCHAR(50) DEFAULT 'starter',
  status VARCHAR(50) DEFAULT 'active',
  logo_url TEXT,
  website_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  cuisine_type VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  gst_number VARCHAR(20),
  fssai_number VARCHAR(20),
  establishment_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  max_tables INT DEFAULT 20,
  avg_table_capacity INT DEFAULT 4,
  operating_hours JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  UNIQUE(organization_id, slug)
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  manager_id UUID,
  status VARCHAR(50) DEFAULT 'active',
  max_tables INT DEFAULT 20,
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  UNIQUE(restaurant_id, name)
);

CREATE TABLE restaurant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_percentage DECIMAL(5, 2) DEFAULT 5.00,
  service_charge_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_allowed BOOLEAN DEFAULT TRUE,
  reservation_advance_payment_percentage DECIMAL(5, 2) DEFAULT 0,
  reservation_cancellation_hours INT DEFAULT 24,
  reservation_no_show_penalty DECIMAL(12, 2) DEFAULT 0,
  qr_order_auto_approve BOOLEAN DEFAULT FALSE,
  kitchen_print_enabled BOOLEAN DEFAULT TRUE,
  split_bill_allowed BOOLEAN DEFAULT TRUE,
  advance_payment_required BOOLEAN DEFAULT FALSE,
  currency VARCHAR(10) DEFAULT 'INR',
  timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
  ai_setup_completed BOOLEAN DEFAULT FALSE,
  ai_setup_data JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================================================
-- SCHEMA: AUTHENTICATION & ROLE-BASED ACCESS CONTROL
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role_enum NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  profile_picture_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  UNIQUE(email, deleted_at)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(organization_id, name, deleted_at)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(100),
  action VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  designation VARCHAR(100),
  employee_id VARCHAR(50),
  phone_number VARCHAR(20),
  hire_date DATE,
  salary DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'active',
  document_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(restaurant_id, employee_id)
);

CREATE TABLE staff_branch_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================================================
-- SCHEMA: CUSTOMER MANAGEMENT & LOYALTY
-- ============================================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  profile_picture_url TEXT,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  preferred_language VARCHAR(20),
  status VARCHAR(50) DEFAULT 'active',
  customer_source VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(organization_id, phone, deleted_at)
);

CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  address_type VARCHAR(50),
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE customer_loyalty_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  points_balance INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  last_earned_at TIMESTAMP,
  last_redeemed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(customer_id)
);

-- ============================================================================
-- SCHEMA: TABLE MANAGEMENT & QR CODE
-- ============================================================================

CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_number VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  section VARCHAR(100),
  status table_status_enum DEFAULT 'available',
  x_position DECIMAL(10, 2),
  y_position DECIMAL(10, 2),
  rotation_angle INT DEFAULT 0,
  shape VARCHAR(50),
  color VARCHAR(20),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, table_number, deleted_at)
);

CREATE TABLE table_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100),
  layout_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE table_qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  qr_code_url TEXT,
  session_token VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  table_id UUID REFERENCES restaurant_tables(id),
  guest_name VARCHAR(100),
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(255),
  number_of_guests INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INT DEFAULT 120,
  status reservation_status_enum DEFAULT 'pending',
  advance_payment_amount DECIMAL(12, 2) DEFAULT 0,
  advance_payment_status payment_status_enum,
  cancellation_reason TEXT,
  no_show_reason TEXT,
  notes TEXT,
  source VARCHAR(100),
  external_reference_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  created_by UUID,
  updated_by UUID
);

CREATE TABLE reservation_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method payment_method_enum,
  payment_status payment_status_enum DEFAULT 'pending',
  transaction_id VARCHAR(100),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reservation_no_show_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  no_show_count INT,
  total_penalty DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

-- ============================================================================
-- SCHEMA: MENU MANAGEMENT
-- ============================================================================

CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  icon_url TEXT,
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(restaurant_id, name, deleted_at)
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(12, 2) NOT NULL,
  cost_price DECIMAL(12, 2),
  display_order INT DEFAULT 0,
  image_url TEXT,
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  spice_level INT DEFAULT 0,
  preparation_time_minutes INT DEFAULT 15,
  allergens VARCHAR(255),
  nutritional_info JSONB,
  is_available BOOLEAN DEFAULT TRUE,
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE menu_item_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  size_unit VARCHAR(50),
  price_modifier DECIMAL(12, 2) DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  min_selections INT DEFAULT 0,
  max_selections INT DEFAULT 1,
  display_order INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(restaurant_id, name, deleted_at)
);

CREATE TABLE modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(12, 2) DEFAULT 0,
  display_order INT DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE menu_item_modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(menu_item_id, modifier_group_id)
);

-- ============================================================================
-- SCHEMA: ORDERS & ORDER ITEMS
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  table_id UUID REFERENCES restaurant_tables(id),
  qr_order_session_token VARCHAR(255),
  order_number VARCHAR(50) NOT NULL,
  order_type bill_type_enum DEFAULT 'dine_in',
  status order_status_enum DEFAULT 'pending',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_reason TEXT,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  service_charge DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_status payment_status_enum DEFAULT 'pending',
  delivery_address_id UUID REFERENCES customer_addresses(id),
  delivery_time TIMESTAMP,
  delivery_instructions TEXT,
  notes TEXT,
  aggregator_order_id UUID,
  source VARCHAR(100),
  created_by UUID REFERENCES users(id),
  confirmed_by UUID REFERENCES users(id),
  served_by UUID REFERENCES users(id),
  prepared_at TIMESTAMP,
  served_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, order_number, deleted_at)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES menu_item_variants(id),
  item_name VARCHAR(255) NOT NULL,
  base_price DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  item_total DECIMAL(12, 2) NOT NULL,
  special_instructions TEXT,
  preparation_time_minutes INT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES modifiers(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  modifier_name VARCHAR(100),
  price_modifier DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_status order_status_enum,
  new_status order_status_enum NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: KITCHEN & TICKETS
-- ============================================================================

CREATE TABLE kitchen_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  section_type VARCHAR(100),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, name, deleted_at)
);

CREATE TABLE kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kitchen_section_id UUID NOT NULL REFERENCES kitchen_sections(id),
  ticket_number VARCHAR(50) NOT NULL,
  status kitchen_ticket_status_enum DEFAULT 'pending',
  priority INT DEFAULT 0,
  table_number VARCHAR(50),
  customer_name VARCHAR(100),
  special_instructions TEXT,
  estimated_completion_time TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, ticket_number, deleted_at)
);

CREATE TABLE kitchen_ticket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kitchen_ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  quantity INT NOT NULL,
  special_instructions TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kitchen_status_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kitchen_ticket_id UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_status kitchen_ticket_status_enum,
  new_status kitchen_ticket_status_enum NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: POS & BILLING
-- ============================================================================

CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  bill_number VARCHAR(50) NOT NULL,
  bill_type bill_type_enum DEFAULT 'dine_in',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  discount_percentage DECIMAL(5, 2) DEFAULT 0,
  discount_reason TEXT,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  service_charge DECIMAL(12, 2) DEFAULT 0,
  rounding_adjustment DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) DEFAULT 0,
  payment_status payment_status_enum DEFAULT 'pending',
  bill_status VARCHAR(50) DEFAULT 'open',
  table_id UUID REFERENCES restaurant_tables(id),
  customer_phone VARCHAR(20),
  customer_name VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  settled_by UUID REFERENCES users(id),
  settled_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, bill_number, deleted_at)
);

CREATE TABLE bill_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  base_price DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  item_total DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_tax_breakdowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tax_name VARCHAR(100),
  tax_percentage DECIMAL(5, 2),
  tax_amount DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12, 2) NOT NULL,
  payment_method payment_method_enum NOT NULL,
  payment_status payment_status_enum DEFAULT 'completed',
  reference_number VARCHAR(100),
  transaction_id VARCHAR(100),
  payment_gateway_response JSONB,
  received_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id),
  bill_id UUID REFERENCES bills(id),
  order_id UUID REFERENCES orders(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  refund_amount DECIMAL(12, 2) NOT NULL,
  refund_reason TEXT NOT NULL,
  payment_method payment_method_enum,
  reference_number VARCHAR(100),
  transaction_id VARCHAR(100),
  payment_gateway_response JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  register_name VARCHAR(100),
  register_number VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  location VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, register_number, deleted_at)
);

CREATE TABLE cash_register_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  opening_balance DECIMAL(12, 2) NOT NULL,
  closing_balance DECIMAL(12, 2),
  expected_balance DECIMAL(12, 2),
  cash_difference DECIMAL(12, 2),
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'open'
);

-- ============================================================================
-- SCHEMA: INVENTORY MANAGEMENT
-- ============================================================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_code VARCHAR(50),
  category VARCHAR(100),
  unit_of_measure VARCHAR(50),
  quantity_in_stock DECIMAL(12, 2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12, 2),
  cost_per_unit DECIMAL(12, 2),
  supplier_id UUID REFERENCES suppliers(id),
  status VARCHAR(50) DEFAULT 'active',
  last_counted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, item_code, deleted_at)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  supplier_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  payment_terms VARCHAR(100),
  rating DECIMAL(3, 2),
  status VARCHAR(50) DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  po_number VARCHAR(50) NOT NULL,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(branch_id, po_number, deleted_at)
);

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name VARCHAR(255),
  quantity_ordered DECIMAL(12, 2),
  quantity_received DECIMAL(12, 2) DEFAULT 0,
  unit_cost DECIMAL(12, 2),
  line_total DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  movement_type VARCHAR(50),
  quantity DECIMAL(12, 2) NOT NULL,
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  adjustment_type VARCHAR(50),
  quantity_adjusted DECIMAL(12, 2),
  reason TEXT,
  reference_document VARCHAR(100),
  adjusted_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_stock DECIMAL(12, 2),
  reorder_level DECIMAL(12, 2),
  alert_status VARCHAR(50) DEFAULT 'active',
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: AGGREGATOR INTEGRATIONS
-- ============================================================================

CREATE TABLE aggregator_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aggregator_type aggregator_enum NOT NULL,
  restaurant_id_on_aggregator VARCHAR(100),
  api_key VARCHAR(255),
  api_secret VARCHAR(255) ENCRYPTED,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  commission_percentage DECIMAL(5, 2),
  status VARCHAR(50) DEFAULT 'active',
  last_sync_at TIMESTAMP,
  sync_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(restaurant_id, aggregator_type, deleted_at)
);

CREATE TABLE aggregator_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  aggregator_type aggregator_enum NOT NULL,
  external_order_id VARCHAR(100) NOT NULL,
  external_reference_id VARCHAR(100),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  delivery_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  order_total DECIMAL(12, 2),
  commission_amount DECIMAL(12, 2),
  payout_amount DECIMAL(12, 2),
  order_status VARCHAR(50),
  delivery_partner_name VARCHAR(100),
  delivery_partner_phone VARCHAR(20),
  delivery_eta TIMESTAMP,
  raw_payload JSONB,
  sync_status VARCHAR(50) DEFAULT 'pending',
  sync_error TEXT,
  last_sync_at TIMESTAMP,
  external_created_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(restaurant_id, aggregator_type, external_order_id, deleted_at)
);

CREATE TABLE aggregator_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregator_order_id UUID NOT NULL REFERENCES aggregator_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  external_item_id VARCHAR(100),
  item_name VARCHAR(255),
  quantity INT,
  item_price DECIMAL(12, 2),
  line_total DECIMAL(12, 2),
  special_instructions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aggregator_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aggregator_type aggregator_enum NOT NULL,
  payout_period_start DATE,
  payout_period_end DATE,
  total_orders INT,
  gross_amount DECIMAL(12, 2),
  total_commission DECIMAL(12, 2),
  total_payout DECIMAL(12, 2),
  payout_status VARCHAR(50) DEFAULT 'pending',
  payout_reference_id VARCHAR(100),
  payment_method VARCHAR(50),
  bank_account_last_4 VARCHAR(4),
  payout_date DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aggregator_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregator_order_id UUID NOT NULL REFERENCES aggregator_orders(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_total DECIMAL(12, 2),
  commission_percentage DECIMAL(5, 2),
  commission_amount DECIMAL(12, 2),
  tax_on_commission DECIMAL(12, 2) DEFAULT 0,
  net_payout DECIMAL(12, 2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aggregator_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aggregator_type aggregator_enum NOT NULL,
  sync_type VARCHAR(50),
  status VARCHAR(50),
  records_processed INT,
  records_failed INT,
  error_message TEXT,
  raw_request JSONB,
  raw_response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: NOTIFICATIONS, AUDIT & ANALYTICS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  notification_type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_sales_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  cash_sales DECIMAL(12, 2) DEFAULT 0,
  card_sales DECIMAL(12, 2) DEFAULT 0,
  upi_sales DECIMAL(12, 2) DEFAULT 0,
  other_sales DECIMAL(12, 2) DEFAULT 0,
  total_discount DECIMAL(12, 2) DEFAULT 0,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  average_bill_value DECIMAL(12, 2) DEFAULT 0,
  total_customers INT DEFAULT 0,
  walk_in_customers INT DEFAULT 0,
  aggregator_orders INT DEFAULT 0,
  aggregator_revenue DECIMAL(12, 2) DEFAULT 0,
  peak_hour VARCHAR(10),
  most_sold_item_id UUID REFERENCES menu_items(id),
  least_sold_item_id UUID REFERENCES menu_items(id),
  refunds_count INT DEFAULT 0,
  total_refunds DECIMAL(12, 2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, report_date)
);

CREATE TABLE branch_performance_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_period_start DATE,
  report_period_end DATE,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  average_daily_revenue DECIMAL(12, 2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  average_daily_orders INT DEFAULT 0,
  average_bill_value DECIMAL(12, 2) DEFAULT 0,
  repeat_customer_percentage DECIMAL(5, 2) DEFAULT 0,
  customer_satisfaction_score DECIMAL(3, 2),
  staff_productivity_score DECIMAL(3, 2),
  table_occupancy_percentage DECIMAL(5, 2) DEFAULT 0,
  peak_service_hours TEXT,
  top_products JSONB,
  bottom_products JSONB,
  inventory_turnover_ratio DECIMAL(10, 2),
  food_cost_percentage DECIMAL(5, 2),
  labour_cost_percentage DECIMAL(5, 2),
  waste_percentage DECIMAL(5, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: AI RESTAURANT SETUP
-- ============================================================================

CREATE TABLE ai_setup_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  session_status VARCHAR(50) DEFAULT 'in_progress',
  current_step INT DEFAULT 1,
  total_steps INT DEFAULT 10,
  progress_percentage INT DEFAULT 0,
  session_data JSONB DEFAULT '{}',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_setup_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ai_setup_session_id UUID NOT NULL REFERENCES ai_setup_sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question_id INT,
  question_text TEXT,
  answer_text TEXT,
  answer_type VARCHAR(50),
  answer_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_generated_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ai_setup_session_id UUID REFERENCES ai_setup_sessions(id),
  menu_name VARCHAR(255),
  cuisine_type VARCHAR(100),
  total_categories INT,
  total_items INT,
  estimated_preparation_time INT,
  menu_data JSONB,
  is_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_setup_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ai_setup_session_id UUID REFERENCES ai_setup_sessions(id),
  recommendation_type VARCHAR(100),
  recommendation_text TEXT,
  recommendation_data JSONB,
  priority INT DEFAULT 0,
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES - Performance Optimization
-- ============================================================================

-- Organizations & Restaurants
CREATE INDEX idx_restaurants_organization_id ON restaurants(organization_id);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_branches_restaurant_id ON branches(restaurant_id);
CREATE INDEX idx_branches_organization_id ON branches(organization_id);
CREATE INDEX idx_branches_status ON branches(status);

-- Users & Auth
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_staff_profiles_restaurant_id ON staff_profiles(restaurant_id);
CREATE INDEX idx_staff_profiles_user_id ON staff_profiles(user_id);
CREATE INDEX idx_staff_branch_assignments_staff_id ON staff_branch_assignments(staff_id);
CREATE INDEX idx_staff_branch_assignments_branch_id ON staff_branch_assignments(branch_id);

-- Customers
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Tables & Reservations
CREATE INDEX idx_restaurant_tables_branch_id ON restaurant_tables(branch_id);
CREATE INDEX idx_restaurant_tables_status ON restaurant_tables(status);
CREATE INDEX idx_table_qr_tokens_table_id ON table_qr_tokens(table_id);
CREATE INDEX idx_table_qr_tokens_token ON table_qr_tokens(token);
CREATE INDEX idx_reservations_branch_id ON reservations(branch_id);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_reservation_date ON reservations(reservation_date);

-- Menu
CREATE INDEX idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX idx_menu_items_status ON menu_items(status);
CREATE INDEX idx_menu_item_variants_menu_item_id ON menu_item_variants(menu_item_id);
CREATE INDEX idx_modifier_groups_restaurant_id ON modifier_groups(restaurant_id);
CREATE INDEX idx_modifiers_modifier_group_id ON modifiers(modifier_group_id);
CREATE INDEX idx_menu_item_modifier_groups_menu_item_id ON menu_item_modifier_groups(menu_item_id);

-- Orders
CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_order_number ON orders(order_number, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_aggregator_order_id ON orders(aggregator_order_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);

-- Kitchen
CREATE INDEX idx_kitchen_sections_branch_id ON kitchen_sections(branch_id);
CREATE INDEX idx_kitchen_tickets_order_id ON kitchen_tickets(order_id);
CREATE INDEX idx_kitchen_tickets_branch_id ON kitchen_tickets(branch_id);
CREATE INDEX idx_kitchen_tickets_status ON kitchen_tickets(status);
CREATE INDEX idx_kitchen_tickets_ticket_number ON kitchen_tickets(ticket_number, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kitchen_ticket_items_kitchen_ticket_id ON kitchen_ticket_items(kitchen_ticket_id);

-- POS & Billing
CREATE INDEX idx_bills_branch_id ON bills(branch_id);
CREATE INDEX idx_bills_bill_number ON bills(bill_number, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_created_at ON bills(created_at);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_refunds_bill_id ON refunds(bill_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_cash_registers_branch_id ON cash_registers(branch_id);
CREATE INDEX idx_cash_register_sessions_cash_register_id ON cash_register_sessions(cash_register_id);

-- Inventory
CREATE INDEX idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX idx_inventory_items_item_code ON inventory_items(item_code, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_orders_branch_id ON purchase_orders(branch_id);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number, branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stock_movements_inventory_item_id ON stock_movements(inventory_item_id);
CREATE INDEX idx_stock_adjustments_inventory_item_id ON stock_adjustments(inventory_item_id);

-- Aggregators
CREATE INDEX idx_aggregator_orders_restaurant_id ON aggregator_orders(restaurant_id);
CREATE INDEX idx_aggregator_orders_external_order_id ON aggregator_orders(external_order_id, aggregator_type);
CREATE INDEX idx_aggregator_orders_order_id ON aggregator_orders(order_id);
CREATE INDEX idx_aggregator_integrations_restaurant_id ON aggregator_integrations(restaurant_id);

-- Audit & Analytics
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_daily_sales_reports_branch_id ON daily_sales_reports(branch_id);
CREATE INDEX idx_daily_sales_reports_report_date ON daily_sales_reports(report_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- AI Setup
CREATE INDEX idx_ai_setup_sessions_restaurant_id ON ai_setup_sessions(restaurant_id);
CREATE INDEX idx_ai_generated_menus_restaurant_id ON ai_generated_menus(restaurant_id);

-- ============================================================================
-- VIEWS - Common Query Patterns
-- ============================================================================

CREATE VIEW vw_active_reservations_today AS
SELECT 
  r.id,
  r.reservation_number,
  r.guest_name,
  r.guest_phone,
  r.number_of_guests,
  r.reservation_time,
  r.status,
  rt.table_number,
  b.name as branch_name,
  rest.name as restaurant_name
FROM reservations r
JOIN restaurant_tables rt ON r.table_id = rt.id
JOIN branches b ON r.branch_id = b.id
JOIN restaurants rest ON r.restaurant_id = rest.id
WHERE r.reservation_date = CURRENT_DATE
  AND r.status IN ('pending', 'confirmed')
  AND r.deleted_at IS NULL;

CREATE VIEW vw_daily_revenue_summary AS
SELECT 
  DATE(o.created_at) as sale_date,
  o.branch_id,
  b.name as branch_name,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.customer_id) as unique_customers,
  SUM(o.total_amount) as total_revenue,
  SUM(o.discount_amount) as total_discount,
  SUM(o.tax_amount) as total_tax,
  AVG(o.total_amount) as avg_bill_value
FROM orders o
JOIN branches b ON o.branch_id = b.id
WHERE o.deleted_at IS NULL 
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(o.created_at), o.branch_id, b.name;

CREATE VIEW vw_top_selling_items AS
SELECT 
  m.id,
  m.name,
  mc.name as category,
  COUNT(oi.id) as times_sold,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.item_total) as total_revenue,
  o.branch_id
FROM order_items oi
JOIN menu_items m ON oi.menu_item_id = m.id
JOIN menu_categories mc ON m.category_id = mc.id
JOIN orders o ON oi.order_id = o.id
WHERE o.deleted_at IS NULL 
  AND oi.deleted_at IS NULL
  AND DATE(o.created_at) = CURRENT_DATE
GROUP BY m.id, m.name, mc.name, o.branch_id
ORDER BY total_revenue DESC;

CREATE VIEW vw_pending_kitchen_tickets AS
SELECT 
  kt.id,
  kt.ticket_number,
  kt.table_number,
  kt.customer_name,
  kt.status,
  ks.name as kitchen_section,
  COUNT(kti.id) as item_count,
  MAX(kt.created_at) as ticket_created_at,
  kt.special_instructions
FROM kitchen_tickets kt
LEFT JOIN kitchen_ticket_items kti ON kt.id = kti.kitchen_ticket_id
LEFT JOIN kitchen_sections ks ON kt.kitchen_section_id = ks.id
WHERE kt.status IN ('pending', 'preparing')
  AND kt.deleted_at IS NULL
GROUP BY kt.id, kt.ticket_number, kt.table_number, kt.customer_name, kt.status, ks.name
ORDER BY kt.created_at ASC;

CREATE VIEW vw_staff_performance AS
SELECT 
  sp.id,
  u.first_name,
  u.last_name,
  sp.designation,
  COUNT(DISTINCT CASE WHEN o.created_by = u.id THEN o.id END) as orders_taken,
  COUNT(DISTINCT CASE WHEN o.confirmed_by = u.id THEN o.id END) as orders_confirmed,
  SUM(CASE WHEN o.created_by = u.id THEN o.total_amount ELSE 0 END) as revenue_generated,
  sp.branch_id
FROM staff_profiles sp
JOIN users u ON sp.user_id = u.id
LEFT JOIN orders o ON (o.created_by = u.id OR o.confirmed_by = u.id) AND DATE(o.created_at) = CURRENT_DATE
WHERE sp.deleted_at IS NULL
GROUP BY sp.id, u.first_name, u.last_name, sp.designation, sp.branch_id;

-- ============================================================================
-- CONSTRAINTS & TRIGGERS
-- ============================================================================

-- Check constraint for prices
ALTER TABLE menu_items 
ADD CONSTRAINT chk_menu_items_price CHECK (base_price > 0);

ALTER TABLE menu_items 
ADD CONSTRAINT chk_menu_items_cost_price CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE bills 
ADD CONSTRAINT chk_bills_amounts CHECK (total_amount >= 0);

ALTER TABLE inventory_items 
ADD CONSTRAINT chk_inventory_quantity CHECK (quantity_in_stock >= 0);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to major tables
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_restaurants_updated_at BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE organizations IS 'SaaS organizations - main tenant separator';
COMMENT ON TABLE restaurants IS 'Restaurant entities within organizations';
COMMENT ON TABLE branches IS 'Branch locations for restaurants';
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE orders IS 'All orders - dine-in, takeaway, delivery, and aggregator';
COMMENT ON TABLE kitchen_tickets IS 'Kitchen display system tickets';
COMMENT ON TABLE bills IS 'POS billing records';
COMMENT ON TABLE aggregator_orders IS 'Third-party aggregator order sync';
COMMENT ON TABLE inventory_items IS 'Stock management';

-- ============================================================================
-- PERMISSIONS - Row-Level Security Setup (PostgreSQL)
-- ============================================================================

-- Note: Implement RLS policies based on organization_id and user roles
-- This is application-level responsibility in most cases, but can be enforced here

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DATABASE INITIALIZATION COMPLETE
-- ============================================================================

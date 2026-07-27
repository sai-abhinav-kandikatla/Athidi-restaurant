-- ════════════════════════════════════════════════════════════════
-- ATHIDI RESTAURANT & ROS — COMPLETE DATABASE SCHEMA & SEED DATA
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    phone TEXT,
    whatsapp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Branches
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT,
    opens_at TEXT DEFAULT '11:00 AM',
    closes_at TEXT DEFAULT '11:00 PM',
    gstin TEXT DEFAULT '37AAAAA0000A1Z5',
    tax_rate NUMERIC(5, 2) DEFAULT 5.00,
    qr_ordering_enabled BOOLEAN DEFAULT TRUE,
    parcel_charge_enabled BOOLEAN DEFAULT TRUE,
    realtime_alerts_enabled BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table Sections
CREATE TABLE IF NOT EXISTS public.table_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT DEFAULT 0
);

-- 4. Tables
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.table_sections(id) ON DELETE SET NULL,
    number INT NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    qr_token TEXT NOT NULL UNIQUE,
    state TEXT DEFAULT 'AVAILABLE' CHECK (state IN ('AVAILABLE', 'OCCUPIED', 'ORDERING', 'PREPARING', 'READY', 'DINING', 'BILL_REQUESTED'))
);

-- 5. Table Sessions
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    state TEXT DEFAULT 'OPEN',
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE
);

-- 7. Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    is_veg BOOLEAN DEFAULT FALSE,
    available BOOLEAN DEFAULT TRUE,
    bestseller BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    sort_order INT DEFAULT 0
);

-- 8. Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    order_number INT GENERATED ALWAYS AS IDENTITY,
    status TEXT DEFAULT 'PLACED' CHECK (status IN ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED')),
    subtotal NUMERIC(10, 2) DEFAULT 0,
    parcel_charge NUMERIC(10, 2) DEFAULT 0,
    tax NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    spice_level TEXT DEFAULT 'Medium',
    is_parcel BOOLEAN DEFAULT FALSE,
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    served_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ
);

-- 9. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    is_parcel BOOLEAN DEFAULT FALSE,
    line_total NUMERIC(10, 2) NOT NULL
);

-- 10. Notifications / Service Requests
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('WAITER', 'WATER', 'TISSUE', 'BILL')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 11. Staff
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_name TEXT DEFAULT 'OWNER',
    active BOOLEAN DEFAULT TRUE
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    method TEXT DEFAULT 'CASH',
    status TEXT DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- STORED PROCEDURES (RPCs)
-- ════════════════════════════════════════════════════════════════

-- RPC: Open Table Session by Table Number
CREATE OR REPLACE FUNCTION public.open_table_session_by_number(p_table_number INT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_table_id UUID;
    v_branch_id UUID;
    v_branch_name TEXT;
    v_tax_rate NUMERIC;
    v_parcel_charge BOOLEAN;
    v_session_id UUID;
BEGIN
    SELECT t.id, t.branch_id, b.name, b.tax_rate, b.parcel_charge_enabled
    INTO v_table_id, v_branch_id, v_branch_name, v_tax_rate, v_parcel_charge
    FROM public.tables t
    JOIN public.branches b ON t.branch_id = b.id
    WHERE t.number = p_table_number;

    IF v_table_id IS NULL THEN
        RAISE EXCEPTION 'Table number % not found', p_table_number;
    END IF;

    -- Look for existing open session
    SELECT id INTO v_session_id
    FROM public.table_sessions
    WHERE table_id = v_table_id AND state = 'OPEN'
    ORDER BY opened_at DESC
    LIMIT 1;

    -- Create session if none exists
    IF v_session_id IS NULL THEN
        INSERT INTO public.table_sessions (table_id, state)
        VALUES (v_table_id, 'OPEN')
        RETURNING id INTO v_session_id;

        UPDATE public.tables SET state = 'OCCUPIED' WHERE id = v_table_id;
    ELSE
        UPDATE public.table_sessions SET last_active_at = NOW() WHERE id = v_session_id;
    END IF;

    RETURN jsonb_build_object(
        'session_id', v_session_id,
        'table_id', v_table_id,
        'table_number', p_table_number,
        'branch_id', v_branch_id,
        'branch_name', v_branch_name,
        'tax_rate', v_tax_rate,
        'parcel_charge_enabled', v_parcel_charge
    );
END;
$$;

-- RPC: Advance Order Status
CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id UUID, p_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.orders
    SET status = p_status,
        served_at = CASE WHEN p_status = 'SERVED' THEN NOW() ELSE served_at END,
        paid_at = CASE WHEN p_status = 'PAID' THEN NOW() ELSE paid_at END
    WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;

-- Enable RLS and Permissive Policies for Web App
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Allow public read access to branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Allow public read access to table_sections" ON public.table_sections FOR SELECT USING (true);
CREATE POLICY "Allow public read access to tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Allow public read/write to table_sessions" ON public.table_sessions FOR ALL USING (true);
CREATE POLICY "Allow public read access to menu_categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access to menu_items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Allow public read/write to orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow public read/write to order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Allow public read/write to notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY "Allow public read access to staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Allow public read/write to payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow public read/write to audit_logs" ON public.audit_logs FOR ALL USING (true);

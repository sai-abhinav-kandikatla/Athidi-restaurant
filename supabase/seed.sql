-- ════════════════════════════════════════════════════════════════
-- ATHIDHI RESTAURANT — SEED DATA SCRIPT
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_rest_id UUID;
    v_branch_id UUID;
    v_sec_main UUID;
    v_cat_biryani UUID;
    v_cat_starters UUID;
    v_cat_breads UUID;
    v_cat_drinks UUID;
BEGIN
    -- Insert Restaurant
    INSERT INTO public.restaurants (name, slug, phone, whatsapp)
    VALUES ('Athidhi Family Restaurant', 'athidhi-family-restaurant', '+919876543210', '+919876543210')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_rest_id;

    -- Insert Branch
    INSERT INTO public.branches (restaurant_id, name, code, address, opens_at, closes_at, gstin, tax_rate)
    VALUES (v_rest_id, 'Athidhi Restaurant - Guntur', 'ATH-GNT-01', 'Ring Road, Near NTR Circle, Guntur, AP', '11:00 AM', '11:00 PM', '37AAAAA0000A1Z5', 5.00)
    RETURNING id INTO v_branch_id;

    -- Insert Section
    INSERT INTO public.table_sections (branch_id, name, sort_order)
    VALUES (v_branch_id, 'Main Dining Hall', 1)
    RETURNING id INTO v_sec_main;

    -- Insert 12 Tables
    FOR i IN 1..12 LOOP
        INSERT INTO public.tables (branch_id, section_id, number, capacity, qr_token, state)
        VALUES (v_branch_id, v_sec_main, i, 4, 'table-' || i, 'AVAILABLE')
        ON CONFLICT (number) DO NOTHING;
    END LOOP;

    -- Insert Categories
    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order)
    VALUES (v_rest_id, 'Biryani Specialties', 'biryani', 1) RETURNING id INTO v_cat_biryani;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order)
    VALUES (v_rest_id, 'Starters & Appetizers', 'starters', 2) RETURNING id INTO v_cat_starters;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order)
    VALUES (v_rest_id, 'Indian Breads & Naan', 'breads', 3) RETURNING id INTO v_cat_breads;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order)
    VALUES (v_rest_id, 'Beverages & Drinks', 'drinks', 4) RETURNING id INTO v_cat_drinks;

    -- Insert Menu Items
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_biryani, 'Chicken Dum Biryani', 'Hyderabadi style slow cooked aromatic basmati rice layered with juicy marinated chicken pieces.', 320.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 1),
    (v_rest_id, v_cat_biryani, 'Special Mutton Biryani', 'Tender mutton cooked in traditional spices layered with fragrant long grain basmati rice.', 420.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 2),
    (v_rest_id, v_cat_biryani, 'Paneer Tikka Biryani', 'Char-grilled cottage cheese cubes tossed in spicy masala layered with biryani rice.', 280.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 3),
    (v_rest_id, v_cat_starters, 'Chicken 65', 'Crispy fried spicy chicken bites tossed in curry leaves, garlic and green chillies.', 290.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 4),
    (v_rest_id, v_cat_starters, 'Gobi Manchurian', 'Crispy cauliflower florets coated in dark soy chili Manchurian glaze.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800', 5),
    (v_rest_id, v_cat_breads, 'Butter Naan', 'Soft leavened tandoor baked flatbread brushed with fresh creamy butter.', 55.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 6),
    (v_rest_id, v_cat_breads, 'Garlic Naan', 'Tandoor baked naan topped with crushed garlic and fresh cilantro leaves.', 65.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 7),
    (v_rest_id, v_cat_drinks, 'Thums Up (750ml)', 'Refreshing chilled cola beverage.', 60.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800', 8),
    (v_rest_id, v_cat_drinks, 'Sweet Lassi', 'Rich and creamy traditional yogurt drink flavored with cardamom and saffron.', 90.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1571006682865-0a1f0a20e28f?w=800', 9);

    -- Insert Staff Account
    INSERT INTO public.staff (restaurant_id, branch_id, full_name, email, role_name, active)
    VALUES (v_rest_id, v_branch_id, 'Sai Abhinav Kandikatla', 'saiabhinavkandikatla@gmail.com', 'OWNER', TRUE)
    ON CONFLICT (email) DO NOTHING;

END $$;

-- ════════════════════════════════════════════════════════════════
-- ATHIDI RESTAURANT — COMPLETE SEED DATA SCRIPT (PARTS 1, 2 & 3)
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_rest_id UUID;
    v_branch_id UUID;
    v_sec_main UUID;
    v_cat_biryani UUID;
    v_cat_nonveg_curry UUID;
    v_cat_veg_curry UUID;
    v_cat_fried_rice UUID;
    v_cat_starters UUID;
    v_cat_naan UUID;
    v_cat_others UUID;
BEGIN
    -- Insert Restaurant
    INSERT INTO public.restaurants (name, slug, phone, whatsapp)
    VALUES ('Athidi Family Restaurant', 'athidi-family-restaurant', '+919876543210', '+919876543210')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_rest_id;

    -- Insert Branch
    INSERT INTO public.branches (restaurant_id, name, code, address, opens_at, closes_at, gstin, tax_rate)
    VALUES (v_rest_id, 'Athidi Main Branch', 'ATH-GNT-01', 'Ring Road, Near NTR Circle, Guntur, AP', '11:00 AM', '11:00 PM', '37AAAAA0000A1Z5', 5.00)
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

    -- Insert Central Categories in Exact Menu Order
    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'BIRYANI', 'biryani', 1, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'BIRYANI', sort_order = 1, active = TRUE
    RETURNING id INTO v_cat_biryani;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'NON-VEG CURRY', 'non-veg-curry', 2, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'NON-VEG CURRY', sort_order = 2, active = TRUE
    RETURNING id INTO v_cat_nonveg_curry;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'VEG CURRY', 'veg-curry', 3, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'VEG CURRY', sort_order = 3, active = TRUE
    RETURNING id INTO v_cat_veg_curry;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'FRIED RICE', 'fried-rice', 4, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'FRIED RICE', sort_order = 4, active = TRUE
    RETURNING id INTO v_cat_fried_rice;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'STARTERS', 'starters', 5, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'STARTERS', sort_order = 5, active = TRUE
    RETURNING id INTO v_cat_starters;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'NAANS & ROTI', 'naans-and-roti', 6, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'NAANS & ROTI', sort_order = 6, active = TRUE
    RETURNING id INTO v_cat_naan;

    INSERT INTO public.menu_categories (restaurant_id, name, slug, sort_order, active)
    VALUES (v_rest_id, 'OTHERS', 'others', 7, TRUE)
    ON CONFLICT (restaurant_id, slug) DO UPDATE SET name = 'OTHERS', sort_order = 7, active = TRUE
    RETURNING id INTO v_cat_others;

    -- Delete items in all categories
    DELETE FROM public.menu_items WHERE category_id IN (v_cat_biryani, v_cat_nonveg_curry, v_cat_veg_curry, v_cat_fried_rice, v_cat_starters, v_cat_naan, v_cat_others);

    -- Insert BIRYANI Items (34)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_biryani, 'Chicken Biryani Single (1 pc)', 'Hyderabadi chicken dum biryani with 1 tender chicken piece & basmati rice.', 150.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 1),
    (v_rest_id, v_cat_biryani, 'Chicken Biryani Full (2 pc)', 'Authentic chicken dum biryani with 2 juicy chicken pieces & basmati rice.', 270.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 2),
    (v_rest_id, v_cat_biryani, 'Chicken Couple Biryani (2 pc)', 'Generous portion of chicken biryani with 2 chicken pieces, ideal for two.', 330.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 3),
    (v_rest_id, v_cat_biryani, 'Chicken Family Pack (4 pc)', 'Large family pack biryani with 4 marinated chicken pieces.', 600.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 4),
    (v_rest_id, v_cat_biryani, 'Chicken Jumbo (6 pc)', 'Huge jumbo biryani bucket with 6 large chicken pieces.', 850.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 5),
    (v_rest_id, v_cat_biryani, 'Chicken Boneless Biryani', 'Flavorful basmati biryani topped with succulent boneless chicken fry pieces.', 340.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 6),
    (v_rest_id, v_cat_biryani, 'Chicken Biryani Single (3 pc)', 'Single portion chicken biryani served with 3 fried chicken pieces.', 150.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 7),
    (v_rest_id, v_cat_biryani, 'Chicken Biryani Full (6 pc)', 'Full portion chicken biryani served with 6 fried chicken pieces.', 270.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 8),
    (v_rest_id, v_cat_biryani, 'Chicken Couple (8 pc)', 'Couple portion chicken biryani served with 8 fried chicken pieces.', 350.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 9),
    (v_rest_id, v_cat_biryani, 'Chicken Family (12 pc)', 'Family size fried piece biryani served with 12 fried chicken pieces.', 600.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 10),
    (v_rest_id, v_cat_biryani, 'Chicken Jumbo (18 pc)', 'Jumbo party size biryani served with 18 spiced fried chicken pieces.', 850.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 11),
    (v_rest_id, v_cat_biryani, 'Mutton Full', 'Tender slow-cooked mutton pieces layered in aromatic long-grain basmati biryani rice.', 350.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 12),
    (v_rest_id, v_cat_biryani, 'Mutton Boneless', 'Melt-in-the-mouth boneless mutton morsels cooked in rich biryani spices.', 400.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 13),
    (v_rest_id, v_cat_biryani, 'Mutton Family', 'Generous family-sized mutton dum biryani packed with juicy mutton pieces.', 850.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=800', 14),
    (v_rest_id, v_cat_biryani, 'Egg Biryani Single (1 Egg)', 'Fragrant biryani rice cooked with 1 hard-boiled spiced egg.', 120.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800', 15),
    (v_rest_id, v_cat_biryani, 'Egg Biryani Full (2 Eggs)', 'Delicious basmati biryani served with 2 seasoned hard-boiled eggs.', 200.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800', 16),
    (v_rest_id, v_cat_biryani, 'Spl. Egg Biryani', 'Special egg biryani topped with roasted egg masala gravy.', 250.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1599043513900-ed6fe01d3833?w=800', 17),
    (v_rest_id, v_cat_biryani, 'Veg Biryani', 'Aromatic basmati rice cooked with fresh garden vegetables & whole spices.', 140.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 18),
    (v_rest_id, v_cat_biryani, 'Paneer Biryani', 'Soft paneer cubes marinated in biryani spices layered with fragrant rice.', 150.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 19),
    (v_rest_id, v_cat_biryani, 'Kaju Biryani', 'Rich vegetable biryani generously topped with golden roasted cashew nuts.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 20),
    (v_rest_id, v_cat_biryani, 'Mushroom Biryani', 'Earthy button mushrooms sautéed in special masala and layered with biryani rice.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 21),
    (v_rest_id, v_cat_biryani, 'Kaju Paneer Biryani', 'Delicious combination of grilled paneer cubes and crunchy cashews in biryani rice.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 22),
    (v_rest_id, v_cat_biryani, 'Mushroom Paneer Biryani', 'Flavorful biryani layered with fresh mushrooms and soft paneer cubes.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 23),
    (v_rest_id, v_cat_biryani, 'Veg Biryani Full', 'Full plate aromatic vegetable dum biryani served with raita and salan.', 210.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 24),
    (v_rest_id, v_cat_biryani, 'Paneer Biryani Full', 'Full portion of rich paneer biryani packed with fresh paneer.', 250.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 25),
    (v_rest_id, v_cat_biryani, 'Kaju Biryani Full', 'Full size premium biryani loaded with roasted cashews.', 270.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 26),
    (v_rest_id, v_cat_biryani, 'Mushroom Biryani Full', 'Full size delicious mushroom basmati biryani.', 270.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 27),
    (v_rest_id, v_cat_biryani, 'Kaju Paneer Biryani Full', 'Full portion cashew & cottage cheese special biryani.', 270.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 28),
    (v_rest_id, v_cat_biryani, 'Mushroom Paneer Biryani Full', 'Full portion biryani loaded with mushrooms and paneer.', 270.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 29),
    (v_rest_id, v_cat_biryani, 'Spl. Veg 65 Biryani', 'Signature biryani topped with crisp Veg 65 bites.', 290.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 30),
    (v_rest_id, v_cat_biryani, 'Spl. Paneer 65 Biryani', 'Signature biryani layered with spicy Paneer 65 morsels.', 350.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 31),
    (v_rest_id, v_cat_biryani, 'Veg Family', 'Family pack vegetable dum biryani with extra raita and mirchi ka salan.', 520.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 32),
    (v_rest_id, v_cat_biryani, 'Paneer Family', 'Large family pack biryani loaded with spiced paneer cubes.', 640.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800', 33),
    (v_rest_id, v_cat_biryani, 'Kaju / Mushroom Family', 'Grand family pack biryani topped with cashews and mushrooms.', 660.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 34);

    -- Insert NON-VEG CURRY Items (22)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_nonveg_curry, 'Chicken Curry', 'Home-style tender chicken cooked in traditional onion-tomato gravy.', 180.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 1),
    (v_rest_id, v_cat_nonveg_curry, 'Telangana Chicken', 'Spicy Telangana style chicken curry cooked with roasted local spices.', 210.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 2),
    (v_rest_id, v_cat_nonveg_curry, 'Punjabi Chicken', 'Rich and hearty Punjabi style chicken curry with whole spices.', 210.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 3),
    (v_rest_id, v_cat_nonveg_curry, 'Kaju Chicken', 'Succulent chicken morsels cooked in a creamy roasted cashew gravy.', 250.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 4),
    (v_rest_id, v_cat_nonveg_curry, 'Chicken Masala (2 Eggs)', 'Spicy chicken masala served with 2 hard-boiled eggs in rich gravy.', 260.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 5),
    (v_rest_id, v_cat_nonveg_curry, 'Chicken Kolhapuri', 'Fiery spicy chicken curry prepared with authentic Kolhapuri masala.', 230.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 6),
    (v_rest_id, v_cat_nonveg_curry, 'Hyderabad Chicken', 'Hyderabadi style chicken curry cooked with mint, yogurt, and aromatic spices.', 250.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 7),
    (v_rest_id, v_cat_nonveg_curry, 'Boneless Chicken Curry', 'Tender boneless chicken pieces cooked in a flavorful thick gravy.', 270.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 8),
    (v_rest_id, v_cat_nonveg_curry, 'Kadai Chicken (BL)', 'Boneless chicken tossed with bell peppers and freshly ground kadai spices.', 270.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 9),
    (v_rest_id, v_cat_nonveg_curry, 'Butter Chicken (BL)', 'Tandoori grilled boneless chicken in a velvety, buttery tomato cream gravy.', 280.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800', 10),
    (v_rest_id, v_cat_nonveg_curry, 'Moghlai Chicken (BL)', 'Rich Moghlai style boneless chicken curry enriched with dry fruits and cream.', 290.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 11),
    (v_rest_id, v_cat_nonveg_curry, 'Rajdhani Chicken (BL)', 'Chef''s special boneless chicken curry prepared with royal aromatic spices.', 300.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 12),
    (v_rest_id, v_cat_nonveg_curry, 'Afghani Chicken (BL)', 'Mildly spiced boneless chicken in a creamy cashew and yogurt sauce.', 300.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 13),
    (v_rest_id, v_cat_nonveg_curry, 'Spl. Kaju Chicken (BL)', 'Signature boneless chicken curry heavily garnished with fried cashews.', 320.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800', 14),
    (v_rest_id, v_cat_nonveg_curry, 'Prawns Curry', 'Fresh prawns cooked in a tangy coastal style coconut onion curry.', 280.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 15),
    (v_rest_id, v_cat_nonveg_curry, 'Prawns Masala', 'Juicy prawns sautéed in a thick, flavorful spiced masala gravy.', 280.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 16),
    (v_rest_id, v_cat_nonveg_curry, 'Kadai Prawns', 'Prawns tossed with capsicum and aromatic kadai masala.', 300.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 17),
    (v_rest_id, v_cat_nonveg_curry, 'Mutton Curry', 'Slow cooked tender mutton pieces in a rich spicy gravy.', 280.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1545247181-516773cae754?w=800', 18),
    (v_rest_id, v_cat_nonveg_curry, 'Kadai Mutton', 'Tender mutton cooked with peppers and roasted spices in kadai style.', 300.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1545247181-516773cae754?w=800', 19),
    (v_rest_id, v_cat_nonveg_curry, 'Boiled Egg Curry', 'Hard boiled eggs simmered in a savory spiced onion-tomato curry.', 140.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 20),
    (v_rest_id, v_cat_nonveg_curry, 'Boiled Egg Keema Curry', 'Gratted boiled eggs cooked in a rich spicy keema masala gravy.', 150.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 21),
    (v_rest_id, v_cat_nonveg_curry, 'Egg Burji', 'Spiced scrambled eggs cooked with onions, tomatoes, and green chillies.', 120.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 22);

    -- Insert VEG CURRY Items (18)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_veg_curry, 'Paneer Butter Masala', 'Soft paneer cubes simmered in a rich tomato, butter, and cashew gravy.', 200.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800', 1),
    (v_rest_id, v_cat_veg_curry, 'Palak Paneer', 'Cottage cheese cubes cooked in a smooth, spiced spinach curry.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=800', 2),
    (v_rest_id, v_cat_veg_curry, 'Kadai Paneer', 'Paneer cubes tossed with capsicum and freshly ground kadai spices.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800', 3),
    (v_rest_id, v_cat_veg_curry, 'Kaju Paneer', 'Delicious combination of paneer and golden fried cashew nuts in rich curry.', 270.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800', 4),
    (v_rest_id, v_cat_veg_curry, 'Shahi Paneer', 'Royal paneer curry prepared in a fragrant saffron, cream, and nut sauce.', 240.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800', 5),
    (v_rest_id, v_cat_veg_curry, 'Paneer Burji', 'Scrambled cottage cheese cooked with onions, tomatoes, and aromatic spices.', 240.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800', 6),
    (v_rest_id, v_cat_veg_curry, 'Kaju Curry', 'Whole roasted cashew nuts simmered in a flavorful onion-tomato gravy.', 260.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 7),
    (v_rest_id, v_cat_veg_curry, 'Plain Palak Curry', 'Healthy pureed spinach curry tempered with garlic and cumin.', 190.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=800', 8),
    (v_rest_id, v_cat_veg_curry, 'Mushroom Curry', 'Fresh button mushrooms cooked in a savory onion and garlic curry.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 9),
    (v_rest_id, v_cat_veg_curry, 'Mushroom Masala', 'Button mushrooms sautéed in a thick spiced tomato gravy.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 10),
    (v_rest_id, v_cat_veg_curry, 'Kadai Mushroom', 'Mushrooms tossed with bell peppers and roasted kadai masala.', 240.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 11),
    (v_rest_id, v_cat_veg_curry, 'Mix Vegetable Curry', 'Assorted garden vegetables simmered in a home-style gravy.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 12),
    (v_rest_id, v_cat_veg_curry, 'Kadai Veg', 'Mixed vegetables cooked in a spicy gravy topped with coriander.', 180.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 13),
    (v_rest_id, v_cat_veg_curry, 'Veg Kolhapuri', 'Spicy mixed vegetable curry cooked Kolhapuri style with sesame and red chillies.', 180.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 14),
    (v_rest_id, v_cat_veg_curry, 'Veg Chatpat', 'Tangy and spicy vegetable curry prepared with chaat masala and lemon.', 180.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 15),
    (v_rest_id, v_cat_veg_curry, 'Tomato Curry', 'Tangy fresh tomato curry tempered with mustard and curry leaves.', 140.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 16),
    (v_rest_id, v_cat_veg_curry, 'Daal Thadka', 'Yellow lentils tempered with ghee, cumin seeds, garlic, and green chillies.', 140.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 17),
    (v_rest_id, v_cat_veg_curry, 'Daal Fry', 'Classic comforting cooked lentils tossed with onions and tomatoes.', 120.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 18);

    -- Insert FRIED RICE Items (8)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_fried_rice, 'Schezwan Egg Fried Rice', 'Spicy Schezwan wok-fried rice with scrambled eggs and spring onions.', 170.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800', 1),
    (v_rest_id, v_cat_fried_rice, 'Schezwan Chicken Fried Rice', 'Fiery Schezwan fried rice with tender chicken morsels and veggies.', 180.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800', 2),
    (v_rest_id, v_cat_fried_rice, 'Chicken Fried Rice', 'Classic wok-tossed basmati rice with chicken and garden vegetables.', 170.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800', 3),
    (v_rest_id, v_cat_fried_rice, 'Egg Fried Rice', 'Savory fried rice tossed with scrambled egg and mild soy sauce.', 150.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800', 4),
    (v_rest_id, v_cat_fried_rice, 'Schezwan Veg Fried Rice', 'Spicy wok-fried rice with mixed vegetables in red Schezwan sauce.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800', 5),
    (v_rest_id, v_cat_fried_rice, 'Veg Fried Rice', 'Aromatic basmati rice tossed with diced carrots, beans, and capsicum.', 150.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800', 6),
    (v_rest_id, v_cat_fried_rice, 'Paneer Fried Rice', 'Wok-fried basmati rice tossed with spiced paneer cubes.', 170.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800', 7),
    (v_rest_id, v_cat_fried_rice, 'Jeera Fried Rice', 'Fragrant rice seasoned with aromatic roasted cumin seeds and ghee.', 150.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800', 8);

    -- Insert STARTERS Items (33)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_starters, 'Chicken 65', 'Crispy fried chicken tossed in aromatic curry leaves, green chillies and spicy 65 masala.', 240.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 1),
    (v_rest_id, v_cat_starters, 'Chicken Manchuria', 'Crispy chicken pieces tossed in savory soy-garlic Manchurian sauce.', 240.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 2),
    (v_rest_id, v_cat_starters, 'Chilli Chicken', 'Tender fried chicken bites sautéed with capsicum, onion and green chillies.', 250.00, FALSE, TRUE, TRUE, 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800', 3),
    (v_rest_id, v_cat_starters, 'Pepper Chicken', 'Spicy chicken sautéed with coarsely ground black pepper and curry leaves.', 250.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800', 4),
    (v_rest_id, v_cat_starters, 'Chicken Fry (8 pcs)', 'Traditional Andhra style bone-in chicken fry with roasted spices (8 pcs).', 200.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800', 5),
    (v_rest_id, v_cat_starters, 'Chicken Roast (8 pcs)', 'Slow cooked spicy roasted chicken with rich caramelized onion glaze (8 pcs).', 230.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800', 6),
    (v_rest_id, v_cat_starters, 'Spl. Chicken Dry', 'Special Athidi signature dry chicken tossed with cashews and freshly ground spices.', 280.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 7),
    (v_rest_id, v_cat_starters, 'Chicken Majestic', 'Soft chicken strips marinated in spiced yogurt and mint, fried to perfection.', 280.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 8),
    (v_rest_id, v_cat_starters, 'Spicy Chicken', 'Fiery spicy chicken starter prepared with red chili paste and garlic.', 290.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 9),
    (v_rest_id, v_cat_starters, 'Dragon Chicken', 'Crispy chicken strips tossed in spicy red dragon chili sauce with cashews.', 290.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800', 10),
    (v_rest_id, v_cat_starters, 'Lollypop Full (6 pcs)', 'Juicy fried chicken drumettes served with spicy sauce (6 pcs).', 300.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800', 11),
    (v_rest_id, v_cat_starters, 'Lollypop Half (3 pcs)', 'Crispy spiced chicken drumettes (3 pcs).', 180.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800', 12),
    (v_rest_id, v_cat_starters, 'Drumsticks Full (6 pcs)', 'Crispy fried chicken legs marinated in signature spices (6 pcs).', 270.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800', 13),
    (v_rest_id, v_cat_starters, 'Drumsticks Half (3 pcs)', 'Crispy fried chicken legs (3 pcs).', 160.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800', 14),
    (v_rest_id, v_cat_starters, 'Prawns 65', 'Succulent prawns fried crisp and tossed with curry leaves and spices.', 320.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 15),
    (v_rest_id, v_cat_starters, 'Prawns Manchuria', 'Crispy prawns tossed in dark soya garlic Manchurian sauce.', 320.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 16),
    (v_rest_id, v_cat_starters, 'Prawns Chilli', 'Fresh prawns sautéed with bell peppers and fiery green chillies.', 320.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', 17),
    (v_rest_id, v_cat_starters, 'Veg 65', 'Crispy mixed vegetable dumplings tossed in spicy 65 masala.', 150.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800', 18),
    (v_rest_id, v_cat_starters, 'Veg Manchuria', 'Crispy vegetable balls tossed in rich ginger-garlic soy Manchurian glaze.', 150.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800', 19),
    (v_rest_id, v_cat_starters, 'Veg Chilli', 'Golden crisp mixed vegetable bites tossed with peppers and chili sauce.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800', 20),
    (v_rest_id, v_cat_starters, 'Paneer 65', 'Fresh cottage cheese cubes fried and tossed in spicy yogurt curry leaf sauce.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800', 21),
    (v_rest_id, v_cat_starters, 'Paneer Manchuria', 'Crispy paneer cubes tossed in savory Manchurian sauce with spring onions.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800', 22),
    (v_rest_id, v_cat_starters, 'Paneer Chilli', 'Soft paneer tossed with crunchy capsicum, onions and fiery green chillies.', 240.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800', 23),
    (v_rest_id, v_cat_starters, 'Paneer Majestik', 'Paneer strips marinated in spiced yogurt and mint, shallow fried.', 280.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800', 24),
    (v_rest_id, v_cat_starters, 'Mushroom 65', 'Fresh button mushrooms fried crisp and tossed in tempered 65 masala.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 25),
    (v_rest_id, v_cat_starters, 'Mushroom Manchuria', 'Tender mushrooms coated and tossed in dark soy Manchurian glaze.', 220.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 26),
    (v_rest_id, v_cat_starters, 'Mushroom Chilli', 'Button mushrooms sautéed with bell peppers, green chillies and spicy sauce.', 240.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800', 27),
    (v_rest_id, v_cat_starters, 'Gobi 65', 'Crispy cauliflower florets tossed with curry leaves, garlic and 65 spices.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 28),
    (v_rest_id, v_cat_starters, 'Gobi Manchuria', 'Crunchy cauliflower florets tossed in classic Manchurian sauce.', 160.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 29),
    (v_rest_id, v_cat_starters, 'Gobi Chilli', 'Crisp gobi florets cooked with onions, capsicum and spicy chili sauce.', 170.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 30),
    (v_rest_id, v_cat_starters, 'Egg 65', 'Boiled egg pieces fried crisp and tossed in signature 65 masala.', 180.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 31),
    (v_rest_id, v_cat_starters, 'Egg Manchuria', 'Spiced egg morsels tossed in garlic soy Manchurian sauce.', 180.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 32),
    (v_rest_id, v_cat_starters, 'Egg Chilli', 'Boiled egg slices sautéed with capsicum, green chillies and savory sauce.', 190.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 33);

    -- Insert NAANS & ROTI Items (5)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_naan, 'Tandoori Roti', 'Traditional whole wheat bread baked in a clay tandoor.', 30.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 1),
    (v_rest_id, v_cat_naan, 'Butter Roti', 'Tandoor baked whole wheat roti brushed with fresh butter.', 35.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800', 2),
    (v_rest_id, v_cat_naan, 'Butter Naan (Pair)', 'Soft leavened tandoor baked naan brushed with rich butter (Pair).', 45.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800', 3),
    (v_rest_id, v_cat_naan, 'Plain Naan (Pair)', 'Classic soft leavened refined flour flatbread baked in tandoor (Pair).', 40.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 4),
    (v_rest_id, v_cat_naan, 'Garlic Naan (Pair)', 'Flavorsome tandoor naan topped with minced garlic and cilantro (Pair).', 60.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 5);

    -- Insert OTHERS Items (8)
    INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, is_veg, available, bestseller, image_url, sort_order)
    VALUES
    (v_rest_id, v_cat_others, 'Biryani Rice Full', 'Full portion of aromatic biryani rice cooked in authentic spices.', 120.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 1),
    (v_rest_id, v_cat_others, 'Biryani Rice Small (Table)', 'Side portion biryani rice cooked with whole aromatic spices.', 80.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800', 2),
    (v_rest_id, v_cat_others, 'Chicken Dum Piece (1)', 'Single succulent piece of slow-cooked dum chicken.', 80.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800', 3),
    (v_rest_id, v_cat_others, 'Boiled Egg (1)', 'Freshly hard-boiled egg.', 15.00, FALSE, TRUE, FALSE, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800', 4),
    (v_rest_id, v_cat_others, 'Curd Rice', 'Cooling creamy yogurt rice tempered with mustard seeds and curry leaves.', 100.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800', 5),
    (v_rest_id, v_cat_others, 'Spl. Curd Rice', 'Special curd rice tempered with cashews, pomegranate seeds, and spices.', 150.00, TRUE, TRUE, TRUE, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800', 6),
    (v_rest_id, v_cat_others, 'Cool Drink (300 ml Mug)', 'Chilled soft drink mug (300 ml).', 30.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800', 7),
    (v_rest_id, v_cat_others, 'Water Bottle', 'Packaged mineral water bottle (1L).', 20.00, TRUE, TRUE, FALSE, 'https://images.unsplash.com/photo-1560023907-5f310c845209?w=800', 8);

    -- Insert Staff Account
    INSERT INTO public.staff (restaurant_id, branch_id, full_name, email, role_name, active)
    VALUES (v_rest_id, v_branch_id, 'Sai Abhinav Kandikatla', 'saiabhinavkandikatla@gmail.com', 'OWNER', TRUE)
    ON CONFLICT (email) DO NOTHING;

END $$;

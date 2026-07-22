"use client";

import React, { useState } from "react";
import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";
import { SlidingCart } from "@/components/SlidingCart";
import { MENU_ITEMS, REVIEWS, FAQS } from "@/data/mockData";
import { ArrowRight, Flame, Star, Sparkles, MapPin, Phone, MessageSquare, ChevronDown, Compass, Award } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Filter Chef Specials for Landing Page
  const specials = MENU_ITEMS.filter((item) => item.isChefSpecial).slice(0, 3);
  
  // Signature dishes list
  const signatures = MENU_ITEMS.filter((item) => item.category === "hyderabadi-biryani").slice(0, 3);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Gallery Images
  const gallery = [
    { url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80", title: "Royal Curries" },
    { url: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80", title: "Zafrani Dum Biryani" },
    { url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80", title: "Clay-Oven Tandoori" },
    { url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80", title: "Fine Platings" },
    { url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&auto=format&fit=crop&q=80", title: "Smoked Tandoori Lobster" },
    { url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80", title: "Elixirs & Mocktails" }
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-24 relative">
      <TopHeader />

      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Parallax Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1600&auto=format&fit=crop&q=80')",
            transform: "scale(1.05)",
          }}
        />
        {/* Deep luxury black backdrop gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-[#0F0F0F] z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-transparent to-black/85 z-0" />

        <div className="relative z-10 max-w-4xl px-6 text-center flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181818]/85 border border-[#C5A880]/30 backdrop-blur-md shadow-2xl"
          >
            <Award className="w-3.5 h-3.5 text-[#C5A880] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gray-200">
              Michelin Star Quality Dining
            </span>
          </motion.div>

          <div className="flex flex-col gap-3">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-6xl md:text-7xl font-serif font-extrabold tracking-tight text-white leading-none"
            >
              Luxury Dining <br />
              <span className="gold-text-gradient font-serif">Redefined</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-xs sm:text-sm md:text-base text-gray-300 max-w-xl mx-auto leading-relaxed font-light mt-2"
            >
              Indulge in authentic Dum cooking, charcoal-kissed appetizers, and gold-leaf creations crafted by master culinarians at Athidi Family Restaurant.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center gap-4 mt-6 w-full max-w-xs justify-center"
          >
            <Link
              href="/menu"
              className="flex-1 bg-[#C5A880] hover:bg-[#D4AF37] text-black text-xs font-semibold py-3.5 rounded-full uppercase tracking-widest text-center shadow-[0_4px_20px_rgba(197,168,128,0.25)] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              Order Now
            </Link>
            <Link
              href="/menu"
              className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-white text-xs font-semibold py-3.5 rounded-full uppercase tracking-widest text-center transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              <span>View Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-70 animate-bounce">
          <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-gray-400">Scroll</span>
          <ChevronDown className="w-4 h-4 text-[#C5A880]" />
        </div>
      </section>

      {/* Chef Specials (Today's Gold) */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-12">
        <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Curated Heritage</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Chef's Masterpieces</h2>
          <p className="text-xs text-gray-400 leading-relaxed font-light mt-1">
            Indulge in our signature creations, prepared with premium ingredients and presented with ultimate luxury.
          </p>
        </div>

        {/* Specials Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {specials.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col bg-[#181818]/65 border border-white/5 rounded-[24px] overflow-hidden hover:border-[#C5A880]/30 transition-all duration-500 shadow-xl"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-4 left-4 bg-[#C5A880] text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                  <Star className="w-2.5 h-2.5 fill-black" /> Chef Special
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1 gap-3">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-base font-serif font-bold text-white group-hover:text-[#C5A880] transition-colors">
                    {item.name}
                  </h3>
                  <span className="text-[#C5A880] font-serif font-bold text-sm">₹{item.price}</span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <Link
                  href="/menu"
                  className="text-xs font-semibold text-[#C5A880] hover:text-[#D4AF37] mt-auto pt-2 flex items-center gap-1 transition-colors"
                >
                  <span>Order in Menu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Today's Special Banner */}
      <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="relative rounded-[28px] overflow-hidden glass-panel border border-[#C5A880]/15 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          {/* Subtle gold glow behind card */}
          <div className="absolute inset-0 bg-[#C5A880]/2 pointer-events-none" />

          <div className="flex-1 flex flex-col gap-4">
            <span className="bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] text-[9px] font-bold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full w-fit flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 animate-pulse" /> Today's Exclusive
            </span>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white leading-tight">
              Truffle Dal Makhani Gold Edition
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed font-light max-w-lg">
              Slow-cooked black lentils, simmered for 36 hours over charcoal, infused with black truffle paste and finished with 24k edible gold leaf. Order now for a truly royal culinary experience.
            </p>
            <div className="flex items-center gap-6 mt-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Price</span>
                <span className="text-lg font-serif font-bold text-[#C5A880]">₹649</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Prep Time</span>
                <span className="text-sm font-semibold text-gray-200 block">25 Minutes</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-80 aspect-4/3 rounded-2xl overflow-hidden border border-white/5 relative shrink-0">
            <img
              src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80"
              alt="Truffle Dal Makhani"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        </div>
      </section>

      {/* Story / Heritage Section */}
      <section className="py-20 bg-[#121212]/30 border-t border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(197,168,128,0.02)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">The Heritage</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white leading-tight">
              A Legacy of Royal Spices and Clay Oven Mastery
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
              Founded in 1998, Athidi was born from a passion to preserve the majestic recipes of the Mughal & Nizami eras. Our signature spice blends are kept under close guard, ground daily in stone pestles to ensure their oils are preserved.
            </p>
            <p className="text-xs text-gray-500 font-light leading-relaxed">
              We slow-cook our mutton dum biryani in sealed handis under charcoal fire for hours. This patient technique creates layers of aromatic complexity, locking in spices and juices to create the perfect bite.
            </p>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex flex-col">
                <span className="text-2xl font-serif font-bold text-[#C5A880]">28+</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Years of Service</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-2xl font-serif font-bold text-[#C5A880]">150+</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Secret Spice Ingredients</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl overflow-hidden aspect-video border border-white/5">
                <img
                  src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80"
                  alt="Spice grinder"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-3xl overflow-hidden aspect-square border border-white/5">
                <img
                  src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&auto=format&fit=crop&q=80"
                  alt="Biryani handi"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 justify-center">
              <div className="rounded-3xl overflow-hidden aspect-square border border-white/5">
                <img
                  src="https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400&auto=format&fit=crop&q=80"
                  alt="Tandoori smoke"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-12">
        <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Visual Feast</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">The Culinary Gallery</h2>
          <p className="text-xs text-gray-400 font-light mt-1">
            Take a visual tour through our hand-selected kitchen preparations and exquisite fine-dining presentations.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {gallery.map((item, i) => (
            <div
              key={i}
              className="group relative rounded-3xl overflow-hidden aspect-square border border-white/5 shadow-lg"
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                <span className="text-xs font-serif font-bold text-[#C5A880] tracking-wide uppercase">
                  {item.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full Menu Card Section */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col gap-10">
        <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Complete Menu</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Our Full Menu</h2>
          <p className="text-xs text-gray-400 font-light mt-1">
            Browse our complete menu with all dishes and prices. Tap to zoom in and explore every category.
          </p>
        </div>

        <div className="relative rounded-[28px] overflow-hidden border border-[#C5A880]/20 shadow-2xl bg-[#181818] group mx-auto max-w-2xl w-full">
          <img
            src="/athidi-menu.jpg"
            alt="Athidi Family Restaurant - Full Menu"
            className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-[#C5A880]/30 rounded-full px-6 py-2.5 shadow-lg">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#C5A880]">
              Athidi Family Restaurant Menu
            </span>
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="py-20 bg-[#121212]/30 border-t border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-12">
          <div className="text-center max-w-xl mx-auto flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Guest Experiences</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Voices of Royalty</h2>
            <p className="text-xs text-gray-400 font-light mt-1">
              Read authentic reviews and ratings left by gourmet enthusiasts and food critics alike.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REVIEWS.map((review) => (
              <div
                key={review.id}
                className="p-6 rounded-[24px] bg-[#181818]/65 border border-white/5 flex flex-col gap-4 shadow-xl"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{review.name}</h4>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5 block">
                      {review.role}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#C5A880] text-[#C5A880]" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-light italic">
                  "{review.comment}"
                </p>
                <span className="text-[9px] text-gray-600 font-bold self-end tracking-wider">
                  {review.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location, Contact & Map */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Visit Us</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Find Athidi</h2>
            <p className="text-xs text-gray-400 font-light">
              Experience the physical grandeur of our restaurant in Hyderabad's premier dining hub.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Address */}
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              <MapPin className="w-5 h-5 text-[#C5A880] shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Location</span>
                <span className="text-xs text-gray-300 leading-relaxed font-light mt-1">
                  124, Royal Palace Road, Jubilee Hills, Road No. 36, Hyderabad, TS, 500033
                </span>
              </div>
            </div>

            {/* Direct Calls */}
            <div className="flex gap-3">
              <a
                href="tel:+919876543210"
                className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-full bg-[#181818] border border-white/5 text-gray-200 hover:text-[#C5A880] hover:border-[#C5A880]/30 transition-all text-xs font-semibold uppercase tracking-wider"
              >
                <Phone className="w-4 h-4 text-[#C5A880]" />
                Call Desk
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 p-3.5 rounded-full bg-[#181818] border border-white/5 text-gray-200 hover:text-green-400 hover:border-green-400/30 transition-all text-xs font-semibold uppercase tracking-wider"
              >
                <MessageSquare className="w-4 h-4 text-green-400" />
                WhatsApp
              </a>
            </div>

            {/* Maps CTA */}
            <a
              href="https://maps.google.com/?q=Jubilee+Hills+Hyderabad"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-[#C5A880] hover:bg-[#D4AF37] text-black text-xs font-bold py-4 rounded-full uppercase tracking-widest shadow-lg transition-transform duration-300 hover:scale-[1.01]"
            >
              Get Directions in Google Maps
            </a>
          </div>
        </div>

        {/* Mock Map View */}
        <div className="h-80 w-full rounded-[24px] overflow-hidden border border-white/5 relative bg-[#181818]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.8272225619176!2d78.39763787595304!3d17.432070101886884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb915c2fffffff%3A0xe54d8bbf758ee1e7!2sJubilee+Hills%2C+Hyderabad%2C+Telangana!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0, filter: "grayscale(1) invert(0.9) contrast(1.1)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-sm border border-white/5 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg text-[10px] font-bold text-gray-200">
            <span className="w-1.5 h-1.5 bg-[#C5A880] rounded-full animate-ping" />
            <span>Athidi Jubilee Hills</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 md:px-12 max-w-3xl mx-auto flex flex-col gap-10">
        <div className="text-center flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A880] font-bold">Help & Guide</span>
          <h2 className="text-3xl font-serif font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="flex flex-col gap-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/5 bg-[#181818]/65 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#C5A880] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="p-5 pt-0 text-xs text-gray-400 leading-relaxed font-light border-t border-white/5 bg-black/20">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#181818]/40 py-12 px-6 md:px-12 text-center text-xs text-gray-500 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="/athidi-logo.jpg" alt="Athidi" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-base font-serif font-bold uppercase tracking-widest text-white">Athidi</span>
        </div>
        <p className="max-w-md leading-relaxed font-light text-gray-400">
          Crafting fine Mughlai and Indian cuisine since 1998. Order online, check in via QR, and experience culinary nobility directly on your mobile device.
        </p>
        
        {/* Mock legal links */}
        <div className="flex gap-6 text-gray-500 font-medium">
          <Link href="/menu" className="hover:text-white transition-colors">Menu</Link>
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Support Desk</a>
        </div>

        <p className="text-[10px] text-gray-600 mt-2">
          © {new Date().getFullYear()} Athidi Family Restaurant. All Rights Reserved. Designed by Antigravity.
        </p>
      </footer>

      {/* Navigation Layout components */}
      <BottomNav />
      <SlidingCart />
    </div>
  );
}

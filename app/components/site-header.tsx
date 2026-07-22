"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "./brand";

export function SiteHeader({ cartCount = 0, onCart }: { cartCount?: number; onCart?: () => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Our story", "/#story"],
    ["Menu", "/menu"],
    ["Gallery", "/#gallery"],
    ["Reviews", "/#reviews"],
    ["Visit", "/#visit"],
  ];
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand compact />
        <nav className={`site-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
          {links.map(([label, href]) => <Link href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link href="/table/8" className="nav-cta" onClick={() => setOpen(false)}>Order at table</Link>
        </nav>
        <div className="header-actions">
          {onCart && (
            <button className="icon-button cart-button" onClick={onCart} aria-label={`Open cart with ${cartCount} items`}>
              <ShoppingBag size={20} /><span>{cartCount}</span>
            </button>
          )}
          <button className="icon-button mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

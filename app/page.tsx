/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Clock3, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand, FoodMark } from "./components/brand";
import { SiteHeader } from "./components/site-header";
import { defaultMenuImage, formatCurrency, itemCategory } from "./lib/menu";
import { getPublicRestaurantData } from "./lib/supabase/public-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (process.env.APP_SURFACE === "admin") redirect("/admin");
  const data = await getPublicRestaurantData();
  const bestsellers = data.items.filter((item) => item.bestseller).slice(0, 3);
  const gallery = data.items
    .filter((item) => item.image_url)
    .slice(0, 3)
    .map((item) => [item.image_url!, item.name] as const);
  const signature = bestsellers[0];
  const phoneHref = data.restaurant?.phone
    ? `tel:${data.restaurant.phone.replace(/[^\d+]/g, "")}`
    : null;
  const whatsappHref = data.restaurant?.whatsapp
    ? `https://wa.me/${data.restaurant.whatsapp.replace(/\D/g, "")}`
    : null;
  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span /> A seat at our table</p>
            <h1>Made with heart.<br /><em>Served like family.</em></h1>
            <p className="hero-lede">From slow-sealed biryanis to recipes passed down through generations, every plate at Athidhi is a warm invitation to stay a little longer.</p>
            <div className="hero-actions">
              <Link href="/menu" className="button button--gold">Explore our menu <ArrowRight size={18} /></Link>
              {phoneHref && <a href={phoneHref} className="button button--ghost"><Phone size={17} /> Reserve a table</a>}
            </div>
            <div className="hero-proof">
              <div><strong>{data.items.length}</strong><span>dishes on the live menu</span></div>
              <i />
              <div><strong>{data.branch?.opens_at?.slice(0, 5) ?? "Daily"}</strong><span>Doors open</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image" role="img" aria-label="Athidhi signature dum biryani" />
            <div className="hero-special">
              <span>Chef&apos;s signature</span>
              <strong>{signature?.name ?? "Athidhi family favourites"}</strong>
              <small>{signature ? `Made fresh · ${formatCurrency(signature.price)}` : "Made fresh for every table"}</small>
            </div>
            <div className="seal"><span>AUTHENTIC</span><strong>A</strong><span>FAMILY RECIPES</span></div>
          </div>
        </div>
        <div className="hero-scroll">SCROLL TO DISCOVER <span>↓</span></div>
      </section>

      <section className="section bestsellers" id="menu">
        <div className="container">
          <div className="section-heading split-heading">
            <div><p className="eyebrow eyebrow--maroon"><span /> Chosen again & again</p><h2>The table favourites</h2></div>
            <Link href="/menu" className="text-link">View full menu <ArrowRight size={17} /></Link>
          </div>
          <div className="dish-grid">
            {bestsellers.map((item, i) => (
              <article className="dish-card" key={item.id}>
                <div className="dish-card__image" style={{ backgroundImage: `url(${item.image_url ?? defaultMenuImage})` }}><span>0{i + 1}</span></div>
                <div className="dish-card__body">
                  <div><FoodMark veg={item.is_veg} /><span className="dish-type">{itemCategory(item)}</span></div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong>{formatCurrency(item.price)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section" id="story">
        <div className="container story-grid">
          <div className="story-image"><div className="story-frame" /><div className="story-caption">A welcome that begins in the kitchen.</div></div>
          <div className="story-copy">
            <p className="eyebrow"><span /> Our story</p>
            <h2>In Telugu, <em>Athidhi</em><br />means guest.</h2>
            <p>To us, it means much more. It is the promise that everyone who walks through our doors is cared for like family—from the first glass of water to the last spoonful of dessert.</p>
            <p>Our kitchen brings regional favourites together with patient cooking, honest ingredients and the generous spirit of a family meal.</p>
            <div className="story-signature">అతిథి దేవో భవ <span>— The guest is divine</span></div>
          </div>
        </div>
      </section>

      <section className="section gallery-section" id="gallery">
        <div className="container">
          <div className="section-heading centered"><p className="eyebrow eyebrow--maroon"><span /> From our kitchen</p><h2>A feast for every sense</h2><p>Honest food, generous portions, and the kind of table that brings everyone closer.</p></div>
          <div className="gallery-grid">
            {gallery.map(([src, alt], i) => <figure key={src} className={`gallery-item gallery-item--${i + 1}`}><img src={src} alt={alt} /><figcaption>{alt}</figcaption></figure>)}
          </div>
        </div>
      </section>

      <section className="reviews-section" id="reviews">
        <div className="container reviews-grid">
          <div><p className="eyebrow"><span /> Our promise</p><h2>Care in every<br />part of the meal</h2><p className="muted-on-dark">We never publish invented guest ratings. What we can promise is fresh preparation, thoughtful service and a warm family table.</p></div>
          <blockquote><div className="quote-mark">“</div><p>Every guest deserves honest food, generous hospitality and a team that listens. That is the standard we work toward at every service.</p><footer><div className="avatar">A</div><div><strong>The Athidhi team</strong><span>Our service promise</span></div></footer></blockquote>
          <div className="review-score"><strong>{data.items.length}</strong><div><p>Live menu dishes</p><small>Availability synchronized with the kitchen</small></div></div>
        </div>
      </section>

      <section className="visit-section" id="visit">
        <div className="container visit-card">
          <div className="visit-copy">
            <p className="eyebrow eyebrow--maroon"><span /> Come, be our guest</p><h2>Your table is waiting.</h2>
            <div className="visit-details">
              <div><MapPin /><span><strong>{data.restaurant?.name ?? "Athidhi Family Restaurant"}</strong><small>{data.branch?.address ?? "Visit us for a warm family meal"}</small></span></div>
              <div><Clock3 /><span><strong>Every day</strong><small>{data.branch?.opens_at && data.branch?.closes_at ? `${data.branch.opens_at.slice(0, 5)} — ${data.branch.closes_at.slice(0, 5)}` : "Opening hours available at the restaurant"}</small></span></div>
              {data.restaurant?.phone && <div><Phone /><span><strong>Reservations</strong><small>{data.restaurant.phone}</small></span></div>}
            </div>
            <Link href="/menu" className="button button--maroon">Explore the live menu <ArrowRight size={18} /></Link>
          </div>
          <div className="map-art"><div className="map-pin"><MapPin size={28} /></div><span className="road road-1" /><span className="road road-2" /><span className="road road-3" /><div className="map-label"><Brand compact /><span>Athidhi Family Restaurant</span></div></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid"><div><Brand /><p>A warm table. A generous meal.<br />A guest who leaves as family.</p></div><div><strong>Explore</strong><Link href="/menu">Menu</Link><Link href="/#story">Our story</Link><Link href="/#gallery">Gallery</Link></div><div><strong>Information</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin">Staff portal</Link></div><div><strong>Talk to us</strong>{phoneHref && <a href={phoneHref}>{data.restaurant?.phone}</a>}{whatsappHref && <a href={whatsappHref}>WhatsApp</a>}</div></div>
        <div className="container footer-bottom"><span>© 2026 Athidhi Family Restaurant</span><span>అతిథి దేవో భవ</span></div>
      </footer>
    </main>
  );
}

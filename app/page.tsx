/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Clock3, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Brand, FoodMark } from "./components/brand";
import { SiteHeader } from "./components/site-header";
import { menuItems } from "./lib/menu";

const gallery = [
  ["https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=85", "Fragrant dum biryani"],
  ["https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85", "House curry"],
  ["https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=85", "Classic Indian feast"],
];

export default function Home() {
  const bestsellers = menuItems.filter((item) => item.bestseller);
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
              <a href="tel:+919000000000" className="button button--ghost"><Phone size={17} /> Reserve a table</a>
            </div>
            <div className="hero-proof">
              <div><strong>4.8</strong><span><span className="stars">★★★★★</span> loved by families</span></div>
              <i />
              <div><strong>11–11</strong><span>Open every day</span></div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image" role="img" aria-label="Athidhi signature dum biryani" />
            <div className="hero-special">
              <span>Chef&apos;s signature</span>
              <strong>Athidhi Dum Biryani</strong>
              <small>Slow sealed · House masala · ₹289</small>
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
                <div className="dish-card__image" style={{ backgroundImage: `url(${item.image})` }}><span>0{i + 1}</span></div>
                <div className="dish-card__body">
                  <div><FoodMark veg={item.veg} /><span className="dish-type">{item.group}</span></div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong>₹{item.price}</strong>
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
          <div><p className="eyebrow"><span /> Guest book</p><h2>Stories shared<br />around our table</h2><p className="muted-on-dark">The best compliment is seeing the same families return, bringing a new guest each time.</p></div>
          <blockquote><div className="quote-mark">“</div><p>The biryani has that slow-cooked aroma you notice before it reaches the table. Warm service, beautiful food, and genuinely comfortable for the whole family.</p><footer><div className="avatar">AR</div><div><strong>Ananya R.</strong><span><span className="stars">★★★★★</span> Family dinner</span></div></footer></blockquote>
          <div className="review-score"><strong>4.8</strong><div><span className="stars">★★★★★</span><p>Average guest rating</p><small>Across dining platforms</small></div></div>
        </div>
      </section>

      <section className="visit-section" id="visit">
        <div className="container visit-card">
          <div className="visit-copy">
            <p className="eyebrow eyebrow--maroon"><span /> Come, be our guest</p><h2>Your table is waiting.</h2>
            <div className="visit-details">
              <div><MapPin /><span><strong>Athidhi Family Restaurant</strong><small>Restaurant address to be confirmed</small></span></div>
              <div><Clock3 /><span><strong>Every day</strong><small>11:00 AM — 11:00 PM</small></span></div>
              <div><Phone /><span><strong>Reservations</strong><small>Phone number to be confirmed</small></span></div>
            </div>
            <Link href="/table/8" className="button button--maroon">Start a table order <ArrowRight size={18} /></Link>
          </div>
          <div className="map-art"><div className="map-pin"><MapPin size={28} /></div><span className="road road-1" /><span className="road road-2" /><span className="road road-3" /><div className="map-label"><Brand compact /><span>Athidhi Family Restaurant</span></div></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-grid"><div><Brand /><p>A warm table. A generous meal.<br />A guest who leaves as family.</p></div><div><strong>Explore</strong><Link href="/menu">Menu</Link><Link href="/#story">Our story</Link><Link href="/#gallery">Gallery</Link></div><div><strong>Information</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/admin">Staff portal</Link></div><div><strong>Talk to us</strong><a href="tel:+919000000000">+91 90000 00000</a><a href="https://wa.me/919000000000">WhatsApp</a></div></div>
        <div className="container footer-bottom"><span>© 2026 Athidhi Family Restaurant</span><span>అతిథి దేవో భవ</span></div>
      </footer>
    </main>
  );
}

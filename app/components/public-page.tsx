import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "./site-header";

export function PublicPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <main className="public-page"><SiteHeader /><section className="public-hero"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={17} /> Restaurant home</Link><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{intro}</p></div></section><section className="container public-content">{children}</section></main>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2>{title}</h2><div>{children}</div></section>; }

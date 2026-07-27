/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Athidi Family Restaurant home">
      <img src="/athidi-logo.png" alt="Athidi Family Restaurant" />
    </Link>
  );
}

export function FoodMark({ veg }: { veg: boolean }) {
  return <span className={`food-mark ${veg ? "veg" : "nonveg"}`} aria-label={veg ? "Vegetarian" : "Non-vegetarian"}><i /></span>;
}

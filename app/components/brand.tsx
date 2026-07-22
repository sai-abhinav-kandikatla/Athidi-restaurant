/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand ${compact ? "brand--compact" : ""}`} aria-label="Athidhi Family Restaurant home">
      <img src="/athidhi-logo.png" alt="Athidhi Family Restaurant" />
    </Link>
  );
}

export function FoodMark({ veg }: { veg: boolean }) {
  return <span className={`food-mark ${veg ? "veg" : "nonveg"}`} aria-label={veg ? "Vegetarian" : "Non-vegetarian"}><i /></span>;
}

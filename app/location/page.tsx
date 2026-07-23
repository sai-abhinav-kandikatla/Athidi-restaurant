import { PublicPage } from "../components/public-page";
import { getPublicRestaurantData } from "../lib/supabase/public-data";

export const dynamic = "force-dynamic";

export default async function LocationPage() {
  const data = await getPublicRestaurantData();
  const hours =
    data.branch?.opens_at && data.branch.closes_at
      ? `${data.branch.opens_at.slice(0, 5)} — ${data.branch.closes_at.slice(0, 5)}`
      : "Please call before visiting";
  return (
    <PublicPage
      eyebrow="Come, be our guest"
      title="Your table is waiting."
      intro="Visit Athidhi for relaxed lunches, family dinners and everything in between."
    >
      <div className="location-panel">
        <div>
          <span>OPENING HOURS</span>
          <h2>{hours}</h2>
          <p>Monday through Sunday</p>
        </div>
        <div>
          <span>ADDRESS</span>
          <h2>{data.restaurant?.name ?? "Athidhi Family Restaurant"}</h2>
          <p>{data.branch?.address ?? "Contact the restaurant for directions."}</p>
        </div>
      </div>
    </PublicPage>
  );
}

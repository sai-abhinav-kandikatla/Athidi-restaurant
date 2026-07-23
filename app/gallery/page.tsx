/* eslint-disable @next/next/no-img-element */
import { PublicPage } from "../components/public-page";
import { getPublicRestaurantData } from "../lib/supabase/public-data";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const data = await getPublicRestaurantData();
  const photos = data.items.filter((item) => item.image_url).slice(0, 8);
  return (
    <PublicPage
      eyebrow="From our kitchen"
      title="A feast for every sense."
      intro="A closer look at the dishes currently served at Athidhi."
    >
      <div className="public-gallery">
        {photos.map((item) => (
          <img key={item.id} src={item.image_url!} alt={item.name} />
        ))}
      </div>
      {!photos.length && (
        <div className="empty-state">
          <h3>Kitchen photos are being prepared.</h3>
          <p>The live menu remains available while the gallery is updated.</p>
        </div>
      )}
    </PublicPage>
  );
}

import { PublicPage } from "../components/public-page";
import { getPublicRestaurantData } from "../lib/supabase/public-data";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const data = await getPublicRestaurantData();
  return (
    <PublicPage
      eyebrow="Talk to us"
      title="We’d love to hear from you."
      intro="For reservations, celebrations or anything else, reach the Athidhi team here."
    >
      <div className="contact-cards">
        {data.restaurant?.phone && (
          <article>
            <span>PHONE</span>
            <h2>Reservations & enquiries</h2>
            <a href={`tel:${data.restaurant.phone.replace(/[^\d+]/g, "")}`}>
              {data.restaurant.phone}
            </a>
          </article>
        )}
        {data.restaurant?.whatsapp && (
          <article>
            <span>WHATSAPP</span>
            <h2>Quick messages</h2>
            <a href={`https://wa.me/${data.restaurant.whatsapp.replace(/\D/g, "")}`}>
              Message Athidhi
            </a>
          </article>
        )}
        <article>
          <span>VISIT</span>
          <h2>{data.branch?.name ?? "Athidhi Family Restaurant"}</h2>
          <p>{data.branch?.address ?? "Contact us for directions."}</p>
        </article>
      </div>
    </PublicPage>
  );
}

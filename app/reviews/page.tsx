import Link from "next/link";
import { PublicPage } from "../components/public-page";

export default function ReviewsPage() {
  return (
    <PublicPage
      eyebrow="Our promise"
      title="Hospitality you can feel."
      intro="We do not publish invented ratings or guest quotes. Athidhi’s promise is simple: fresh food, thoughtful service and a table where families feel at home."
    >
      <div className="public-prose">
        <h2>Share your experience directly</h2>
        <p>
          If something made your visit special—or if there is something we can
          improve—please tell the restaurant team. Every note is handled by a
          real person.
        </p>
        <Link href="/contact" className="button button--maroon">
          Contact Athidhi
        </Link>
      </div>
    </PublicPage>
  );
}

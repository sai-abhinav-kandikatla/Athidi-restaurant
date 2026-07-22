/* eslint-disable @next/next/no-img-element */
import { PublicPage } from "../components/public-page";
const photos = ["photo-1589302168068-964664d93dc0", "photo-1603894584373-5ac82b2ae398", "photo-1565557623262-b51c2513a641", "photo-1567188040759-fb8a883dc6d8", "photo-1631452180519-c014fe946bc7", "photo-1601050690597-df0568f70950"];
export default function GalleryPage() { return <PublicPage eyebrow="From our kitchen" title="A feast for every sense." intro="A closer look at the colours, craft and warmth of Athidhi."><div className="public-gallery">{photos.map((photo, index) => <img key={photo} src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`} alt={`Athidhi dining and food moment ${index + 1}`} />)}</div></PublicPage>; }

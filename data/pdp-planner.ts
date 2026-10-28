// Product-specific review copy transcribed from the supplied Product Upload Planner.
// The planner marks these entries "To confirm"; edit/approve them in the product manager.
import { modelDetailsBySlug } from "./model-details";
export type PdpContent = {
  features: string[];
  activities: string[];
  fit: string;
  fabric: string;
  model_details: string;
  show_model_details: boolean;
  show_brand_story: boolean;
  video_url: string;
  video_poster: string;
  oeko_certificate: string;
  oeko_certified: boolean;
  featured_best_seller: boolean;
};

const shared = { model_details: "", show_model_details: true, show_brand_story: true, video_url: "", video_poster: "", oeko_certificate: "", oeko_certified: true, featured_best_seller: false };

export const plannerPdp: Record<string, PdpContent> = {
  "Aura Halter Top": { ...shared, features: ["Flattering neckline", "Sculpted fit", "Body-hugging design", "Extended length", "Versatile styling"], activities: ["Yoga", "Pilates", "Everyday"], fit: "True to size", fabric: "90% polyamide, 10% elastane" },
  "All In Motion Shorts": { ...shared, features: ["Wide, supportive waistband for a comfortable fit", "Lightweight design for unrestricted movement", "Curved side hems for a flattering, athletic silhouette", "Functional zip pocket for small essentials", "Relaxed athletic fit for running, training and everyday wear", "Signature IGNYTE branding on the waistband"], activities: ["Running", "Boxing", "Gym", "HIIT training"], fit: "True to size", fabric: "Outer: 88% polyester, 12% elastane. Inner shorts: 75% polyester, 25% elastane." },
  "Motion Sports Bra": { ...shared, features: ["Criss-cross / X-back strap design", "Breathable mesh panels", "Open-back construction", "Wide supportive underband", "Smooth, stretchy athletic fabric", "Secure, chafe-reducing fit"], activities: ["Running", "Boxing", "Gym", "HIIT training"], fit: "True to size", fabric: "Main: 75% polyester, 25% elastane. Lining: 87% polyester, 13% elastane. Inner mesh: 85% polyamide, 15% elastane." },
  "Sculpt Shorts": { ...shared, features: ["High-waisted crossover / V-waistband design", "Mid-thigh bike short length", "Smooth, compressive stretch fabric", "Flattering waist definition and coverage", "Comfortable support for training", "Chafe-resistant and breathable"], activities: ["Running", "Boxing", "Gym", "HIIT training"], fit: "True to size", fabric: "Main: 75% polyamide, 25% Lycra. Insert mesh: 85% polyamide, 15% elastane." },
  "Seamless Leggings": { ...shared, features: ["Seamless knit construction", "High-waisted design with wide band", "Full-length form-fitting silhouette", "Soft stretch compressive fabric", "Butt lifting support", "Smooth, chafe-free comfort with no digging or rolling", "Supportive hold that stays in place during movement"], activities: ["Gym", "Yoga", "Pilates", "Everyday"], fit: "True to size", fabric: "90% polyamide, 10% elastane" },
  "Seamless Shorts": { ...shared, features: ["Seamless knit construction", "High-waisted design with wide band", "Short-leg, form-fitting silhouette", "Soft stretch compressive fabric", "Butt lifting support", "Smooth, chafe-free comfort with no digging or rolling", "Supportive hold that stays in place during movement"], activities: ["Gym", "Yoga", "Pilates", "Everyday"], fit: "True to size", fabric: "90% polyamide, 10% elastane" },
  "Vyper Sports Bra": { ...shared, features: ["Multi-strap lattice / criss-cross back design", "Open-back construction", "Wide supportive underband", "Soft stretch athletic fabric", "Minimal-seam smooth finish"], activities: ["Running", "Boxing", "Gym", "HIIT training"], fit: "True to size", fabric: "Main: 75% polyester, 25% Lycra. Lining: 87% polyamide, 13% elastane. Insert mesh: 85% polyamide, 15% elastane." },
  "Seamless Sports Bra": { ...shared, oeko_certified: false, features: [], activities: [], fit: "", fabric: "" },
  "IGNYTE Socks": { ...shared, oeko_certified: false, features: [], activities: [], fit: "One size", fabric: "" },
};

export const emptyPdp: PdpContent = { ...shared, oeko_certified: false, features: [], activities: [], fit: "", fabric: "" };
export const homeBestSellerSlugs = ["aura-halter-lavender", "motion-sports-bra-black", "seamless-legging-lavender", "all-in-motion-shorts-black", "vyper-sports-bra-mauve", "sculpt-shorts-mauve"];

export function pdpFor(name: string, content?: Partial<PdpContent> | null, slug?: string): PdpContent {
  const merged = { ...(plannerPdp[name] ?? emptyPdp), featured_best_seller: Boolean(slug && homeBestSellerSlugs.includes(slug)), ...content };
  return {
    ...merged,
    model_details: merged.model_details || (slug ? modelDetailsBySlug[slug] : "") || "",
    video_url: merged.video_url || "/images/home/Ignyte-Vertical-Trimmed-Compressed-Ultra.mp4",
    video_poster: merged.video_poster || "/images/home/Home-Hero-Video-Fallback.jpg",
  };
}

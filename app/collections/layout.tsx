import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activewear Collections | Ignyte Active",
  description: "Explore the Ignyte Active collections by category, including sports bras, tops, leggings, shorts and accessories.",
  alternates: { canonical: "/collections/" },
};

export default function CollectionsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

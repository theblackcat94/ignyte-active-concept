import type { Metadata } from "next";

export const metadata: Metadata = { title: "IGNYTE Previous Homepage", robots: { index: false, follow: false } };

export default function PreviousHomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

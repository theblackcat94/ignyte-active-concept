import type { Metadata } from "next";
import HomeComparison from "./home-comparison";

export const metadata: Metadata = {
  title: "IGNYTE homepage comparison | Review",
  robots: { index: false, follow: false, nocache: true },
};

export default function HomePreviewPage() { return <HomeComparison />; }

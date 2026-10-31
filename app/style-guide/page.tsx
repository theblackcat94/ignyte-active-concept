import type { Metadata } from "next";
import StyleGuide from "@/components/style-guide";

export const metadata: Metadata = {
  title: "IGNYTE Design System | Development",
  description: "Development reference for the IGNYTE visual and interaction system.",
  robots: { index: false, follow: false },
};

export default function Page() { return <StyleGuide />; }

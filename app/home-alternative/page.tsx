import type { Metadata } from "next";
import HomeAlternative from "@/components/home-alternative";

export const metadata: Metadata = { title: "IGNYTE Homepage Alternative Preview", robots: { index: false, follow: false } };
export default function AlternativeHomePage() { return <HomeAlternative />; }

import type { Metadata } from "next";
import JournalView from "@/components/journal-view";
import { journalVisibility } from "@/lib/journal";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const visibility = await journalVisibility();
  return { title: "The IGNYTE Journal", description: "A closer look at the people, products and ideas behind IGNYTE.", robots: visibility === "private" ? { index: false, follow: false } : undefined, alternates: visibility === "public" ? { canonical: "/journal/" } : undefined };
}
export default function JournalPage() { return <JournalView />; }

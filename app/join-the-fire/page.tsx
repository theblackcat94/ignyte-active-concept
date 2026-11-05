import type { Metadata } from "next";
import JoinFireView from "@/components/join-fire-view";
import { readJoinFireSettings } from "@/lib/join-fire-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readJoinFireSettings();
  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    robots: settings.publicEnabled ? undefined : { index: false, follow: false },
    openGraph: { title: settings.seoTitle, description: settings.seoDescription, images: [settings.socialImage] },
  };
}

export default function JoinFirePage() { return <JoinFireView />; }

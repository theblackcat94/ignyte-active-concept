import type { Metadata } from "next";
import FirstFitPromiseView from "@/components/first-fit-promise-view";
import { firstFitPublic } from "@/lib/first-fit-promise";

export const metadata: Metadata = { title: "The First Fit Promise™ | IGNYTE Active", description: "Explore IGNYTE's proposed first-purchase size exchange benefit.", robots: firstFitPublic ? undefined : { index: false, follow: false } };
export default function FirstFitPromisePage() { return <FirstFitPromiseView />; }

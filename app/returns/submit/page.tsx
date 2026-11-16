import type { Metadata } from "next";
import ReturnRequestForm from "@/components/return-request-form";
const standardMetadata: Metadata = { title: "Submit a Return | IGNYTE Active", description: "Send an IGNYTE return request for review and receive a unique return reference." };
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ type?: string }> }): Promise<Metadata> {
  return (await searchParams).type === "first-fit" ? { title: "First Fit Exchange Preview | IGNYTE Active", robots: { index: false, follow: false } } : standardMetadata;
}
export default async function SubmitReturnPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  return <ReturnRequestForm firstFitPreview={type === "first-fit"} />;
}

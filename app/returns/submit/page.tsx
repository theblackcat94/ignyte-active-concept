import type { Metadata } from "next";
import ReturnRequestForm from "@/components/return-request-form";
export const metadata: Metadata = { title: "Submit a Return | IGNYTE Active", description: "Send an IGNYTE return request for review and receive a unique return reference." };
export default function SubmitReturnPage() { return <ReturnRequestForm />; }

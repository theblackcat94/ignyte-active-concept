import { reviewRequestEmail } from "@/lib/email-templates";
import { AdminPageShell } from "@/components/admin-page-shell";
export const metadata = { title: "Review Request Email Preview | IGNYTE", robots: { index: false, follow: false } };
export default function ReviewEmailPreview() {
  const design = reviewRequestEmail("Alex", [{ name: "Aura Halter", color: "Aurora", slug: "aura-halter-aurora" }], process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com");
  return <AdminPageShell title="Review request preview"><p>Design preview only. This email is not scheduled or sent. Sending requires confirmed delivery timestamps and a tested 12-day scheduler.</p><p><strong>Subject:</strong> {design.subject}</p><iframe title="Review request email" srcDoc={design.html} sandbox="" style={{ width: "100%", maxWidth: 650, height: 780, border: "1px solid #ccc" }} /><details><summary>Plain text version</summary><pre style={{ whiteSpace: "pre-wrap" }}>{design.text}</pre></details></AdminPageShell>;
}

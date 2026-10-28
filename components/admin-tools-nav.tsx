import Link from "next/link";

const tools = [
  ["Products", "/admin"], ["Categories", "/admin/categories"],
  ["Orders", "/admin/orders"], ["Analytics", "/admin/analytics"], ["Announcement", "/admin/announcement"],
  ["Promotions", "/admin/promotions"], ["Shipping", "/admin/shipping"],
  ["Size guide", "/admin/size-guide"],
  ["Newsletter", "/admin/marketing"], ["Enquiries", "/admin/support"],
] as const;

export default function AdminToolsNav() {
  return <nav className="admin-tools-nav" aria-label="Admin tools">
    {tools.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
  </nav>;
}

import Link from "next/link";

const tools = [
  ["Products", "/admin"], ["Categories", "/admin/categories"],
  ["Orders", "/admin/orders"], ["Analytics", "/admin/analytics"],
  ["Promotions", "/admin/promotions"], ["Shipping", "/admin/shipping"],
  ["Newsletter", "/admin/marketing"], ["Enquiries", "/admin/support"],
] as const;

export default function AdminToolsNav() {
  return <nav className="admin-tools-nav" aria-label="Admin tools">
    {tools.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
  </nav>;
}

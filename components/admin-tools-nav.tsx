import Link from "next/link";

const tools = [
  ["Products", "/admin"], ["Categories", "/admin/categories"], ["Collections", "/admin/collections"],
  ["Orders", "/admin/orders"], ["Analytics", "/admin/analytics"], ["Announcement", "/admin/announcement"], ["Homepage", "/admin/home-hero"], ["Instagram", "/admin/pdp-social"],
  ["Promotions", "/admin/promotions"], ["Shipping", "/admin/shipping"],
  ["Size guide", "/admin/size-guide"],
  ["Newsletter", "/admin/marketing"], ["JOIN THE FIRE", "/admin/join-fire"], ["Journal", "/admin/journal"], ["Enquiries", "/admin/support"], ["Reviews", "/admin/reviews"], ["Returns", "/admin/returns"],
] as const;

export default function AdminToolsNav() {
  return <nav className="admin-tools-nav" aria-label="Admin tools">
    {tools.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
  </nav>;
}

"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
type Ticket = { id: string; name: string; email: string; order_number: string | null; message: string; status: "open" | "closed"; created_at: string };
export default function SupportAdminPage() {
  const token = useAdminToken(); const [tickets, setTickets] = useState<Ticket[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { if (!token) return; void fetch("/api/admin/support", { headers: adminHeaders(token) }).then(async response => { if (!response.ok) throw Error("Team access required"); setTickets(await response.json()); }).catch(error => setMessage(error.message)); }, [token]);
  async function update(ticket: Ticket) { if (!token) return; const status = ticket.status === "open" ? "closed" : "open"; const response = await fetch("/api/admin/support", { method: "PATCH", headers: adminHeaders(token), body: JSON.stringify({ id: ticket.id, status }) }); if (response.ok) setTickets(current => current.map(item => item.id === ticket.id ? { ...item, status } : item)); else setMessage("Could not update message."); }
  return <AdminPageShell title="Support">{!token && <p>Sign in with a team account.</p>}{message && <p role="status">{message}</p>}<p>Messages submitted through the contact form. Reply using your team email until outbound email is connected.</p>{tickets.map(ticket => <article className="ops-panel" key={ticket.id}><h2>{ticket.name} · {ticket.status.toUpperCase()}</h2><p><a href={`mailto:${ticket.email}`}>{ticket.email}</a> · {new Date(ticket.created_at).toLocaleString("en-AU")}{ticket.order_number && ` · Order ${ticket.order_number}`}</p><p style={{ whiteSpace: "pre-wrap" }}>{ticket.message}</p><button type="button" onClick={() => void update(ticket)}>{ticket.status === "open" ? "MARK CLOSED" : "REOPEN"}</button></article>)}</AdminPageShell>;
}

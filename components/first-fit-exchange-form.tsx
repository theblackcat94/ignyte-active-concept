"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import type { PurchasedItem } from "@/lib/returns";

type Choice = { item: PurchasedItem; sizes: { size: string; available: boolean }[] };

export default function FirstFitExchangeForm() {
  const [orderId, setOrderId] = useState(""); const [email, setEmail] = useState("");
  const [choices, setChoices] = useState<Choice[]>([]); const [selected, setSelected] = useState("");
  const [size, setSize] = useState(""); const [reason, setReason] = useState(""); const [comments, setComments] = useState("");
  const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""); const [reference, setReference] = useState("");
  const requestId = useRef("");
  useEffect(() => {
    const order = new URLSearchParams(location.search).get("order");
    const timer = order ? setTimeout(() => setOrderId(order), 0) : null;
    if (commerceConfigured) void browserDb().auth.getSession().then(({ data }) => setEmail(data.session?.user.email || ""));
    return () => { if (timer) clearTimeout(timer); };
  }, []);
  async function headers(): Promise<Record<string, string>> {
    const session = commerceConfigured ? (await browserDb().auth.getSession()).data.session : null;
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }
  async function lookup() {
    setBusy(true); setMessage(""); setChoices([]); setSelected(""); setSize("");
    try {
      const response = await fetch(`/api/first-fit/requests/?${new URLSearchParams({ order_id: orderId.trim(), email: email.trim() })}`, { headers: await headers(), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "We couldn't verify your order.");
      setChoices(result.choices || []);
      setMessage(result.choices?.length ? "Order verified. Choose the item and replacement size." : "We couldn't find a confirmed full-price item on this order. Contact support if you think this is incorrect.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Order lookup is unavailable."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !selected || !size || !accepted) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/first-fit/requests/", { method: "POST", headers: { ...(await headers()), "Content-Type": "application/json" }, body: JSON.stringify({ client_request_id: requestId.current, order_id: orderId.trim(), order_item_id: selected, email: email.trim(), requested_size: size, reason, comments }) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Your request could not be submitted.");
      setReference(result.reference);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Your request could not be submitted."); }
    finally { setBusy(false); }
  }
  const current = choices.find(choice => choice.item.id === selected);
  return <main className="return-submit-page section-wrap first-fit-request-preview"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/ignyte-fit-guarantee/">THE IGNYTE FIT GUARANTEE</Link><span>/</span><span>REQUEST</span></div>
    {reference ? <section className="return-success" role="status" aria-live="polite"><span className="eyebrow">REQUEST RECEIVED_</span><h1>LET&apos;S GET YOUR FIT RIGHT.</h1><p>We&apos;ve received your IGNYTE Fit Guarantee request.</p><strong>Reference: {reference}</strong><p>Our team will review your details and email you with the next steps. Please don&apos;t return your item until you&apos;ve received our instructions.</p></section>
      : <><span className="eyebrow">THE IGNYTE FIT GUARANTEE™_</span><h1>REQUEST A SIZE EXCHANGE.</h1><p>Sign in with the purchasing account or use the browser where you checked out as a guest. An order number alone cannot open an order.</p>
        <form className="return-form" onSubmit={event => void submit(event)}><fieldset><legend>YOUR ORDER_</legend><div className="return-fields"><label>Order number<input required value={orderId} onChange={event => { setOrderId(event.target.value); setChoices([]); }} /></label><label>Email address<input required type="email" value={email} onChange={event => { setEmail(event.target.value); setChoices([]); }} /></label></div><button type="button" className="return-lookup" disabled={busy} onClick={() => void lookup()}>{busy ? "CHECKING…" : "FIND MY ORDER ↗"}</button></fieldset>
          {choices.length > 0 && <><fieldset><legend>YOUR EXCHANGE_</legend><label>Product and current size<select required value={selected} onChange={event => { setSelected(event.target.value); setSize(""); }}><option value="">Select an item</option>{choices.map(choice => <option value={choice.item.id} key={choice.item.id}>{choice.item.product_name} · {choice.item.colour} · {choice.item.size}</option>)}</select></label>{current && <label>Requested replacement size<select required value={size} onChange={event => setSize(event.target.value)}><option value="">Select another size</option>{current.sizes.map(option => <option key={option.size} value={option.size} disabled={!option.available}>{option.size}{option.available ? "" : " — unavailable"}</option>)}</select></label>}<label>What wasn&apos;t right about the fit?<textarea required minLength={5} maxLength={1000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label><label>Additional comments (optional)<textarea maxLength={3000} rows={3} value={comments} onChange={event => setComments(event.target.value)} /></label></fieldset><label><input required type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> I understand that my request needs approval and that I should wait for instructions before returning the item. My Australian Consumer Law rights are unaffected.</label><button className="button button-orange" disabled={busy || !selected || !size || !accepted}>{busy ? "SENDING REQUEST…" : "REQUEST A SIZE EXCHANGE ↗"}</button></>}
          {message && <p role="alert" className="return-hint">{message}</p>}</form></>}
  </main>;
}

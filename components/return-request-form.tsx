"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { returnReasons, type ReturnItem, type ReturnOrder } from "@/lib/returns";
import "@/app/returns/submit/submit.css";

type EditableItem = ReturnItem & { selected?: boolean };
const blank = (): EditableItem => ({ product_name: "", sku: "", size: "", colour: "", quantity: 1, reason: "Changed my mind" });

export default function ReturnRequestForm() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<ReturnOrder | null>(null); const [items, setItems] = useState<EditableItem[]>([blank()]);
  const [lookupBusy, setLookupBusy] = useState(false); const [lookupMessage, setLookupMessage] = useState("");
  const [comments, setComments] = useState(""); const [accepted, setAccepted] = useState(false);
  const [requestedResolution, setRequestedResolution] = useState<"" | "store_credit" | "original_payment">("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reference, setReference] = useState("");
  const photoRef = useRef<HTMLInputElement>(null); const requestId = useRef("");

  useEffect(() => {
    const number = new URLSearchParams(location.search).get("order");
    if (number) setTimeout(() => setOrderNumber(number), 0);
    if (!commerceConfigured) return;
    void browserDb().auth.getSession().then(({ data }) => {
      if (data.session?.user.email) setEmail(value => value || data.session?.user.email || "");
      const fullName = data.session?.user.user_metadata?.full_name;
      if (typeof fullName === "string") setName(value => value || fullName);
    });
  }, []);

  async function lookup() {
    setLookupBusy(true); setLookupMessage(""); setOrder(null);
    try {
      const session = commerceConfigured ? (await browserDb().auth.getSession()).data.session : null;
      const response = await fetch(`/api/returns/order/?number=${encodeURIComponent(orderNumber.trim())}`, { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) { setLookupMessage(result.error || "Enter the item details below for review."); setItems([blank()]); return; }
      const found = result as ReturnOrder; setOrder(found);
      setName(value => value || found.customer_name); setEmail(value => value || found.customer_email);
      setItems(found.items.map(item => ({ order_item_id: item.id, product_name: item.product_name, sku: item.sku, size: item.size, colour: item.colour, quantity: 1, reason: "Changed my mind", selected: false })));
      setLookupMessage("Order verified. Select each item you want to return.");
    } catch { setLookupMessage("Order lookup is unavailable. Enter the item details below for our team to review."); setItems([blank()]); }
    finally { setLookupBusy(false); }
  }

  function updateItem(index: number, change: Partial<EditableItem>) { setItems(current => current.map((item, position) => position === index ? { ...item, ...change } : item)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const chosen = order ? items.filter(item => item.selected).map(item => ({ order_item_id: item.order_item_id, product_name: item.product_name, sku: item.sku, size: item.size, colour: item.colour, quantity: item.quantity, reason: item.reason })) : items;
    if (!chosen.length) { setError("Select at least one item to return."); return; }
    const statutory = chosen.some(item => ["Product is faulty", "Item arrived damaged", "Received an incorrect item"].includes(item.reason));
    if (!statutory && !requestedResolution) { setError("Choose how you would like to receive your approved item value."); return; }
    const photos = [...(photoRef.current?.files ?? [])];
    if (photos.length > 3 || photos.some(file => file.size > 5_242_880 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Choose up to three JPG, PNG or WebP photos under 5 MB each."); return; }
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const form = new FormData(); form.set("client_request_id", requestId.current); form.set("customer_name", name); form.set("customer_email", email); form.set("order_number", orderNumber); form.set("items", JSON.stringify(chosen)); form.set("comments", comments); form.set("requested_resolution", statutory ? "statutory_remedy" : requestedResolution); form.set("policy_accepted", String(accepted)); form.set("website", (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value || ""); photos.forEach(file => form.append("photos", file));
    setBusy(true); setError("");
    try {
      const session = commerceConfigured ? (await browserDb().auth.getSession()).data.session : null;
      const response = await fetch("/api/returns/", { method: "POST", body: form, headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "We couldn't submit your return. Please try again."); return; }
      setReference(result.reference);
    } catch { setError("We couldn't submit your return. Please try again."); }
    finally { setBusy(false); }
  }

  const chosenItems = order ? items.filter(item => item.selected) : items;
  const statutoryClaim = chosenItems.some(item => ["Product is faulty", "Item arrived damaged", "Received an incorrect item"].includes(item.reason));
  return <main className="return-submit-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/returns/">RETURNS</Link><span>/</span><span>SUBMIT</span></div>
    {reference ? <section className="return-success" role="status" aria-live="polite"><div className="return-success-sparks" aria-hidden="true"><i /><i /><i /><i /></div><span className="eyebrow">REQUEST RECEIVED_</span><h1>WE&apos;VE GOT IT!</h1><p>Thanks for submitting your return request.</p><p>Your return reference is:</p><strong>{reference}</strong><p>Our team will review your request and email you with the next steps.</p><p>Please don&apos;t send your items back until you&apos;ve received our return instructions.</p><Link className="button button-orange" href="/shop/">CONTINUE SHOPPING ↗</Link></section>
    : <><span className="eyebrow">RETURNS &amp; REFUNDS_</span><h1>SUBMIT A RETURN<span>_</span></h1><p className="return-lead">Need to return something? We&apos;ve got you.</p><p>Complete the form below and our team will review your request and email you with the next steps.</p><p>For change-of-mind returns, full-price items must arrive at our returns warehouse within 30 calendar days of purchase, unworn, unused, unwashed and with tags attached. Sale items are final sale for change-of-mind returns. Customers pay return postage. Faulty or incorrect items are assessed separately under Australian Consumer Law. <Link href="/returns/">Read the full Returns &amp; Refunds Policy.</Link></p>
      <form className="return-form" onSubmit={event => void submit(event)}><fieldset><legend>YOUR DETAILS_</legend><div className="return-fields"><label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Order number<input required maxLength={100} value={orderNumber} onChange={event => { setOrderNumber(event.target.value); setOrder(null); setItems([blank()]); setLookupMessage(""); }} /></label></div><button className="return-lookup" type="button" onClick={() => void lookup()} disabled={lookupBusy || !orderNumber.trim()}>{lookupBusy ? "CHECKING ORDER…" : "FIND MY ORDER ↗"}</button>{lookupMessage && <p role="status" className="return-hint">{lookupMessage}</p>}</fieldset>
        <fieldset><legend>YOUR RETURN_</legend>{order ? <div className="return-items">{items.map((item, index) => <div className="return-item" key={item.order_item_id}><label className="return-item-select"><input type="checkbox" checked={Boolean(item.selected)} onChange={event => updateItem(index, { selected: event.target.checked })} /><strong>{item.product_name} · {item.colour} · {item.size}</strong></label><p>Purchased quantity: {order.items[index].quantity}{order.items[index].sale_at_purchase === true ? " · Purchased on sale: final sale for change-of-mind returns" : order.items[index].sale_at_purchase === null ? " · Sale status will be checked by our team" : ""}</p>{item.selected && <div className="return-fields"><label>Quantity<input type="number" min={1} max={order.items[index].quantity} value={item.quantity} onChange={event => updateItem(index, { quantity: Number(event.target.value) })} /></label><label>Reason for return<select value={item.reason} onChange={event => updateItem(index, { reason: event.target.value as ReturnItem["reason"] })}>{returnReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label></div>}</div>)}</div>
        : <><p className="return-hint">Can&apos;t verify the order here? Enter each item as it appears on your order confirmation. Our team will check it before providing instructions.</p>{items.map((item, index) => <div className="return-item" key={index}><div className="return-item-heading"><strong>ITEM {index + 1}</strong>{items.length > 1 && <button type="button" onClick={() => setItems(current => current.filter((_, position) => position !== index))}>REMOVE</button>}</div><div className="return-fields"><label>Product<input required value={item.product_name} onChange={event => updateItem(index, { product_name: event.target.value })} /></label><label>Size<input required value={item.size} onChange={event => updateItem(index, { size: event.target.value })} /></label><label>Colour<input required value={item.colour} onChange={event => updateItem(index, { colour: event.target.value })} /></label><label>Quantity<input required type="number" min={1} max={20} value={item.quantity} onChange={event => updateItem(index, { quantity: Number(event.target.value) })} /></label><label>Reason for return<select value={item.reason} onChange={event => updateItem(index, { reason: event.target.value as ReturnItem["reason"] })}>{returnReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label></div></div>)}<button className="return-lookup" type="button" onClick={() => setItems(current => [...current, blank()])} disabled={items.length >= 20}>ADD ANOTHER ITEM +</button></>}</fieldset>
        <fieldset><legend>HOW WOULD YOU LIKE YOUR REFUND?_</legend>{statutoryClaim ? <p>Faulty, damaged or incorrect items are assessed under Australian Consumer Law. Our team will discuss the appropriate remedy with you; the change-of-mind options below do not limit your rights.</p> : <><p>For eligible full-price change-of-mind returns, choose how you would like to receive the approved item value.</p><div className="return-resolution-options"><label><input type="radio" name="return-resolution" checked={requestedResolution === "store_credit"} onChange={() => setRequestedResolution("store_credit")} /><span><strong>Store Credit</strong>Receive IGNYTE store credit after inspection and approval. Credit terms will be confirmed before issue.</span></label><label><input type="radio" name="return-resolution" checked={requestedResolution === "original_payment"} onChange={() => setRequestedResolution("original_payment")} /><span><strong>Original Payment Refund</strong>Receive the approved item value back to your original payment method.</span></label></div><p className="return-hint">All change-of-mind returns are subject to inspection and approval. Original shipping charges are non-refundable, and customers pay return postage.</p></>}</fieldset>
        <fieldset><legend>ADDITIONAL DETAILS_</legend><label>Comments (optional)<textarea value={comments} maxLength={3000} rows={4} onChange={event => setComments(event.target.value)} /></label><label>Photos (optional, up to three JPG, PNG or WebP files, 5 MB each)<input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" multiple /></label><input className="return-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" /></fieldset>
        <section className="return-before"><h2>BEFORE YOU SUBMIT_</h2><p>For change-of-mind returns, full-price items must arrive within 30 days of purchase, unworn, unused, unwashed, with tags attached and proof of purchase. You pay return postage; original delivery charges are non-refundable. Sale merchandise is final sale for change-of-mind returns. These conditions do not limit Australian Consumer Law rights for faulty, damaged, incorrect or misdescribed items.</p><label><input required type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> I have read and understand the <Link href="/returns/">Returns &amp; Refunds Policy</Link>.</label></section>
        {error && <p className="return-error" role="alert">{error}</p>}<button className="button button-orange" type="submit" disabled={busy}>{busy ? "SUBMITTING REQUEST…" : "SUBMIT RETURN REQUEST ↗"}</button></form></>}
  </main>;
}

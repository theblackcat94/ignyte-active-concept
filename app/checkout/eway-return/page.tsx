import Link from "next/link";
import EwayPaymentResult from "./payment-result";
import "../checkout.css";

export default async function EwayReturnPage({ searchParams }: {
  searchParams: Promise<{ AccessCode?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  return <div className="checkout-page section-wrap checkout-confirmation">
    <span className="eyebrow">IGNYTE / CHECKOUT</span>
    {params.cancelled === "1" ? <><h1>PAYMENT CANCELLED<span>.</span></h1>
      <div className="checkout-panel"><p>No card payment was completed. Your bag is still here if you want to continue.</p>
        <Link className="button button-dark" href="/checkout/">RETURN TO CHECKOUT ↗</Link></div></>
      : <EwayPaymentResult accessCode={params.AccessCode ?? ""} />}
  </div>;
}

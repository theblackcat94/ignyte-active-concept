"use client";

import { useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import "../account.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await browserDb().auth.updateUser({ password });
    setMessage(error ? error.message : "Password updated. You can return to your account.");
    setPassword("");
  }
  return <div className="account-page section-wrap"><h1>RESET PASSWORD<span>.</span></h1>{commerceConfigured ? <form className="account-form" onSubmit={submit}><label>NEW PASSWORD<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button button-orange">UPDATE PASSWORD</button></form> : <p>Accounts are not configured yet.</p>}{message && <p role="status">{message}</p>}<Link href="/account" className="text-link">BACK TO ACCOUNT ↗</Link></div>;
}

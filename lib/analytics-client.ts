export function track(eventName: "add_to_bag" | "checkout_started", path: string) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  void fetch("/api/analytics", {
    method: "POST", credentials: "omit", keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, path }),
  }).catch(() => {});
}

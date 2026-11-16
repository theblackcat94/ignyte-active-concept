// Run by the private systemd timer. The app applies the same delivery and
// consent checks before enrolling or sending any customer message.
if (process.env.POST_PURCHASE_EMAIL_DELIVERY_ENABLED !== "true") process.exit(0);
if (!process.env.POST_PURCHASE_CRON_SECRET || !process.env.POST_PURCHASE_ALLOWED_DELIVERY_SOURCE) {
  console.error("Post-purchase delivery is enabled without its required configuration");
  process.exit(1);
}

const response = await fetch("http://127.0.0.1:3210/api/post-purchase/run/", {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.POST_PURCHASE_CRON_SECRET}` },
  signal: AbortSignal.timeout(60_000),
});
if (!response.ok) {
  console.error(`Post-purchase job failed with HTTP ${response.status}`);
  process.exit(1);
}
const result = await response.json();
console.log(`Post-purchase jobs: enrolled=${result.enrolled} sent=${result.sent} suppressed=${result.suppressed} failed=${result.failed}`);

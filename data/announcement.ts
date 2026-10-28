export type Announcement = { mode: "static" | "ticker"; text: string; action: string; href: string; theme: "dark" | "orange" };

// The live message stays unchanged until the Black Friday promotion is approved.
// Edit these settings in one place; preview the draft with ?announcement=black-friday.
export const liveAnnouncement: Announcement = { mode: "static", text: "MOVE WITH PURPOSE. TRAIN WITH FIRE.", action: "", href: "/shop", theme: "dark" };
export const blackFridayPreview: Announcement = { mode: "ticker", text: "UP TO 50% OFF", action: "SHOP BLACK FRIDAY", href: "/shop", theme: "orange" };

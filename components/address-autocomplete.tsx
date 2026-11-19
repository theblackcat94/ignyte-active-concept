"use client";

import { useEffect, useRef, useState } from "react";

type Address = { line1: string; line2: string; city: string; state: string; postal_code: string };
type AddressComponent = { types: string[]; longText: string; shortText: string };
type Place = { addressComponents?: AddressComponent[]; fetchFields: (options: { fields: string[] }) => Promise<void> };
type SelectionEvent = Event & { placePrediction: { toPlace: () => Place } };
type AutocompleteElement = HTMLElement & { includedRegionCodes: string[]; placeholder: string };
type MapsWindow = Window & {
  __ignyteMapsReady?: () => void;
  google?: { maps: { importLibrary: (name: string) => Promise<{ PlaceAutocompleteElement: new () => AutocompleteElement }> } };
};

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
let mapsScript: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (mapsScript) return mapsScript;
  mapsScript = new Promise<void>((resolve, reject) => {
    const browser = window as MapsWindow;
    if (browser.google?.maps?.importLibrary) { resolve(); return; }
    const script = document.createElement("script");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      delete browser.__ignyteMapsReady;
      if (error) { script.remove(); reject(error); }
      else resolve();
    };
    const timeout = window.setTimeout(() => finish(new Error("Maps load timed out")), 15000);
    browser.__ignyteMapsReady = () => browser.google?.maps?.importLibrary
      ? finish()
      : finish(new Error("Maps did not initialise"));
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey ?? "")}&v=weekly&loading=async&libraries=places&callback=__ignyteMapsReady`;
    script.async = true;
    script.onerror = () => finish(new Error("Maps could not load"));
    document.head.appendChild(script);
  }).catch(error => { mapsScript = null; throw error; });
  return mapsScript;
}

function australianAddress(components: AddressComponent[]): Address | null {
  const part = (type: string) => components.find(component => component.types.includes(type));
  if (part("country")?.shortText !== "AU") return null;
  const line1 = [part("street_number")?.longText, part("route")?.longText].filter(Boolean).join(" ").trim()
    || part("street_address")?.longText || "";
  const city = part("locality")?.longText || part("postal_town")?.longText || part("sublocality_level_1")?.longText || "";
  const state = part("administrative_area_level_1")?.shortText || "";
  const postal_code = part("postal_code")?.longText || "";
  if (!line1 || !city || !["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].includes(state) || !/^\d{4}$/.test(postal_code)) return null;
  return { line1, line2: part("subpremise")?.longText || "", city, state, postal_code };
}

export default function AddressAutocomplete({ onSelect }: { onSelect: (address: Address) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!apiKey) return;
    let active = true;
    let widget: AutocompleteElement | null = null;
    const select = async (event: Event) => {
      try {
        const place = (event as SelectionEvent).placePrediction.toPlace();
        await place.fetchFields({ fields: ["addressComponents"] });
        if (!active) return;
        const address = australianAddress(place.addressComponents ?? []);
        if (address) { onSelect(address); setMessage("Address filled. Check the unit, suburb and postcode below."); }
        else setMessage("Please enter this address in the fields below.");
      } catch { if (active) setMessage("Address lookup failed. Please enter the address below."); }
    };
    void loadMaps().then(async () => {
      const { PlaceAutocompleteElement } = await (window as MapsWindow).google!.maps.importLibrary("places");
      if (!active || !host.current) return;
      widget = new PlaceAutocompleteElement();
      widget.includedRegionCodes = ["au"];
      widget.placeholder = "Start typing your Australian address";
      widget.addEventListener("gmp-select", select);
      host.current.appendChild(widget);
    }).catch(() => { if (active) setMessage("Address search is unavailable. Please enter the address below."); });
    return () => {
      active = false;
      widget?.removeEventListener("gmp-select", select);
      widget?.remove();
    };
  }, [onSelect]);

  if (!apiKey) return null;
  return <div className="checkout-address-search"><label>FIND YOUR ADDRESS</label><div ref={host} />
    <small>Choose a suggestion, then check or edit the address fields below.</small>
    {message && <small role="status">{message}</small>}</div>;
}

"use client";

type EwayModalResult = "Complete" | "Cancel" | "Error";
type EwayModal = {
  showModalPayment: (
    config: { sharedPaymentUrl: string },
    callback: (result: EwayModalResult, transactionId?: string, errors?: string) => void,
  ) => void;
};

declare global {
  interface Window { eCrypt?: EwayModal }
}

let scriptPromise: Promise<EwayModal> | null = null;

export function loadEwayModal(): Promise<EwayModal> {
  if (window.eCrypt?.showModalPayment) return Promise.resolve(window.eCrypt);
  if (!scriptPromise) {
    scriptPromise = new Promise<EwayModal>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://secure.ewaypayments.com/scripts/eCrypt.min.js";
      script.async = true;
      script.onload = () => window.eCrypt?.showModalPayment
        ? resolve(window.eCrypt) : reject(new Error("eWAY payment form did not load."));
      script.onerror = () => reject(new Error("eWAY payment form could not be loaded."));
      document.head.appendChild(script);
    }).catch(error => { scriptPromise = null; throw error; });
  }
  return scriptPromise;
}

export function openEwayModal(modal: EwayModal, url: string, accessCode: string): Promise<"complete" | "cancelled" | "error"> {
  if (!accessCode || !url.startsWith("https://")) throw new Error("Invalid payment page.");
  return new Promise((resolve, reject) => {
    try {
      modal.showModalPayment({ sharedPaymentUrl: url }, result => {
        if (result === "Complete") resolve("complete");
        else if (result === "Cancel") resolve("cancelled");
        else resolve("error");
      });
    } catch (error) { reject(error); }
  });
}

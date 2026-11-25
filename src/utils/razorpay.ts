export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export type UpiFlow = "intent" | "qr" | "collect";

export interface RazorpayDisplayInstrument {
  method: "upi" | "card" | "netbanking" | "wallet";
  flows?: UpiFlow[];
  apps?: string[];
  banks?: string[];
}

export interface RazorpayDisplayConfig {
  display?: {
    blocks?: Record<
      string,
      { name: string; instruments: RazorpayDisplayInstrument[] }
    >;
    sequence?: string[];
    preferences?: { show_default_blocks?: boolean };
    hide?: Array<Record<string, unknown>>;
  };
}

export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
  /** Pre-selects a payment method. Requires `email` and `contact` to be set. */
  method?: "card" | "netbanking" | "wallet" | "upi" | "emi";
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    hide_topbar?: boolean;
  };
  config?: RazorpayDisplayConfig;
  retry?: {
    enabled: boolean;
    max_count: number;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

/**
 * Loads the Razorpay checkout script if not already present.
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById("razorpay-checkout-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

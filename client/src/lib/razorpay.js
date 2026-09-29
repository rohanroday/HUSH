// Loads Razorpay Checkout once, on demand, the first time someone pays.
const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return loading;
}

// Opens the checkout modal and settles with how it ended:
// { status: "paid", response } | { status: "dismissed", lastError }.
// A failed attempt keeps the modal open so the buyer can retry another method.
export async function openCheckout({ keyId, razorpayOrderId, amount, currency, prefill, description }) {
  const Razorpay = await loadRazorpay();
  return new Promise((resolve) => {
    let lastError = null;
    const rzp = new Razorpay({
      key: keyId,
      order_id: razorpayOrderId,
      amount,
      currency,
      name: "HUSH",
      description,
      prefill,
      theme: { color: "#151411" },
      handler: (response) => resolve({ status: "paid", response }),
      modal: {
        ondismiss: () => resolve({ status: "dismissed", lastError }),
        confirm_close: true,
      },
    });
    rzp.on("payment.failed", (event) => {
      lastError = event.error?.description || "The payment didn't go through.";
    });
    rzp.open();
  });
}

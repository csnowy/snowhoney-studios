// js/checkout.js
console.log('checkout.js loaded');

window.goCheckout = async function goCheckout(){
  try {
    const payload = {
      pkg: window.state.pkg,
      hosting: window.state.hosting || 'self',
      domains: window.state.domains || [],
      email: window.state.brief?.contactEmail || '',
      businessName: window.state.brief?.businessName || ''
    };

    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    const paymentError = document.getElementById("paymentError");

    if(!res.ok){
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text.slice(0,200)}`);
    }

    let data;
    try { data = await res.json(); }
    catch(e){ throw new Error('Response was not JSON. Is your API returning JSON?'); }

    const { sessionId, publishableKey, error } = data;
    if(error) throw new Error(error);
    if(!sessionId) throw new Error('No sessionId returned from server.');
    if(!publishableKey) throw new Error('No publishableKey returned from server.');

    const stripe = Stripe(publishableKey);
    const { error: redirectErr } = await stripe.redirectToCheckout({ sessionId });
    if(redirectErr) throw redirectErr;

  } catch(err){
    console.error('Stripe error:', err);
    const paymentError = document.getElementById("paymentError");
    if(paymentError){
      paymentError.textContent = "❌ Payment could not be started. Please try again.";
      paymentError.classList.remove("hidden");
    } else {
      alert("❌ Payment could not be started. Please try again.");
    }
  }
};

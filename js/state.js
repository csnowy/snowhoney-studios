// js/state.js
// Global state and shared helpers
window.state = {
  pkg: null,
  price: 0,
  brief: {},
  hosting: null,
  hostingPrice: 0,
  domains: []
};

window.TAX_RATES = {
  AB: 0.05, BC: 0.12, MB: 0.12, NB: 0.15, NL: 0.15, NS: 0.15,
  NT: 0.05, NU: 0.05, ON: 0.13, PE: 0.15, QC: 0.14975, SK: 0.11, YT: 0.05
};

window.updateSummary = function updateSummary() {
  const sumPackage = document.getElementById('sumPackage');
  const sumHosting = document.getElementById('sumHosting');
  const sumPrice   = document.getElementById('sumPrice');
  const sumTax     = document.getElementById('sumTax');
  const sumTotal   = document.getElementById('sumTotal');
  const sumBusiness= document.getElementById('sumBusiness');
  const province = window.state.brief?.province || 'SK'; // default SK if none
  const rate = window.TAX_RATES[province] || 0.05;

  if(!sumPackage) return; // payment UI not mounted yet

  sumBusiness.textContent = window.state.brief?.businessName || '—';
  sumPackage.textContent  = window.state.pkg || '—';

  const hostingLabel = window.state.hosting
    ? `${window.state.hosting}${window.state.hostingPrice ? ` ($${window.state.hostingPrice}/mo)` : ''}`
    : 'Self-hosting';
  sumHosting.textContent = hostingLabel;

  sumPrice.textContent = `$${(window.state.price || 0).toLocaleString()} CAD`;

  // charge today: one-time package + first hosting month (if any)
  const todayDue = (window.state.price || 0) + (window.state.hostingPrice || 0);
  const tax = +(todayDue * rate).toFixed(2);
  const total = +(todayDue + tax).toFixed(2);

  sumTax.textContent   = `$${tax.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
  sumTotal.textContent = `$${total.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
};

window.togglePlanFields = function togglePlanFields(plan) {
  // keep same IDs used in HTML
  const twoPageFields = document.getElementById("twoPageFields");
  const threePageFields = document.getElementById("threePageFields");
  if (twoPageFields) twoPageFields.classList.add("hidden");
  if (threePageFields) threePageFields.classList.add("hidden");

  if (plan === "Two-Page Site") {
    twoPageFields?.classList.remove("hidden");
  }
  if (plan === "Three-Page Site") {
    twoPageFields?.classList.remove("hidden");
    threePageFields?.classList.remove("hidden");
  }
};

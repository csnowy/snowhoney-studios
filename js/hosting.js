// js/hosting.js
console.log('hosting.js loaded');

// selectHosting(plan, monthlyPrice, el) - used in HTML onclicks
window.selectHosting = function selectHosting(plan, monthlyPrice, el) {
  window.state.hosting = plan;
  window.state.hostingPrice = monthlyPrice || 0;

  // remove selected from hosting-option cards & small secondary buttons to keep visuals consistent
  document.querySelectorAll('.hosting-option, .btn.secondary.small').forEach(btn => btn.classList.remove('selected'));
  el?.classList.add('selected');

  const domainInputs = document.getElementById("domainInputs");
  if (!domainInputs) return;

  if (plan === 'self') {
    // No domains needed — hide inputs, set domains empty, update summary
    domainInputs.classList.add("hidden");
    window.state.domains = [];
    window.updateSummary();
    // optionally scroll to payment block or auto-open payment
    const paymentBlock = document.getElementById('payment');
    if(paymentBlock) paymentBlock.classList.remove('hidden');
  } else {
    // Managed hosting — show domain inputs
    domainInputs.classList.remove("hidden");
    // focus first field for convenience
    document.querySelector('input[name="domain1"]')?.focus();
  }
};

// confirmDomains() - called by Done → button in UI
window.confirmDomains = function confirmDomains(){
  const d1El = document.querySelector('input[name="domain1"]');
  const d2El = document.querySelector('input[name="domain2"]');
  const d3El = document.querySelector('input[name="domain3"]');

  const d1 = d1El?.value.trim();
  const d2 = d2El?.value.trim();
  const d3 = d3El?.value.trim();

  if (!d1) {
    d1El.setCustomValidity("Please enter at least one domain.");
    d1El.reportValidity();
    d1El.setCustomValidity("");
    return;
  }

  window.state.domains = [d1, d2, d3].filter(Boolean);

  // Show payment and update summary
  const paymentBlock = document.getElementById('payment');
  if(paymentBlock) paymentBlock.classList.remove('hidden');
  window.updateSummary();
};

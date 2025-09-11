// State
const state = { pkg: null, price: 0, brief: {} };

// Mobile menu toggle
const btn = document.querySelector('.menu-btn');
const menu = document.getElementById('mobileMenu');
btn?.addEventListener('click', () => {
    menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', menu.classList.contains('hidden') ? 'false' : 'true');
});
// Close menu when a link is clicked
menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.add('hidden');
    btn?.setAttribute('aria-expanded','false');
}));

// Year
document.getElementById('y').textContent = new Date().getFullYear();

// Order flow
function startOrder(name, price){
  state.pkg = name; 
  state.price = price;

  const briefSection = document.getElementById('brief');
  const paymentEl = document.getElementById('payment');

  briefSection.classList.remove('hidden');
  paymentEl?.classList.add('hidden');   // ← null-safe

  // Let layout paint, then scroll
  setTimeout(() => {
    briefSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}



function submitBrief(){
  const form = document.getElementById('briefForm');
  if(!form.reportValidity()) return;

  const data = new FormData(form);
  state.brief = Object.fromEntries(data.entries());

  // If payment UI exists, pre-fill it (no crash if it doesn't)
  updateSummary();

  // Show Hosting choices
  const hostBlock = document.getElementById('hostingBlock');
  hostBlock.classList.remove('hidden');
  hostBlock.scrollIntoView({behavior:"smooth"});
}



function goCheckout(){
    const hosting = (document.querySelector('input[name="hosting"]:checked')||{}).value || 'none';
    const payload = {
      pkg: state.pkg,
      hosting: state.hosting || 'self',
      domains: state.domains || [],
      email: state.brief?.contactEmail || '',
      businessName: state.brief?.businessName || '',
      brief: state.brief   // include everything
    };
    // In production, POST this payload to your server then redirect to Stripe Checkout.
    alert('Demo checkout data:\n'+JSON.stringify(payload, null, 2));
    // window.location.href = '/checkout'; // placeholder redirect
}

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  document.querySelector(".scroll-bg").style.backgroundPositionY = `${-scrollY * 0.3}px`;
});

// Toggle selling online section
const sellingCheckbox = document.getElementById("sellingCheckbox");
const sellingSection = document.getElementById("sellingSection");

sellingCheckbox?.addEventListener("change", () => {
  if (sellingCheckbox.checked) {
    sellingSection.classList.remove("hidden");
  } else {
    sellingSection.classList.add("hidden");
  }
});

document.getElementById("briefForm").addEventListener("submit", (e) => {
  const logoFiles = [...document.querySelector('input[name="logos"]').files];
  const imageFiles = [...document.querySelector('input[name="images"]').files];
  const allFiles = [...logoFiles, ...imageFiles];

  const maxSize = 5 * 1024 * 1024; // 5 MB per file
  const totalMax = 20 * 1024 * 1024; // 20 MB total
  let totalSize = 0;

  for (let file of allFiles) {
    if (file.size > maxSize) {
      e.preventDefault();
      alert(`File "${file.name}" is too large. Max 5MB per file.`);
      return;
    }
    totalSize += file.size;
  }

  if (totalSize > totalMax) {
    e.preventDefault();
    alert("Total file uploads exceed 20MB. Please reduce file sizes.");
    return;
  }
});

function addRow() {
  const tbody = document.getElementById("itemsTableBody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input name="item[]" placeholder="e.g., Another Service" maxlength="100" /></td>
    <td><input name="cost[]" placeholder="$100" maxlength="20" /></td>
  `;
  tbody.appendChild(row);
}

// Work carousel scrolling
document.querySelectorAll(".work-carousel").forEach(carousel => {
  const track = carousel.querySelector(".work-track");
  const leftBtn = carousel.querySelector(".work-arrow.left");
  const rightBtn = carousel.querySelector(".work-arrow.right");

  let index = 0;

  const updateScroll = () => {
    const item = track.querySelector(".shot");
    if (!item) return;
    const itemWidth = item.getBoundingClientRect().width; // includes padding
    track.style.transform = `translateX(${-index * itemWidth}px)`;

    // Disable arrows
    leftBtn.disabled = index === 0;
    const maxIndex = track.children.length - 2; // 2 visible
    rightBtn.disabled = index >= maxIndex;
  };

  leftBtn.addEventListener("click", () => {
    if (index > 0) { index--; updateScroll(); }
  });

  rightBtn.addEventListener("click", () => {
    const maxIndex = track.children.length - 2;
    if (index < maxIndex) { index++; updateScroll(); }
  });

  window.addEventListener("resize", updateScroll);
  updateScroll();
});

function selectHosting(plan, monthlyPrice, el){
  state.hosting = plan;
  state.hostingPrice = monthlyPrice;

  // Highlight selection
  document.querySelectorAll('.hosting-option, .btn.secondary.small')
    .forEach(btn => btn.classList.remove('selected'));
  el?.classList.add('selected');

  const domainInputs = document.getElementById("domainInputs");
  const paymentEl = document.getElementById('payment');

  if(plan === 'self'){
    // No domains needed — hide inputs, go straight to payment
    domainInputs.classList.add("hidden");
    state.domains = [];
    paymentEl.classList.remove('hidden');
    updateSummary();
    paymentEl.scrollIntoView({behavior:"smooth"});
  } else {
    // Managed hosting — show domain inputs, hide payment until Done
    paymentEl.classList.add('hidden');
    domainInputs.classList.remove("hidden");
    // focus first field for convenience
    document.querySelector('input[name="domain1"]')?.focus();
  }
}

function confirmDomains(){
  const d1El = document.querySelector('input[name="domain1"]');
  const d2El = document.querySelector('input[name="domain2"]');
  const d3El = document.querySelector('input[name="domain3"]');

  const d1 = d1El?.value.trim();
  const d2 = d2El?.value.trim();
  const d3 = d3El?.value.trim();

  // Require at least the first domain
  if(!d1){
    // Use native validity UI if possible
    if(d1El?.reportValidity){
      d1El.setCustomValidity('Please enter at least one domain.');
      d1El.reportValidity();
      d1El.setCustomValidity('');
    } else {
      alert('Please enter at least one domain.');
      d1El?.focus();
    }
    return;
  }

  state.domains = [d1, d2, d3].filter(Boolean);

  // Now show payment & update summary
  const paymentEl = document.getElementById('payment');
  paymentEl.classList.remove('hidden');
  updateSummary();
  paymentEl.scrollIntoView({behavior:"smooth"});
}



async function goCheckout(){
  try {
    const payload = {
      pkg: state.pkg,
      hosting: state.hosting || 'self',
      domains: state.domains || [],
      email: state.brief?.contactEmail || '',
      businessName: state.brief?.businessName || ''
    };

    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

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
    alert('Stripe checkout failed:\n' + (err?.message || err));
  }
}

const TAX_RATE = 0.11; // adjust per province as needed

function updateSummary(){
  const sumPackage = document.getElementById('sumPackage');
  const sumHosting = document.getElementById('sumHosting');
  const sumPrice   = document.getElementById('sumPrice');
  const sumTax     = document.getElementById('sumTax');
  const sumTotal   = document.getElementById('sumTotal');
  const sumBusiness= document.getElementById('sumBusiness');

  if(!sumPackage) return; // payment UI not mounted yet

  sumBusiness.textContent = state.brief?.businessName || '—';
  sumPackage.textContent  = state.pkg || '—';

  const hostingLabel = state.hosting
    ? `${state.hosting}${state.hostingPrice ? ` ($${state.hostingPrice}/mo)` : ''}`
    : 'Self-hosting';
  sumHosting.textContent = hostingLabel;

  sumPrice.textContent = `$${state.price.toLocaleString()} CAD`;

  // charge today: one-time package + first hosting month (if any)
  const todayDue = (state.price || 0) + (state.hostingPrice || 0);
  const tax = +(todayDue * TAX_RATE).toFixed(2);
  const total = +(todayDue + tax).toFixed(2);

  sumTax.textContent   = `$${tax.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
  sumTotal.textContent = `$${total.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
}

function togglePlanFields(plan) {
  document.getElementById("twoPageFields").classList.add("hidden");
  document.getElementById("threePageFields").classList.add("hidden");

  if (plan === "Two-Page Site") {
    document.getElementById("twoPageFields").classList.remove("hidden");
  }
  if (plan === "Three-Page Site") {
    document.getElementById("twoPageFields").classList.remove("hidden");
    document.getElementById("threePageFields").classList.remove("hidden");
  }
}

// Contact form submission
const contactForm = document.getElementById("contactForm");
contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch("/.netlify/functions/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await res.text());

    alert("✅ Thank you! Your message has been sent. We'll reply soon.");
    contactForm.reset();
  } catch (err) {
    console.error(err);
    alert("❌ Sorry, something went wrong sending your message. Please try again later.");
  }
});

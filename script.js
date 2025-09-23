// State
const state = { pkg: null, price: 0, brief: {} };
let currentStep = 0;
const wizardSteps = ["wizard-step-brief", "wizard-step-hosting", "wizard-step-payment"];

function openWizard() {
  const wizard = document.getElementById("orderWizard");
  wizard.classList.remove("hidden");
  wizard.classList.add("show");
  document.body.classList.add("modal-open");
  currentStep = 0;
  showWizardStep(currentStep);
}

function closeWizard() {
  const wizard = document.getElementById("orderWizard");
  wizard.classList.remove("show");
  wizard.classList.add("hidden");
  document.body.classList.remove("modal-open");
  resetHostingStep();
}

function showWizardStep(index) {
  wizardSteps.forEach((id, i) => {
    document.getElementById(id).classList.toggle("hidden", i !== index);
  });
}

function nextWizardStep() {
  if (currentStep < wizardSteps.length - 1) {
    currentStep++;
    showWizardStep(currentStep);
  }
}

function prevWizardStep() {
  if (currentStep > 0) {
    // If we're at payment step and pkg = Mockup, jump back to brief
    if (state.pkg === "Mockup Only" && currentStep === 2) {
      currentStep = 0; // brief step
      showWizardStep(currentStep);
    } else {
      currentStep--;
      showWizardStep(currentStep);
    }

    // Reset Stripe checkout button if backing out of payment
    if (wizardSteps[currentStep + 1] === "wizard-step-payment") {
      const payBtn = document.querySelector('#wizard-step-payment .btn.primary');
      if (payBtn) {
        payBtn.textContent = "Pay with Stripe →";
        payBtn.disabled = false;
      }
    }
  }
}

function resetHostingStep() {
  // Hide domain area + all its blocks
  const blocks = ["domainInputs","basicDomainBlock","multiDomainBlock","ownDomainBlock"];
  blocks.forEach(id => document.getElementById(id)?.classList.add("hidden"));

  // Clear previous highlight
  document.querySelectorAll("#wizard-step-hosting .selected")
    .forEach(el => el.classList.remove("selected"));

  // Put both option groups into a known state
  const normal = document.getElementById("normalHostingOptions");
  const upgrade = document.getElementById("upgradeHostingOptions");
  normal?.classList.remove("show"); normal?.classList.add("hidden");
  upgrade?.classList.remove("show"); upgrade?.classList.add("hidden");

  // Hide the “stick with Basic” row by default
  document.getElementById("stickWithBasicWrap")?.classList.add("hidden");
}

function syncHostingUIFromState() {
  const hide = id => document.getElementById(id)?.classList.add("hidden");
  const show = id => document.getElementById(id)?.classList.remove("hidden");

  ["domainInputs","basicDomainBlock","multiDomainBlock","ownDomainBlock"].forEach(hide);

  if (state.hosting === "Basic Hosting") {
    show("domainInputs"); show("basicDomainBlock");
  } else if (state.hosting === "Boost Hosting" || state.hosting === "Dominate Hosting") {
    show("domainInputs"); show("multiDomainBlock");
  }
}

const originalShowWizardStep = showWizardStep;
showWizardStep = function(index){
  originalShowWizardStep(index);
  if (wizardSteps[index] === "wizard-step-hosting") {
    syncHostingUIFromState(); // <-- NEW
  }
};

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
function startOrder(name, price) {
  state.pkg = name; 
  state.price = price;
  openWizard();


  resetHostingStep();

  const hostingTitle = document.getElementById("hostingTitle");
  const hostingSubtitle = document.getElementById("hostingSubtitle");
  const normalOpts = document.getElementById("normalHostingOptions");   // whole block
  const upgradeOpts = document.getElementById("upgradeHostingOptions"); // whole block

  if (name === "Two-Page Site" || name === "Three-Page Site") {
  normalOpts.classList.add("hidden");
  normalOpts.classList.remove("show");

  upgradeOpts.classList.remove("hidden");
  upgradeOpts.classList.add("show");

  document.getElementById("stickWithBasicWrap").classList.remove("hidden");

  hostingTitle.textContent = "Upgrade Hosting";
  hostingSubtitle.textContent =
    "Your package includes a free trial of Basic Hosting! You can upgrade to Boost or Dominate below if you'd like, or stick with Basic.";
  } else {
    normalOpts.classList.remove("hidden");
    normalOpts.classList.add("show");

    upgradeOpts.classList.remove("show");
    upgradeOpts.classList.add("hidden");

    hostingTitle.textContent = "Choose Hosting";
    hostingSubtitle.textContent =
      "Select one of our managed hosting plans, or self-host if you prefer.";
  }

  openWizard();
}

function stickWithBasic() {
  state.hosting = "Basic Hosting";
  state.hostingPrice = 0; // free trial during package

  // highlight selection
  document.querySelectorAll(".hosting-option").forEach(b => b.classList.remove("selected"));
  document.getElementById("stickWithBasicWrap").querySelector("button").classList.add("selected");

  // Show multi-domain block (same as Boost/Dominate flow)
  document.getElementById("domainInputs").classList.remove("hidden");
  document.getElementById("basicDomainBlock").classList.remove("hidden");
}

function submitBrief(){
  const form = document.getElementById('briefForm');
  if(!form.reportValidity()) {
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus({ preventScroll: true });
    }
    return;
  }

  const data = new FormData(form);
  state.brief = Object.fromEntries(data.entries());

  updateSummary();

  // 🚨 NEW: if package is "Mockup Only", skip hosting
  if (state.pkg === "Mockup Only") {
    currentStep = 2; // index of payment step
    showWizardStep(currentStep);
  } else {
    nextWizardStep(); // go to hosting
  }
}

state.extraPages = 0;
function changeExtraPages(delta) {
  const newCount = (state.extraPages || 0) + delta;
  state.extraPages = Math.max(0, newCount); // no negatives
  document.getElementById("extraPagesCount").textContent = state.extraPages;
  updateSummary();
}

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  document.querySelector(".scroll-bg").style.backgroundPositionY = `${-scrollY * 0.3}px`;
});

// Toggle selling online section
const sellingCheckbox = document.getElementById("sellingCheckbox");
const sellingSection = document.getElementById("sellingSection");

sellingCheckbox?.addEventListener("change", () => {
  // grab all inputs inside selling section
  const allFields = sellingSection.querySelectorAll("input, select, textarea");

  if (sellingCheckbox.checked) {
    sellingSection.classList.remove("hidden");

    // re-enable required for marked fields
    allFields.forEach(f => {
      if (f.dataset.req === "true") {
        f.setAttribute("required", "true");
      }
    });
  } else {
    sellingSection.classList.add("hidden");

    // disable required when hidden
    allFields.forEach(f => f.removeAttribute("required"));
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

function selectHosting(plan, monthlyPrice, el) {
  state.hosting = plan;
  state.hostingPrice = monthlyPrice;

  // highlight selected
  document.querySelectorAll('.hosting-option, .self-host-wrap .btn')
    .forEach(btn => btn.classList.remove('selected'));
  el?.classList.add('selected');

  // reset domain sections
  document.getElementById("domainInputs").classList.add("hidden");
  document.getElementById("basicDomainBlock").classList.add("hidden");
  document.getElementById("multiDomainBlock").classList.add("hidden");
  document.getElementById("ownDomainBlock").classList.add("hidden");

  if(plan === 'self'){
    state.domains = ['no domain'];
    updateSummary();
    nextWizardStep(); // go straight to payment
    return;
  }

  // show domain area
  document.getElementById("domainInputs").classList.remove("hidden");

  if(plan === 'Basic Hosting'){
    document.getElementById("basicDomainBlock").classList.remove("hidden");
  } else if(plan === 'Boost Hosting' || plan === 'Dominate Hosting'){
    document.getElementById("multiDomainBlock").classList.remove("hidden");
  }
}

function confirmDomains(){
  const d1 = document.querySelector('input[name="domain1"]').value.trim();
  const d2 = document.querySelector('input[name="domain2"]').value.trim();
  const d3 = document.querySelector('input[name="domain3"]').value.trim();

  if(!d1){
    alert('Please enter at least one domain.');
    return;
  }
  state.domains = [d1,d2,d3].filter(Boolean);
  updateSummary();
  nextWizardStep();
}

function showOwnDomain(){
  document.getElementById("multiDomainBlock").classList.add("hidden");
  document.getElementById("ownDomainBlock").classList.remove("hidden");
}

function confirmOwnDomain(){
  const own = document.querySelector('input[name="ownDomain"]').value.trim();
  if(!own){
    alert('Please enter your domain.');
    return;
  }
  state.domains = [own];
  updateSummary();
  nextWizardStep();
}

function confirmBasicDomain(){
  const d = document.querySelector('input[name="basicDomain"]').value.trim();
  if(d){
    state.domains = [d];
  } else {
    state.domains = ['no domain'];
  }
  updateSummary();
  nextWizardStep();
}

function skipBasicDomain(){
  state.domains = ['no domain'];
  updateSummary();
  nextWizardStep();
}

async function goCheckout(){
  const payBtn = document.querySelector('#wizard-step-payment .btn.primary');
  const originalText = payBtn?.textContent;

  try {
    if (payBtn) {
      payBtn.innerHTML = `Redirecting to Stripe… <span class="spinner"></span>`;
      payBtn.disabled = true;
    }

    const payload = {
      pkg: state.pkg,
      hosting: state.hosting || 'self',
      domains: state.domains || [],
      email: state.brief?.contactEmail || '',
      businessName: state.brief?.businessName || '',
      extraPages: state.extraPages || 0
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

    const stripe = Stripe(publishableKey);
    const { error: redirectErr } = await stripe.redirectToCheckout({ sessionId });
    if(redirectErr) throw redirectErr;

  } catch(err){
    console.error('Stripe error:', err);
    alert('Stripe checkout failed:\n' + (err?.message || err));
    if (payBtn) {
      payBtn.textContent = originalText;
      payBtn.disabled = false;
    }
  }
}

function updateSummary() {
  const sumPackage = document.getElementById('sumPackage');
  const sumHosting = document.getElementById('sumHosting');
  const sumPrice   = document.getElementById('sumPrice');
  const sumTax     = document.getElementById('sumTax');
  const sumTotal   = document.getElementById('sumTotal');
  const sumBusiness= document.getElementById('sumBusiness');
  const extraPagesLine = document.getElementById("extraPagesLine");

  if(!sumPackage) return;

  sumBusiness.textContent = state.brief?.businessName || '—';
  sumPackage.textContent  = state.pkg || '—';

  if (state.pkg === "Mockup Only") {
    extraPagesLine.style.display = "none";   // hide completely
  } else {
    extraPagesLine.style.display = "";       // show normally
  }

  // Hosting display
  let hostingLabel;
  if (state.pkg === "Mockup Only") {
    hostingLabel = "— / Not included";
  } else if (state.hosting) {
    hostingLabel = `${state.hosting}${state.hostingPrice ? ` ($${state.hostingPrice}/mo)` : ''}`;
  } else {
    hostingLabel = "Self-hosting";
  }
  sumHosting.textContent = hostingLabel;

    // Base package price
  sumPrice.textContent = `$${state.price.toLocaleString()} CAD`;

  // ✅ Tax handled by Stripe
  sumTax.textContent = "Calculated at checkout";

  // Extra pages
  const pagesCost = (state.extraPages || 0) * 299;
  if (state.extraPages > 0) {
    extraPagesPrice.textContent = `x${state.extraPages} — $${pagesCost.toLocaleString()} CAD`;
  } else {
    extraPagesPrice.textContent = "—";
  }

  // ✅ Tax handled by Stripe
  sumTax.textContent = "Calculated at checkout";

  // Total = just subtotal (package + first month hosting)
  const todayDue = (state.price || 0) + (state.hostingPrice || 0) + pagesCost;
  sumTotal.textContent = `$${todayDue.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
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

function showPayment() {
  const payment = document.getElementById("payment");
  payment.classList.remove("hidden");
  payment.scrollIntoView({ behavior: "smooth" });
}

// Contact form submission
const contactForm = document.getElementById("contactForm");
contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.innerHTML = `Sending… <span class="spinner"></span>`;
  submitBtn.disabled = true;

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
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const contactBtn = contactForm?.querySelector('button[type="submit"]');
    if (contactBtn) {
      contactBtn.textContent = "Send Message →";
      contactBtn.disabled = false;
    }
  }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    const target = this.getAttribute("href");

    // 🚫 Skip if href is just "#"
    if (!target || target === "#") return;

    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
});

const modal = document.getElementById("infoModal");
const modalBody = document.getElementById("modalBody");
const modalClose = modal.querySelector(".modal-close");

// Details per plan
const planDetails = {
  "one-page": `
    <h3>One-Page Site</h3>
    <ul>
      <li><b>Baseline Feature Set (like this page):</b> Includes basic displays, contact form, simple e-commerce (up to 5 products/services) and smooth site navigation, as well as responsive layout across phone, tablet, and desktop. <b>note:</b> We will need </li>
      <li><b>Design & Graphics:</b> We’ll style the page with your brand and, if needed, create a handful of supporting graphics so the page feels complete—without a full brand redesign.</li>
      <li><b>Basic SEO Optimization:</b> page titles & meta descriptions, image alt text, XML sitemap and robots.txt so your site gets noticed by the internet!.</li>
      <li><b>Revisions (2 rounds):</b> within 7 days of your order, you get two rounds of changes, if needed. A “round” is a single consolidated list of edits (copy tweaks, image swaps, section order, reasonable layout adjustments).</li>
      <li><b>Turnaround:</b> we target delivery in 7 calendar days for the scoped site (barring delays waiting on your content/approvals).</li>
    </ul>
    <div class="modal-note">
      <p><em>Note:</em> For implementing e-commerce, we’ll wire checkout with Stripe. <u>Stripe must be created in your name</u>; You may grant us the access we need to configure products, prices, basic taxes, and test mode. Payouts go directly to you; you manage orders/refunds in Stripe. We’ll guide you through setup and provide a simple handover checklist.</p>
    </div>
    `,

  "two-page": `
    <h3>Two-Page Site</h3>
    <ul>
      <li><b>Everything in One-Page:</b> you get the same baseline feature set and optimizations.</li>
      <li><b>Second Page:</b> commonly used for Services, Menu, Pricing, Portfolio, or About.</li>
      <li><b>Google Maps:</b> We'll add Google Maps to your website (if desired), so your customers know exactly where to find you.</li>
      <li><b>E-commerce:</b> Up to 20 products/services, we’ll wire checkout with Stripe (see note). </li>
      <li><b>Revisions (2 rounds per page):</b> two rounds of revisions for each page.</li>
      <li><b>Turnaround:</b> we target delivery in 7 calendar days for the scoped site (barring delays waiting on your content/approvals).</li>
    </ul>
    <div class="modal-note">
      <p><em>Note:</em> For implementing e-commerce, we’ll wire checkout with Stripe. <u>Stripe must be created in your name</u>; You may grant us the access we need to configure products, prices, basic taxes, and test mode. Payouts go directly to you; you manage orders/refunds in Stripe. We’ll guide you through setup and provide a simple handover checklist.</p>
    </div>
  `,

  "three-page": `
    <h3>Three-Page Site</h3>
    <ul>
      <li><b>Everything in Two-Page:</b> all features and optimizations carry over.</li>
      <li><b>Third Page (fully custom):</b> popular choices include Blog, Gallery, FAQ, Testimonials, or a detailed Services page.</li>
      <li><b>Google Analytics (GA4):</b> we connect your page to GA4 so you can see visits, top pages, traffic sources, devices, and locations.</li>
      <li><b>Premium E-commerce:</b>  Up to 50 products/services, an expanded catalog with categories/variants as needed. We'll wire checkout with Stripe (see note).</li>
      <li><b>Revisions (2 rounds per page):</b> two rounds for each of the three pages.</li>
      <li><b>Turnaround:</b> we target delivery in 7 calendar days for the scoped site (barring delays waiting on your content/approvals).</li>
    </ul>
    <div class="modal-note">
      <p><em>Note:</em> For implementing e-commerce, we’ll wire checkout with Stripe. <u>Stripe must be created in your name</u>; You may grant us the access we need to configure products, prices, basic taxes, and test mode. Payouts go directly to you; you manage orders/refunds in Stripe. We’ll guide you through setup and provide a simple handover checklist.</p>
    </div>
  `,

  "mockup": `
    <h3>Mockup Only</h3>
    <ul>
      <li><b>PDF Preview:</b> a polished visual draft showing layout, color, and typography. Great for deciding before a full build. We'll show you desktop AND mobile versions of your site.</li>
      <li><b>1–2 Day Turnaround:</b> quick delivery so you can review and give a go/no-go.</li>
    </ul>
  `,

  "basic-hosting": `
    <h3>Basic Hosting</h3>
    <ul>
      <li><b>Managed Hosting:</b> we host the site on a modern CDN-backed platform for speed and reliability. We handle deploys and routine updates.</li>
      <li><b>Uptime Monitoring:</b> basic monitoring so we’re alerted quickly if anything goes down.</li>
      <li><b>Light Monthly Edits (≈15 minutes):</b> small text tweaks, price updates, or image swaps. Larger changes or new sections can be quoted separately if needed.</li>
      <li><b>Cancel Anytime:</b> No long-term lock-in. If you leave, we’ll send you the site files and give you steps to redeploy elsewhere.</li>
    </ul>
  `,

  "boost-hosting": `
    <h3>Boost Hosting</h3>
    <ul>
      <li><b>Everything in Basic Hosting.</b></li>
      <li><b>Your Domain Included! (see note)</b></li>
      <li><b>Monthly Analytics Report:</b> a simple site analytics summary (sessions, top pages, traffic sources, devices) with a few actionable notes.</li>
      <li><b>Content Change (2×/month):</b> a larger update than a quick tweak—e.g., replace graphics or images, add a new section, or swap some pricing.</li>
      <li><b>1 Business Email (Zoho Mail):</b> we’ll set up Zoho Mail in <u>your</u> Zoho account (or create one for you), configure DNS, and hand over admin access and credentials after setup.</li>
      <li><b>Ownership:</b> Zoho Mail and Analytics live in your accounts; we retain collaborator/admin access only as needed to help you.</li>
      <li><b>Cancel Anytime:</b> No long-term lock-in. If you leave, we’ll send you the site files and give you steps to redeploy elsewhere.</li>
      </ul>
      <div class="modal-note">
        <p><em>Domain Policy:</em> Boost and Dominate Hosting plans include registration of one standard domain name (up to $50 CAD/year value). We’ll purchase and manage the domain on your behalf and connect it to your website. If you ever cancel hosting, we’ll transfer the domain ownership to you at no extra charge. Domains above $50/year (such as premium or specialty TLDs like <code>.io</code>, <code>.store</code>, or <code>.tech</code>) are not included, but we’re happy to help you register one directly if you’d prefer.</p>
      </div>
  `,

  "dominate-hosting": `
    <h3>Dominate Hosting</h3>
    <ul>
      <li><b>Everything in Boost Hosting.</b></li>
      <li><b>Your Domain Included! (see note)</b></li>
      <li><b>Unlimited Content Updates:</b> request as many content edits as you need each month.</li>
      <li><b>Up to 5 Business Emails (Zoho Mail):</b> we’ll set up Zoho Mail in <u>your</u> Zoho account (or create one for you), configure DNS, and hand over admin access and credentials after setup.</li>
      <li><b>Optimized Google Business Profile:</b> setup/refresh in your Google account with categories, services, hours, photos, and posting guidance. Verification is controlled by Google and can require additional steps.</li>
      <li><b>Cancel Anytime:</b> No long-term lock-in. If you leave, we’ll send you the site files and give you steps to redeploy elsewhere.</li>
    </ul>
    <div class="modal-note">
      <p><em>Domain Policy:</em> Boost and Dominate Hosting plans include registration of one standard domain name (up to $50 CAD/year value). We’ll purchase and manage the domain on your behalf and connect it to your website. If you ever cancel hosting, we’ll transfer the domain ownership to you at no extra charge. Domains above $50/year (such as premium or specialty TLDs like <code>.io</code>, <code>.store</code>, or <code>.tech</code>) are not included, but we’re happy to help you register one directly if you’d prefer.</p>
    </div>
  `
};

// Open modal
document.querySelectorAll(".learn-more").forEach(btn => {
  btn.addEventListener("click", () => {
    const plan = btn.getAttribute("data-plan");
    modalBody.innerHTML = planDetails[plan] || "<p>Details coming soon.</p>";
    modal.classList.remove("hidden");
    modal.classList.add("show");
    document.body.classList.add("modal-open");
  });
});

// Close modal
modalClose.addEventListener("click", () => {
  modal.classList.remove("show");
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("show");
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }
});

// ===== Subscriber Edit Request Form =====
const subscriberForm = document.getElementById("subscriberForm");

subscriberForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = subscriberForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  // Set loading state with spinner
  submitBtn.innerHTML = `Submitting… <span class="spinner"></span>`;
  submitBtn.disabled = true;

  const formData = new FormData(subscriberForm);
  const payload = Object.fromEntries(formData.entries());

  // Collect multiple files
  const files = formData.getAll("upload");
  const attachments = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > 5 * 1024 * 1024) {
      alert(`❌ File ${file.name} is too large. Max 5MB each.`);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }
    const base64 = await file.arrayBuffer().then(b =>
      btoa(String.fromCharCode(...new Uint8Array(b)))
    );
    attachments.push({
      content: base64,
      filename: file.name,
      type: file.type,
      disposition: "attachment",
    });
  }

  payload.attachments = attachments;

  try {
    const res = await fetch("/.netlify/functions/edit-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await res.text());
    alert("✅ Thanks! Your request has been emailed to support@snowhoneystudios.ca.");
    subscriberForm.reset();

    // Go back to dashboard choices
    document.getElementById("dashboardChoices").classList.remove("hidden");
    subscriberForm.classList.add("hidden");
  } catch (err) {
    console.error(err);
    alert("❌ Sorry, we couldn't send your request. Please email support@snowhoneystudios.ca directly.");
  } finally {
    // Reset button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// ===== Toggle subscriber form =====
const dashboardChoices = document.getElementById("dashboardChoices");
const editOptionBtn = document.getElementById("editOptionBtn");
const backBtn = document.getElementById("backBtn");

editOptionBtn?.addEventListener("click", () => {
  dashboardChoices.classList.add("hidden");
  subscriberForm.classList.remove("hidden");
});

backBtn?.addEventListener("click", () => {
  subscriberForm.classList.add("hidden");
  dashboardChoices.classList.remove("hidden");

  // Reset form + button state
  subscriberForm.reset();
  const submitBtn = subscriberForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = "🚀 Submit Request";
    submitBtn.disabled = false;
  }
});

// ===== Subscriber Dashboard Modal =====
const subDashBtn = document.getElementById("subscriberDashboardLink");
const subDashBtnMobile = document.getElementById("subscriberDashboardLinkMobile");
const subDashModal = document.getElementById("subscriberModal");
const subDashClose = subDashModal?.querySelector(".modal-close");
const cancelSubBtn = document.getElementById("cancelSubBtn");
const cancelEmailWrap = document.getElementById("cancelEmailWrap");
const cancelEmailInput = document.getElementById("cancelEmailInput");
const cancelEmailSubmit = document.getElementById("cancelEmailSubmit");

cancelSubBtn?.addEventListener("click", () => {
  // Toggle visibility of the input area
  cancelEmailWrap.classList.toggle("hidden");
});

// When user submits their email
cancelEmailSubmit?.addEventListener("click", async () => {
  const email = cancelEmailInput.value.trim();
  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/create-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("❌ Could not open billing portal: " + data.error);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Something went wrong. Please try again.");
  }
});

// Hide the cancel email input if "Request Website Edit" is pressed
editOptionBtn?.addEventListener("click", () => {
  cancelEmailWrap.classList.add("hidden");
  cancelEmailInput.value = ""; // clear field
});

function openSubDash(e) {
  e.preventDefault();
  subDashModal.classList.remove("hidden");
  subDashModal.classList.add("show"); // or remove 'hidden' if you’re not using animations
  document.body.classList.add("modal-open");
}

subDashBtn?.addEventListener("click", openSubDash);
subDashBtnMobile?.addEventListener("click", openSubDash);

subDashClose?.addEventListener("click", () => {
  subDashModal.classList.remove("show");
  subDashModal.classList.add("hidden");
  document.body.classList.remove("modal-open"); // ✅ unlock
});

subDashModal?.addEventListener("click", (e) => {
  if (e.target === subDashModal) {
    subDashModal.classList.remove("show");
    subDashModal.classList.add("hidden");
    document.body.classList.remove("modal-open"); // ✅ unlock
  }
});

// Stripe cancel link
document.getElementById("cancelSubBtn")?.addEventListener("click", () => {
  window.location.href = "https://billing.stripe.com/p/login/test_dRm4gA3QXdx55Qc7ef5J600";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    subDashModal.classList.remove("show");
    subDashModal.classList.add("hidden");
    document.body.classList.remove("modal-open"); // ✅ unlock
  }
});
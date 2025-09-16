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

  briefSection.classList.remove('hidden');

  // ✅ Make sure the correct extra fields are shown
  togglePlanFields(name);

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

  if(plan === 'self'){
    // No domains needed — hide inputs, go straight to payment
    domainInputs.classList.add("hidden");
    state.domains = [];
    updateSummary();
  } else {
    // Managed hosting — show domain inputs, hide payment until Done
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
  updateSummary();
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

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href"))
      ?.scrollIntoView({ behavior: "smooth" });
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
      <li><b>Content Change (1×/month):</b> a larger update than a quick tweak—e.g., replace graphics or images, add a new section, or swap some pricing.</li>
      <li><b>1 Business Email (Zoho Mail):</b> we’ll set up Zoho Mail in <u>your</u> Zoho account (or create one for you), configure DNS, and hand over admin access and credentials after setup.</li>
      <li><b>Ownership:</b> Zoho Mail and Analytics live in your accounts; we retain collaborator/admin access only as needed to help you.</li>
      <li><b>Cancel Anytime:</b> No long-term lock-in. If you leave, we’ll send you the site files and give you steps to redeploy elsewhere.</li>
      </ul>
      <div class="modal-note">
        <p><em>Domain Policy:</em> Boost and Dominate Hosting plans include registration of one standard domain name (up to $30 CAD/year value). We’ll purchase and manage the domain on your behalf and connect it to your website. If you ever cancel hosting, we’ll transfer the domain ownership to you at no extra charge. Domains above $30/year (such as premium or specialty TLDs like <code>.io</code>, <code>.store</code>, or <code>.tech</code>) are not included, but we’re happy to help you register one directly if you’d prefer.</p>
      </div>
  `,

  "dominate-hosting": `
    <h3>Dominate Hosting</h3>
    <ul>
      <li><b>Everything in Boost Hosting.</b></li>
      <li><b>Your Domain Included! (see note)</b></li>
      <li><b>Unlimited Content Updates:</b> request as many content edits as you need each month.</li>
      <li><b>Up to 5 Business Emails (Zoho Mail):</b> full setup in your Zoho account (or we can create one for you). We set up inboxes/aliases and hand over admin.</li>
      <li><b>Optimized Google Business Profile:</b> setup/refresh in your Google account with categories, services, hours, photos, and posting guidance. Verification is controlled by Google and can require additional steps.</li>
      <li><b>Cancel Anytime:</b> No long-term lock-in. If you leave, we’ll send you the site files and give you steps to redeploy elsewhere.</li>
    </ul>
    <div class="modal-note">
      <p><em>Domain Policy:</em> Boost and Dominate Hosting plans include registration of one standard domain name (up to $30 CAD/year value). We’ll purchase and manage the domain on your behalf and connect it to your website. If you ever cancel hosting, we’ll transfer the domain ownership to you at no extra charge. Domains above $30/year (such as premium or specialty TLDs like <code>.io</code>, <code>.store</code>, or <code>.tech</code>) are not included, but we’re happy to help you register one directly if you’d prefer.</p>
    </div>
  `
};

// Open modal
document.querySelectorAll(".learn-more").forEach(btn => {
  btn.addEventListener("click", () => {
    const plan = btn.getAttribute("data-plan");
    modalBody.innerHTML = planDetails[plan] || "<p>Details coming soon.</p>";
    modal.classList.remove("hidden");
  });
});

// Close modal
modalClose.addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden"); // click outside closes
});

const editForm = document.getElementById("editRequestForm");
editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(editForm);
  const payload = Object.fromEntries(formData.entries());

  // Collect multiple files
  const files = formData.getAll("upload");
  const attachments = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > 5 * 1024 * 1024) {
      alert(`❌ File ${file.name} is too large. Max 5MB each.`);
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
    editForm.reset();
  } catch (err) {
    console.error(err);
    alert("❌ Sorry, we couldn't send your request. Please email support@snowhoneystudios.ca directly.");
  }
});

// ===== Subscriber Dashboard Modal =====
const subDashBtn = document.getElementById("subscriberDashboardLink");
const subDashBtnMobile = document.getElementById("subscriberDashboardLinkMobile");
const subDashModal = document.getElementById("subscriberModal");
const subDashClose = subDashModal?.querySelector(".modal-close");
const cancelSubBtn = document.getElementById("cancelSubBtn");

function openSubDash(e) {
  e.preventDefault();
  subDashModal.classList.remove("hidden");
  subDashModal.classList.add("show"); // or remove 'hidden' if you’re not using animations
}

subDashBtn?.addEventListener("click", openSubDash);
subDashBtnMobile?.addEventListener("click", openSubDash);

subDashClose?.addEventListener("click", () => {
  subDashModal.classList.remove("show");
});

subDashModal?.addEventListener("click", (e) => {
  if (e.target === subDashModal) subDashModal.classList.remove("show");
});

// Stripe cancel link
document.getElementById("cancelSubBtn")?.addEventListener("click", () => {
  window.location.href = "https://billing.stripe.com/p/login/<YOUR_PORTAL_ID>";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") subDashModal.classList.remove("show");
});



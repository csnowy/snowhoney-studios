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
  if (wizardSteps[currentStep] === "wizard-step-hosting") {
    if (!state.hosting) {
      alert("⚠️ Please select a hosting option before proceeding.");
      return;
    }
  }

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
        payBtn.textContent = "Checkout →";
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
    "Your package includes a free trial of Basic Hosting! You can also upgrade to Boost or Dominate below with the added 19$ discount instead.";
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

  // reset all domain sections
  document.getElementById("domainInputs").classList.add("hidden");
  document.getElementById("basicDomainBlock").classList.add("hidden");
  document.getElementById("multiDomainBlock").classList.add("hidden");
  document.getElementById("ownDomainBlock").classList.add("hidden");

  // Self-hosting
  if (plan === "Self-hosting") {
    state.hosting = "Self-hosting";
    state.hostingPrice = 0;
    state.domains = ['no domain'];
    updateSummary();

    document.getElementById("selfHostOption").classList.remove("hidden");
    return;
  } else {
    document.getElementById("selfHostOption").classList.add("hidden");
  }

  // Basic Hosting
  if (plan === "Basic Hosting") {
    document.getElementById("domainInputs").classList.remove("hidden");
    document.getElementById("basicDomainBlock").classList.remove("hidden");
  }

  // Boost / Dominate
  if (plan === "Boost Hosting" || plan === "Dominate Hosting") {
    document.getElementById("domainInputs").classList.remove("hidden");
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
      payBtn.innerHTML = `Setting up Checkout… <span class="spinner"></span>`;
      payBtn.disabled = true;
    }

    const payload = {
      pkg: state.pkg,
      hosting: state.hosting || 'self',
      domains: state.domains || [],
      email: state.brief?.contactEmail || '',
      businessName: state.brief?.businessName || '',
      extraPages: state.extraPages || 0,
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

function getTrialDays(pkg, hosting) {
  if (pkg === "Two-Page Site" && hosting === "Basic Hosting") return 30;
  if (pkg === "Three-Page Site" && hosting === "Basic Hosting") return 90;
  if (pkg === "Two-Page Site") return 30;  // Boost/Dominate
  if (pkg === "Three-Page Site") return 90;
  return 0;
}

function getFirstChargeDate(pkg, hosting) {
  const days = getTrialDays(pkg, hosting);
  if (!days) return null;

  const d = new Date();
  d.setDate(d.getDate() + days + 7); // add trial days + 7 day build buffer
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatHostingSummary(pkg, hosting) {
  let display = "";
  let note = "";
  const days = getTrialDays(pkg, hosting);
  const firstCharge = getFirstChargeDate(pkg, hosting);

  if (!hosting || hosting === "Self-hosting") {
    return { display: "Self-hosting", note: "" };
  }

  if (hosting === "Basic Hosting") {
    if (days > 0) {
      display = `Basic Hosting — $19/mo (first ${days} days free)`;
      note = `Your first $19 hosting payment will be on ${firstCharge}.`;
    } else {
      display = "Basic Hosting — $24/mo";
    }
    return { display, note };
  }

  if (hosting === "Boost Hosting" || hosting === "Dominate Hosting") {
    const base = hosting === "Boost Hosting" ? 69 : 99;
    const discounted = hosting === "Boost Hosting" ? 45 : 95;

    if (pkg === "Two-Page Site") {
      display = `${hosting} — $${base}/mo (first month $${discounted}/mo)`;
      note = "A $19 discount applies for your first month.";
    }
    if (pkg === "Three-Page Site") {
      display = `${hosting} — $${base}/mo (first 3 months $${discounted}/mo)`;
      note = "A $19 discount applies for your first 3 months.";
    }
    return { display, note };
  }
}

function proceedSelfHosting(){
  state.hosting = "Self-hosting";
  state.hostingPrice = 0;
  state.domains = ['no domain'];
  updateSummary();
  nextWizardStep(); // straight to payment
}

async function updateSummary() {
  const sumBusiness = document.getElementById("sumBusiness");
  const sumPackage  = document.getElementById("sumPackage");
  const sumPrice    = document.getElementById("sumPrice");
  const sumTax      = document.getElementById("sumTax");
  const sumTotal    = document.getElementById("sumTotal");
  const trialNote   = document.getElementById("trialNote");

  const hostingGroup         = document.getElementById("hostingSummaryGroup");
  const extraPagesGroup      = document.getElementById("extraPagesGroup");
  const paymentRecurringNote = document.getElementById("paymentRecurringNote");
  const sumNext              = document.getElementById("sumNext");
  const sumNextValue         = document.getElementById("sumNextValue");
  const sumNextNote          = document.getElementById("sumNextNote");

  // For mockup credit
  let mockupLine = document.getElementById("mockupCreditLine");
  if (!mockupLine) {
    const summary = document.querySelector("#wizard-step-payment .summary");
    mockupLine = document.createElement("div");
    mockupLine.className = "line";
    mockupLine.id = "mockupCreditLine";
    summary.insertBefore(mockupLine, sumTotal.parentElement); // insert before total
  }

  // Always set business + package + price + tax
  if (sumBusiness) sumBusiness.textContent = state.brief?.businessName || "—";
  if (sumPackage)  sumPackage.textContent  = state.pkg || "—";
  if (sumPrice)    sumPrice.textContent    = `$${state.price.toLocaleString()} CAD`;
  if (sumTax)      sumTax.textContent      = "Calculated at checkout";

  // === Check mockup credit from backend ===
  let mockupCredit = 0;
  if (state.brief?.contactEmail && state.pkg !== "Mockup Only") {
    try {
      const res = await fetch("/.netlify/functions/check-mockup-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.brief.contactEmail }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.hasMockup) {
          mockupCredit = 99;
        }
      }
    } catch (err) {
      console.error("Mockup check failed:", err);
    }
  }

  // Show/hide line
  if (mockupCredit > 0) {
    mockupLine.innerHTML = `<strong>Mockup Credit</strong>
      <span class="discount">−$${mockupCredit.toLocaleString(undefined,{minimumFractionDigits:2})} CAD</span>
      <p class="note">Applied automatically because you previously purchased a mockup.</p>`;
    mockupLine.style.display = "block";
  } else {
    mockupLine.style.display = "none";
  }

  document.querySelectorAll(".trialMonths").forEach(el => {
    if (state.pkg === "Two-Page Site") {
      el.textContent = "first month";
    } else if (state.pkg === "Three-Page Site") {
      el.textContent = "first 3 months";
    } else {
      el.textContent = "";
    }
  });

  // ===== MOCKUP ONLY =====
  if (state.pkg === "Mockup Only") {
    if (trialNote) trialNote.style.display = "none";
    if (hostingGroup) hostingGroup.style.display = "none";
    if (extraPagesGroup) extraPagesGroup.style.display = "none";
    if (paymentRecurringNote) paymentRecurringNote.style.display = "none";
    if (sumNext) sumNext.classList.add("hidden");
    if (sumNextNote) sumNextNote.style.display = "none";

    const todayDue = state.price || 0;
    if (sumTotal) sumTotal.textContent = `$${todayDue.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
    return; // stop here for mockups
  }

  // ===== NORMAL PACKAGES =====
  if (hostingGroup) hostingGroup.style.display = "block";
  if (extraPagesGroup) extraPagesGroup.style.display = "block";
  if (paymentRecurringNote) paymentRecurringNote.style.display = "block";

  // --- Hosting details ---
  const sumHostingCost = document.getElementById("sumHostingCost");
  const sumHostingPlan = document.getElementById("sumHostingPlan");
  const oldPriceEl = sumHostingCost?.querySelector(".old-price");
  const newPriceEl = sumHostingCost?.querySelector(".new-price");

  let trialMonths = 0;
  let trialAmount = state.hostingPrice; // default = base monthly

  if (state.hosting === "Boost Hosting" || state.hosting === "Dominate Hosting") {
    if (state.pkg === "Two-Page Site") {
      trialMonths = 1;
      trialAmount = (state.hosting === "Boost Hosting") ? 30 : 80;
    } else if (state.pkg === "Three-Page Site") {
      trialMonths = 3;
      trialAmount = (state.hosting === "Boost Hosting") ? 30 : 80;
    }

    if (trialMonths > 0) {
      // show crossed-out original + discounted trial
      if (oldPriceEl && newPriceEl) {
        oldPriceEl.style.display = "inline";
        oldPriceEl.textContent = `$${state.hostingPrice}/mo`;
        newPriceEl.textContent = `$${trialAmount}/mo`;
      }
      if (trialNote) {
        trialNote.style.display = "block";
        trialNote.textContent = `🎉 Trial price applies for your first ${trialMonths} month${trialMonths>1?"s":""}, then regular hosting rate applies.`;
      }
    } else {
      // no trial → show only the base price
      if (oldPriceEl) oldPriceEl.style.display = "none";
      if (newPriceEl) newPriceEl.textContent = `$${state.hostingPrice}/mo`;
      if (trialNote) trialNote.style.display = "none";
    }

    if (trialNote) {
      trialNote.style.display = "block";
      trialNote.textContent = `🎉 Trial price applies for your first ${trialMonths} month${trialMonths>1?"s":""}, then regular hosting rate applies.`;
    }
  }  else if (state.hosting === "Basic Hosting") {
    if (oldPriceEl) oldPriceEl.style.display = "none";
    if (newPriceEl) newPriceEl.textContent = "$19/mo"; // not 24 or crossed out
    if (trialNote) {
      if (state.pkg === "Two-Page Site") {
        trialNote.style.display = "block";
        trialNote.textContent = "🎉 Your first month of Basic Hosting is free!";
      } else if (state.pkg === "Three-Page Site") {
        trialNote.style.display = "block";
        trialNote.textContent = "🎉 Your first 3 months of Basic Hosting are free!";
      } else {
        trialNote.style.display = "none";
      }
    }
  } else {
    // Basic Hosting or Self-hosting
    if (oldPriceEl) oldPriceEl.style.display = "none";
    if (newPriceEl) {
      newPriceEl.textContent = state.hostingPrice > 0 ? `$${state.hostingPrice}/mo` : "Free";
    }
    if (trialNote) trialNote.style.display = "none";
  }

  if (sumHostingPlan) sumHostingPlan.textContent = state.hosting || "—";

  // --- Extra pages ---
  const extraPagesPrice = document.getElementById("extraPagesPrice");
  const pagesCost = (state.extraPages || 0) * 199;
  if (extraPagesPrice) {
    extraPagesPrice.textContent = state.extraPages > 0
      ? `x${state.extraPages} — $${pagesCost.toLocaleString()} CAD`
      : "—";
  }

  // --- Total today ---
  const todayDue = (state.price || 0) + pagesCost - mockupCredit;
  if (sumTotal) {
    sumTotal.textContent = `$${todayDue.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
  }

  // --- Total due in 7 days (hosting first charge) ---
  if (state.hosting && state.hosting !== "Self-hosting") {
    let amount = state.hostingPrice; // default
    let noteMsg = "";

    if (state.hosting === "Boost Hosting" || state.hosting === "Dominate Hosting") {
      if (state.pkg === "Two-Page Site") {
        amount = (state.hosting === "Boost Hosting") ? 30 : 80;
        noteMsg = "First month billed at trial rate.";
      } else if (state.pkg === "Three-Page Site") {
        amount = (state.hosting === "Boost Hosting") ? 30 : 80;
        noteMsg = "First 3 months billed at trial rate.";
      }
    } else if (state.hosting === "Basic Hosting") {
      if (state.pkg === "Two-Page Site" || state.pkg === "Three-Page Site") {
        amount = 0;
        noteMsg = "Your Basic Hosting payment is waived during your free trial!";
      }
    }

    if (sumNext) sumNext.classList.remove("hidden");
    if (sumNextValue) sumNextValue.textContent = `$${amount.toLocaleString(undefined,{minimumFractionDigits:2})} CAD`;
    if (sumNextNote) {
      sumNextNote.style.display = noteMsg ? "block" : "none";
      sumNextNote.textContent = noteMsg;
    }
  } else {
    if (sumNext) sumNext.classList.add("hidden");
    if (sumNextNote) sumNextNote.style.display = "none";
  }

  // If hosting has no trial
  if (!(state.hosting && (state.pkg === "Two-Page Site" || state.pkg === "Three-Page Site"))) {
    if (trialNote) trialNote.style.display = "none";
  }
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
  const errorEl = document.getElementById("cancelEmailError");

  // Clear previous errors
  errorEl.textContent = "";
  errorEl.classList.add("hidden");

  if (!email) {
    errorEl.textContent = "Please enter your email.";
    errorEl.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/create-portal-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 404) {
        errorEl.textContent = "We couldn’t find a subscription for that email. Please double-check or use the email you signed up with.";
      } else {
        errorEl.textContent = "Something went wrong connecting to Stripe. Please try again later.";
      }
      errorEl.classList.remove("hidden");
      return;
    }

    // ✅ success → redirect
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Portal session error:", err);
    errorEl.textContent = "Unexpected error. Please try again later.";
    errorEl.classList.remove("hidden");
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

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    subDashModal.classList.remove("show");
    subDashModal.classList.add("hidden");
    document.body.classList.remove("modal-open"); // ✅ unlock
  }
});

// === Dynamic Wix vs Snowhoney Calculator (with email selector) ===
(function(){
  const wixPlans = {
    "Core": 33,
    "Business": 44,
    "Business Elite": 165
  };

  let currentWixPlan = "Business";
  let currentSnowhoneyPkg = "One-Page Site";
  let currentHosting = "Basic Hosting";

  // update Wix totals
  function updateWix(planName){
    const monthly = wixPlans[planName];
    const yearly = monthly * 12;
    const fiveYear = yearly * 5;
    // apply domain/email extras
    const domainCost = 30;
    const emailCost = 70;
    const yearlyWithExtras = yearly + (emailCost*3);
    const fiveYearWithExtras = fiveYear + (domainCost*4) + (emailCost*3*5);
    document.getElementById("wix-year").textContent = `$${yearlyWithExtras} CAD`;
    document.getElementById("wix-5yr-real").textContent = `$${fiveYearWithExtras} CAD`;
  }

  // update Snowhoney totals
  function updateSnowhoney(pkgName, hosting){
    const pkgMap = {
      "One-Page Site": 699,
      "Two-Page Site": 999,
      "Three-Page Site": 1399
    };
    const hostMap = {
      "Basic Hosting": 19,
      "Boost Hosting": 49,
      "Dominate Hosting": 99
    };
    const build = pkgMap[pkgName];
    const hostYear = hostMap[hosting] * 12;
    const yearTotal = build + hostYear;
    const fiveYearTotal = build + (hostMap[hosting] * 12 * 5);

    document.getElementById("snowhoney-pkg").textContent = pkgName;
    document.getElementById("snowhoney-hosting").textContent = hosting;
    document.getElementById("snowhoney-year").textContent = `$${yearTotal} CAD`;
    document.getElementById("snowhoney-5yr").textContent = `$${fiveYearTotal} CAD`;
  }

  // Wix buttons
  document.querySelectorAll(".wix-plan-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      currentWixPlan = btn.dataset.plan;
      document.querySelectorAll(".wix-plan-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      updateWix(currentWixPlan);
    });
  });

  // Snowhoney package buttons
  document.querySelectorAll(".compare-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      currentSnowhoneyPkg = btn.dataset.pkg;
      document.querySelectorAll(".compare-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      updateSnowhoney(currentSnowhoneyPkg, currentHosting);
    });
  });

  // Snowhoney hosting buttons
  document.querySelectorAll(".hosting-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      currentHosting = btn.dataset.hosting;
      document.querySelectorAll(".hosting-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      updateSnowhoney(currentSnowhoneyPkg, currentHosting);
    });
  });

  // init with defaults
  updateWix(currentWixPlan);
  updateSnowhoney(currentSnowhoneyPkg, currentHosting);
})();

// Mobile background scroll adjustment
if (window.innerWidth <= 600) {
  const bg = document.querySelector(".scroll-bg");
  if (bg) {
    window.addEventListener("scroll", () => {
      const scrolled = window.scrollY;
      // adjust multiplier to control speed (0.05 = very slow)
      bg.style.backgroundPosition = `center ${scrolled * 0.01}px`;
    });
  }
}

let portalToken = null;
let verifiedEmail = null;

async function sendCode() {
  const email = document.getElementById("portalEmail").value.trim();
  const err = document.getElementById("emailError");
  err.classList.add("hidden");

  if (!email) {
    err.textContent = "Please enter your email.";
    err.classList.remove("hidden");
    return;
  }

  const res = await fetch("/.netlify/functions/send-portal-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    err.textContent = data.error || "Something went wrong.";
    err.classList.remove("hidden");
    return;
  }

  portalToken = data.token;
  verifiedEmail = null;

  document.getElementById("emailForm").classList.add("hidden");
  document.getElementById("codeForm").classList.remove("hidden");
  alert("✅ Code sent to your email!");
}

async function verifyCode() {
  const code = document.getElementById("portalCode").value.trim();
  const err = document.getElementById("codeError");
  err.classList.add("hidden");

  if (!code) {
    err.textContent = "Enter the code from your email.";
    err.classList.remove("hidden");
    return;
  }

  const res = await fetch("/.netlify/functions/verify-portal-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, token: portalToken }),
  });

  const data = await res.json();
  if (!res.ok) {
    err.textContent = data.error || "Invalid code.";
    err.classList.remove("hidden");
    return;
  }

  verifiedEmail = data.email;
  verifiedToken = data.token;
  portalToken = null;

  document.getElementById("codeForm").classList.add("hidden");
  document.getElementById("subscriberDashboard").classList.remove("hidden");
  document.getElementById("dashboardEmail").textContent = verifiedEmail;
  document.getElementById("subscriberEmailField").value = verifiedEmail;
}

function resendCode() {
  document.getElementById("emailForm").classList.remove("hidden");
  document.getElementById("codeForm").classList.add("hidden");
}

document.getElementById("manageSubBtn")?.addEventListener("click", async () => {
  if (!verifiedToken) return alert("Please verify your email first.");

  const res = await fetch("/.netlify/functions/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verifiedToken }),
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error || "Could not open portal.");
    return;
  }
  if (data.url) {
    window.location.href = data.url;
  }
});

async function checkMockupCredit(email) {
  try {
    const res = await fetch("/.netlify/functions/check-mockup-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.hasMockup === true;
  } catch (err) {
    console.error("Mockup credit check failed:", err);
    return false;
  }
}

let selectedHostOnly = null;

function openHostOnly(plan) {
  selectedHostOnly = plan;
  const modal = document.getElementById("hostOnlyModal");
  modal.classList.remove("hidden");
  modal.classList.add("show");
  document.body.classList.add("modal-open");
}

function closeHostOnly() {
  const modal = document.getElementById("hostOnlyModal");
  modal.classList.remove("show");
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

document.getElementById("hostOnlyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = {
    pkg: "Hosting Only",
    hosting: selectedHostOnly,
    email: formData.get("contactEmail"),
    businessName: formData.get("businessName"),
    domains: [formData.get("domain")].filter(Boolean),
  };

  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout failed");

    const stripe = Stripe(data.publishableKey);
    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  } catch (err) {
    alert("❌ Checkout failed: " + err.message);
  }
});

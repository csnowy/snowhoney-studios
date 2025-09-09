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
    document.getElementById('brief').classList.remove('hidden');
    document.getElementById('payment').classList.add('hidden');
    location.hash = '#brief';

    // Smooth scroll to form
    const briefSection = document.getElementById('brief');
    briefSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function submitBrief(){
    const form = document.getElementById('briefForm');
    if(!form.reportValidity()) return;
    const data = new FormData(form);
    state.brief = Object.fromEntries(data.entries());
    // Update summary
    document.getElementById('sumPackage').textContent = state.pkg || '—';
    document.getElementById('sumPrice').textContent = `$${state.price.toLocaleString()} CAD`;
    document.getElementById('sumBusiness').textContent = state.brief.businessName || '—';
    // Show payment
    document.getElementById('payment').classList.remove('hidden');
    location.hash = '#payment';
}

function goCheckout(){
    const hosting = (document.querySelector('input[name="hosting"]:checked')||{}).value || 'none';
    const payload = {package: state.pkg, price: state.price, hosting, brief: state.brief};
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



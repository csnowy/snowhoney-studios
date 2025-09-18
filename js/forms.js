// js/forms.js
console.log('forms.js loaded');

// Selling checkbox toggle
const sellingCheckbox = document.getElementById("sellingCheckbox");
const sellingSection = document.getElementById("sellingSection");
sellingCheckbox?.addEventListener("change", () => {
  if (sellingCheckbox.checked) sellingSection?.classList.remove("hidden");
  else sellingSection?.classList.add("hidden");
});

// brief form file validation and submit handling
const briefForm = document.getElementById("briefForm");
briefForm?.addEventListener("submit", (e) => {
  // file selection may be empty; guard
  const logosInput = document.querySelector('input[name="logos"]');
  const imagesInput = document.querySelector('input[name="images"]');

  const logoFiles = logosInput ? [...logosInput.files] : [];
  const imageFiles = imagesInput ? [...imagesInput.files] : [];
  const allFiles = [...logoFiles, ...imageFiles];

  const maxSize = 5 * 1024 * 1024; // 5 MB per file
  const totalMax = 20 * 1024 * 1024; // 20 MB total
  let totalSize = 0;

  for (let file of allFiles) {
    if (file.size > maxSize) {
      e.preventDefault();
      // use the first logos input to report validity (keeps UI native)
      const fileInput = logosInput || imagesInput;
      fileInput.setCustomValidity(`File "${file.name}" is too large (max 5MB).`);
      fileInput.reportValidity();
      fileInput.setCustomValidity("");
      return;
    }
    totalSize += file.size;
  }

  if (totalSize > totalMax) {
    e.preventDefault();
    alert("Total file uploads exceed 20MB. Please reduce file sizes.");
    return;
  }
  // allowed: let normal submit flow continue (your code previously used submitBrief() separately)
});

// Add row utility for items table
window.addRow = function addRow() {
  const tbody = document.getElementById("itemsTableBody");
  if(!tbody) return;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input name="item[]" placeholder="e.g., Another Service" maxlength="100" /></td>
    <td><input name="cost[]" placeholder="$100" maxlength="20" /></td>
  `;
  tbody.appendChild(row);
};

// Contact form submit (preserves original behavior but uses inline feedback)
const contactForm = document.getElementById("contactForm");
const contactError = document.getElementById("contactError");
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
    // success UX: inline or alert
    contactError?.classList.add("hidden");
    alert("✅ Thank you! Your message has been sent. We'll reply soon.");
    contactForm.reset();
  } catch (err) {
    console.error(err);
    if(contactError){
      contactError.textContent = "❌ Could not send your message. Please try again later.";
      contactError.classList.remove("hidden");
    } else {
      alert("❌ Could not send your message. Please try again later.");
    }
  }
});

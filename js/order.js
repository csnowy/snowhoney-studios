// js/order.js
console.log("order.js loaded");

// Start an order from package card
window.startOrder = function(name, price) {
  window.state.pkg = name;
  window.state.price = price;

  const briefSection = document.getElementById("brief");
  if (!briefSection) return;

  briefSection.classList.remove("hidden");

  // Show/hide extra fields
  window.togglePlanFields(name);

  // Smooth scroll to brief
  setTimeout(() => {
    briefSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
};

// Handle brief submission
window.submitBrief = function() {
  const form = document.getElementById("briefForm");
  if (!form?.reportValidity()) return;

  const data = new FormData(form);
  window.state.brief = Object.fromEntries(data.entries());

  // Pre-fill summary
  window.updateSummary();

  // Show Hosting choices
  const hostBlock = document.getElementById("hostingBlock");
  if (hostBlock) {
    hostBlock.classList.remove("hidden");
    hostBlock.scrollIntoView({ behavior: "smooth" });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("dashboard.js loaded");

  const subDashBtn = document.getElementById("subscriberDashboardLink");
  const subDashBtnMobile = document.getElementById("subscriberDashboardLinkMobile");
  const subDashModal = document.getElementById("subscriberModal");
  const subDashClose = subDashModal?.querySelector(".modal-close");

  function openSubDash(e) {
    e?.preventDefault();
    console.log("[Dashboard] Open button clicked");

    if (!subDashModal) return;

    subDashModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    void subDashModal.offsetHeight; // force reflow

    console.log("[Dashboard] modal classes:", subDashModal.className);
    console.log("[Dashboard] computed style:", window.getComputedStyle(subDashModal).display);
  }

  function closeSubDash() {
    console.log("[Dashboard] Closing dashboard modal");
    subDashModal?.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  subDashBtn?.addEventListener("click", openSubDash);
  subDashBtnMobile?.addEventListener("click", openSubDash);
  subDashClose?.addEventListener("click", closeSubDash);
  subDashModal?.addEventListener("click", (e) => {
    if (e.target === subDashModal) closeSubDash();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSubDash();
  });

  // ===== Inside Dashboard: toggle edit form =====
  const editBtn = document.getElementById("editOptionBtn");
  const subscriberForm = document.getElementById("subscriberForm");
  const dashboardChoices = document.getElementById("dashboardChoices");
  const backBtn = document.getElementById("backBtn");

  editBtn?.addEventListener("click", () => {
    dashboardChoices?.classList.add("hidden");
    subscriberForm?.classList.remove("hidden");
    void modal.offsetHeight;
  });

  backBtn?.addEventListener("click", () => {
    subscriberForm?.classList.add("hidden");
    dashboardChoices?.classList.remove("hidden");
    void modal.offsetHeight;
  });

  // ===== Cancel subscription button =====
  const STRIPE_PORTAL_URL = "https://billing.stripe.com/p/login/<YOUR_PORTAL_ID>";
  document.getElementById("cancelSubBtn")?.addEventListener("click", () => {
    window.location.href = STRIPE_PORTAL_URL;
  });

  // ===== Edit form submission =====
  subscriberForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(subscriberForm);
    const payload = Object.fromEntries(formData.entries());

    const editFeedback = document.getElementById("editFeedback");
    const files = formData.getAll("upload");
    const attachments = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;
      if (file.size > 5 * 1024 * 1024) {
        editFeedback.textContent = `❌ File ${file.name} exceeds 5MB.`;
        editFeedback.classList.remove("hidden");
        void modal.offsetHeight;
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
      editFeedback.textContent = "✅ Thanks! Your request was sent to support.";
      editFeedback.className = "form-success";
      subscriberForm.reset();
    } catch (err) {
      console.error(err);
      editFeedback.textContent = "❌ Sorry, we couldn't send your request. Please email us directly.";
      editFeedback.className = "form-error";
    }
    editFeedback.classList.remove("hidden");
    void modal.offsetHeight;

  });
});

// js/editForm.js
console.log('editForm.js loaded');

const editForm = document.getElementById("subscriberForm");
const editFeedbackEl = document.getElementById("editFeedback");

editForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(editForm);
  const payload = Object.fromEntries(formData.entries());

  // Collect multiple files
  const files = formData.getAll("upload") || [];
  const attachments = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > 5 * 1024 * 1024) {
      if(editFeedbackEl){
        editFeedbackEl.textContent = `❌ File ${file.name} exceeds 5MB.`;
        editFeedbackEl.classList.remove("hidden");
      }
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
    if(editFeedbackEl){
      editFeedbackEl.textContent = "✅ Thanks! Your request was sent to support.";
      editFeedbackEl.className = "form-success";
    }
    editForm.reset();
  } catch (err) {
    console.error(err);
    if(editFeedbackEl){
      editFeedbackEl.textContent = "❌ Sorry, we couldn't send your request. Please email us directly.";
      editFeedbackEl.className = "form-error";
    } else {
      alert("❌ Could not submit edit request. Please try again.");
    }
  }
});

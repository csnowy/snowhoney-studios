document.addEventListener("DOMContentLoaded", () => {
  console.log("modals.js loaded");

  const modal = document.getElementById("infoModal");
  const modalBody = document.getElementById("modalBody");
  const modalClose = modal?.querySelector(".modal-close");

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
        <li><b>Content Change (2x/month):</b> a larger update than a quick tweak—e.g., replace graphics or images, add a new section, or swap some pricing.</li>
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

  document.querySelectorAll(".learn-more").forEach(btn => {
    btn.addEventListener("click", () => {
      const plan = btn.getAttribute("data-plan");
      console.log("[LearnMore] Clicked:", plan);

      if (!modal || !modalBody) return;

      modalBody.innerHTML = planDetails[plan] || "<p>Details coming soon.</p>";
      modal.classList.remove("hidden");
      void modal.offsetHeight;
      document.body.classList.add("modal-open");

      // force a repaint to avoid first-click bug
      void modal.offsetHeight;

      console.log("[LearnMore] modal classes:", modal.className);
      console.log("[LearnMore] computed style:", window.getComputedStyle(modal).display);
    });
  });

  modalClose?.addEventListener("click", () => {
    console.log("[LearnMore] Closing modal");
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
    }
  });
});
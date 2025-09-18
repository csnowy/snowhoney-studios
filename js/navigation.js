// js/navigation.js
console.log('navigation.js loaded');

// Mobile menu toggle
const menuBtn = document.querySelector('.menu-btn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn?.addEventListener('click', () => {
  mobileMenu.classList.toggle('hidden');
  menuBtn.setAttribute('aria-expanded', mobileMenu.classList.contains('hidden') ? 'false' : 'true');
});
// Close mobile menu on link click (if present)
mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.classList.add('hidden');
  menuBtn?.setAttribute('aria-expanded','false');
}));

// Footer year
const yearEl = document.getElementById('y');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Smooth-scroll anchors (ignore href="#" anchors)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    const target = this.getAttribute("href");
    if (target === "#" || !target) return; // ignore empty anchors
    e.preventDefault();
    const el = document.querySelector(target);
    el?.scrollIntoView({ behavior: "smooth" });
  });
});

// Work carousel (keeps same logic as original)
document.querySelectorAll(".work-carousel").forEach(carousel => {
  const track = carousel.querySelector(".work-track");
  const leftBtn = carousel.querySelector(".work-arrow.left");
  const rightBtn = carousel.querySelector(".work-arrow.right");
  if(!track) return;

  let index = 0;
  const updateScroll = () => {
    const item = track.querySelector(".shot");
    if (!item) return;
    const itemWidth = item.getBoundingClientRect().width;
    track.style.transform = `translateX(${-index * itemWidth}px)`;
    if(leftBtn) leftBtn.disabled = index === 0;
    const maxIndex = Math.max(0, track.children.length - 2);
    if(rightBtn) rightBtn.disabled = index >= maxIndex;
  };

  leftBtn?.addEventListener("click", () => { if(index>0){ index--; updateScroll(); } });
  rightBtn?.addEventListener("click", () => {
    const maxIndex = Math.max(0, track.children.length - 2);
    if(index < maxIndex){ index++; updateScroll(); }
  });

  window.addEventListener("resize", updateScroll);
  updateScroll();
});

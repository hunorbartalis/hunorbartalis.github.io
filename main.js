/*
 * main.js — Hunor Bartalis-Szélyes portfolio
 *
 * Plain DOM/JS, no build step, no framework. Handles four small jobs:
 * scroll-triggered section reveals, the mobile sidebar drawer, the
 * slide-viewer toggle on the talks page, and the image lightbox.
 *
 * Original code, MIT-style "do what you like" terms — feel free to reuse.
 * This file does not bundle any third-party library code itself; jQuery
 * and Font Awesome are loaded separately from index.html (see that file's
 * header comment for their licenses).
 */

// =================================================================================================
// Scroll reveal + progress bar
// =================================================================================================
// Every section except the hero starts invisible (see .visible in style.css).
// As each one drifts into view we just tag it so the CSS transition can fade it in.
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: .12 });
document.querySelectorAll('section:not(#home)').forEach(s => observer.observe(s));

// Thin bar at the very top that fills left-to-right as you scroll down the page.
const bar = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const max = document.body.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${window.scrollY / max})`;
});

// =================================================================================================
// Mobile sidebar drawer
// =================================================================================================
// On narrow screens the profile sidebar collapses behind a hamburger button
// and slides in as an overlay instead of sitting fixed on the left.
const hamburger = document.getElementById('hamburger');
const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('sidebarOverlay');

hamburger.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  overlay.classList.toggle('active', open);
});

// Tapping the dimmed backdrop behind the drawer closes it again.
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  hamburger.classList.remove('open');
  overlay.classList.remove('active');
});

// Picking a nav link should also close the drawer, otherwise it stays
// open and covers the section you just jumped to.
document.querySelectorAll('.topbar nav a').forEach(link => {
  link.addEventListener('click', () => {
    sidebar.classList.remove('open');
    hamburger.classList.remove('open');
    overlay.classList.remove('active');
  });
});

// =================================================================================================
// Slide viewer toggle (Talks section)
// =================================================================================================
// Called inline from the "View Slides" button — shows or hides the embedded
// PDF iframe and flips the button's icon/label to match the current state.
function togglePresentation(btn, id) {
  const viewer = document.getElementById(id);
  const open = viewer.style.display === 'block';
  viewer.style.display = open ? 'none' : 'block';
  btn.innerHTML = open
    ? '<i class="fa-solid fa-play"></i> View Slides'
    : '<i class="fa-solid fa-xmark"></i> Hide Slides';
}

// =================================================================================================
// Lightbox — pan & zoom
// =================================================================================================
// Any thumbnail tagged with the "popup" class opens full-screen here. Supports:
//   - mouse wheel to zoom, centered on the cursor position
//   - click-and-drag to pan once zoomed in
//   - double-click to jump to 2x (or back to 1x if already zoomed)
//   - pinch-to-zoom and one-finger pan on touch devices
//   - the on-screen +/- buttons, zooming toward the center of the viewport
//
// The whole thing tracks three numbers — scale, and the x/y pixel offset of
// the image — and re-applies them as a single CSS transform on every change.
// Panning is clamped so you can never drag the image past where its edge
// would leave a gap, which is what makes it feel like a "real" image viewer
// instead of a sticker you're shoving around on an infinite canvas.

const lightbox      = document.getElementById('lightbox');
const lbInner        = document.getElementById('lightboxInner');
const lbImg          = document.getElementById('lightboxImg');
const lbZoomLevelTxt = document.getElementById('lbZoomLevel');

const ZOOM_MIN  = 1;
const ZOOM_MAX  = 6;
const ZOOM_STEP = .35;     // how much each wheel notch / button click changes the scale

let scale = 1, originX = 0, originY = 0;   // originX/Y are pixel offsets, not percentages
let isPointerDown = false, dragStartX = 0, dragStartY = 0, originStartX = 0, originStartY = 0;

// Reapplies the current scale/offset to the image. `animated` controls whether
// the CSS transition is allowed to run — off during drag/wheel (so it tracks
// the pointer instantly), on for double-click and the +/- buttons (so those
// feel like a deliberate, eased jump rather than a snap).
function applyTransform(animated) {
  lbImg.classList.toggle('no-transition', !animated);
  lbImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  lbZoomLevelTxt.textContent = `${Math.round(scale * 100)}%`;
  lbInner.classList.toggle('zoomed', scale > 1.01);
}

// Keeps the pan offset within the range where the image still covers the
// viewport — once scale is back to 1 this always resolves to (0, 0).
function clampOrigin() {
  const rect = lbImg.getBoundingClientRect();
  const innerRect = lbInner.getBoundingClientRect();

  // how far the (already-scaled) image overhangs the viewport on each axis
  const overhangX = Math.max(0, (rect.width  - innerRect.width)  / 2);
  const overhangY = Math.max(0, (rect.height - innerRect.height) / 2);

  originX = Math.min(overhangX, Math.max(-overhangX, originX));
  originY = Math.min(overhangY, Math.max(-overhangY, originY));
}

// Zooms by `delta`, keeping the point under (clientX, clientY) visually
// fixed — this is what makes scroll-zoom feel like it's "zooming into"
// wherever your cursor happens to be, rather than always zooming on the center.
function zoomAt(clientX, clientY, delta, animated) {
  const prevScale = scale;
  scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
  if (scale === prevScale) return;

  const rect = lbImg.getBoundingClientRect();
  // cursor position relative to the image's own center, in current (unscaled) pixels
  const dx = (clientX - (rect.left + rect.width / 2)) / prevScale;
  const dy = (clientY - (rect.top  + rect.height / 2)) / prevScale;

  // shift the origin so that point stays under the cursor after the scale changes
  originX -= dx * (scale - prevScale);
  originY -= dy * (scale - prevScale);

  if (scale <= ZOOM_MIN) { originX = 0; originY = 0; }
  clampOrigin();
  applyTransform(animated);
}

function resetZoom() {
  scale = 1; originX = 0; originY = 0;
  applyTransform(true);
}

document.querySelectorAll('.popup').forEach(img => {
  img.addEventListener('click', () => {
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    resetZoom();
    lightbox.classList.add('active');
  });
});

document.getElementById('lightboxClose').addEventListener('click', closeLB);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLB(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && lightbox.classList.contains('active')) closeLB(); });

function closeLB() {
  lightbox.classList.remove('active');
  lbImg.src = '';
}

// Wheel = zoom toward the cursor. preventDefault stops the whole page from
// scrolling while you're zooming the image.
lbInner.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  zoomAt(e.clientX, e.clientY, delta, false);
}, { passive: false });

// Double-click: jump to 2x centered on the click point, or back to 1x if
// we're already zoomed in — a quick way to toggle without reaching for the buttons.
lbInner.addEventListener('dblclick', e => {
  if (scale > ZOOM_MIN + .01) {
    resetZoom();
  } else {
    zoomAt(e.clientX, e.clientY, 2 - ZOOM_MIN, true);
  }
});

// Click-and-drag panning, only once zoomed in (at scale 1 there's nowhere to pan to).
lbInner.addEventListener('pointerdown', e => {
  if (scale <= ZOOM_MIN + .01) return;
  isPointerDown = true;
  dragStartX = e.clientX; dragStartY = e.clientY;
  originStartX = originX; originStartY = originY;
  lbInner.classList.add('dragging');
  lbInner.setPointerCapture(e.pointerId);
});

lbInner.addEventListener('pointermove', e => {
  if (!isPointerDown) return;
  originX = originStartX + (e.clientX - dragStartX);
  originY = originStartY + (e.clientY - dragStartY);
  clampOrigin();
  applyTransform(false);
});

function endDrag() {
  isPointerDown = false;
  lbInner.classList.remove('dragging');
}
lbInner.addEventListener('pointerup', endDrag);
lbInner.addEventListener('pointercancel', endDrag);

// Pinch-to-zoom on touch: track the distance between two fingers and convert
// the change in distance into the same zoomAt() call the wheel handler uses,
// anchored on the midpoint between the two fingers.
let pinchStartDist = null, pinchStartScale = 1;

lbInner.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    const [a, b] = e.touches;
    pinchStartDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    pinchStartScale = scale;
  }
}, { passive: true });

lbInner.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinchStartDist) {
    e.preventDefault();
    const [a, b] = e.touches;
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const midX = (a.clientX + b.clientX) / 2;
    const midY = (a.clientY + b.clientY) / 2;
    const targetScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartScale * (dist / pinchStartDist)));
    zoomAt(midX, midY, targetScale - scale, false);
  }
}, { passive: false });

lbInner.addEventListener('touchend', () => { pinchStartDist = null; });

// On-screen buttons always zoom toward the center of the viewport, with the
// transition turned on since these are deliberate clicks, not continuous input.
document.getElementById('lbZoomIn').addEventListener('click', () => {
  const r = lbInner.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, ZOOM_STEP, true);
});
document.getElementById('lbZoomOut').addEventListener('click', () => {
  const r = lbInner.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, -ZOOM_STEP, true);
});
document.getElementById('lbReset').addEventListener('click', resetZoom);

// Recheck the pan boundaries if the window resizes while zoomed in, otherwise
// the image could end up clamped against stale dimensions from before the resize.
window.addEventListener('resize', () => {
  if (scale > ZOOM_MIN) { clampOrigin(); applyTransform(false); }
});

import Lenis from 'lenis';

/* ==========================================================================
   GLOBAL CONFIGURATION & FRAME PATHS
   ========================================================================== */
const TOTAL_FRAMES = 240;
const FRAME_PATH = (idx) => `/frames/frame_${String(idx).padStart(3, '0')}.webp`;

// Frame cache
const frames = [];
let loadedCount = 0;
let hasRenderedInitial = false;

// Render State
let currentFrame = 1;
let targetFrame = 1;

/* ==========================================================================
   1. LENIS SMOOTH SCROLL INITIALIZATION
   ========================================================================== */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* ==========================================================================
   2. FLOATING GLASS NAVBAR SCROLL DETECTION
   ========================================================================== */
const siteHeader = document.querySelector('.site-header');

window.addEventListener('scroll', () => {
  if (siteHeader) {
    if (window.scrollY > 40) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }
  }
}, { passive: true });

/* ==========================================================================
   3. BACKGROUND FRAME STREAM PRELOADER (INSTANT FIRST FRAME RENDER)
   ========================================================================== */
function preloadFrames() {
  // Load and render first frame immediately without delay
  const firstImg = new Image();
  firstImg.src = FRAME_PATH(1);
  firstImg.onload = () => {
    frames[1] = firstImg;
    renderCanvas();
  };
  if (firstImg.complete) {
    frames[1] = firstImg;
    renderCanvas();
  }

  // Preload all other frames in the background
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    if (i === 1) {
      frames[1] = firstImg;
      continue;
    }
    const img = new Image();
    img.src = FRAME_PATH(i);
    img.onload = () => {
      loadedCount++;
      if (Math.round(currentFrame) === i) {
        renderCanvas();
      }
    };
    img.onerror = () => {
      loadedCount++;
    };
    frames[i] = img;
  }
}

/* ==========================================================================
   4. FULL BLEED CANVAS RENDERER (60FPS LERP INTERPOLATION)
   ========================================================================== */
const canvas = document.getElementById('hero-canvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.scale(dpr, dpr);
  renderCanvas();
}
window.addEventListener('resize', resizeCanvas);

function renderCanvas() {
  if (!ctx || !canvas) return;
  let frameIdx = Math.min(Math.max(Math.round(currentFrame), 1), TOTAL_FRAMES);
  let img = frames[frameIdx];

  // Fallback to closest available frame if target frame is not yet fully loaded
  if (!img || !img.complete || img.naturalWidth === 0) {
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = frameIdx - offset;
      const next = frameIdx + offset;
      if (prev >= 1 && frames[prev]?.complete && frames[prev].naturalWidth > 0) {
        img = frames[prev];
        break;
      }
      if (next <= TOTAL_FRAMES && frames[next]?.complete && frames[next].naturalWidth > 0) {
        img = frames[next];
        break;
      }
    }
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  if (img && img.complete && img.naturalWidth > 0) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = w / h;
    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      renderW = w;
      renderH = w / imgRatio;
      offsetX = 0;
      offsetY = (h - renderH) / 2;
    } else {
      renderH = h;
      renderW = h * imgRatio;
      offsetX = (w - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }
}

// 60FPS Lerp Animation Loop
function updateAnimationLoop() {
  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.02) {
    currentFrame += diff * 0.18;
    renderCanvas();
  } else if (!hasRenderedInitial && frames[1]?.complete) {
    renderCanvas();
    hasRenderedInitial = true;
  }
  requestAnimationFrame(updateAnimationLoop);
}
requestAnimationFrame(updateAnimationLoop);

/* ==========================================================================
   5. SCROLL SYNC & 4-ACT STORYTELLING (SKETCH -> BLUEPRINT -> EXPLODED -> 360)
   ========================================================================== */
const heroStage = document.getElementById('hero-stage');
const actLayers = [
  document.getElementById('act-1'),
  document.getElementById('act-2'),
  document.getElementById('act-3'),
  document.getElementById('act-4')
];

function onScroll() {
  if (!heroStage) return;

  const rect = heroStage.getBoundingClientRect();
  const totalScroll = heroStage.offsetHeight - window.innerHeight;
  const currentScroll = -rect.top;
  const progress = Math.min(Math.max(currentScroll / totalScroll, 0), 1);

  // Update target frame smoothly from 1 to 240
  targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

  // 4 Act thresholds matching video badges
  let activeAct = 1;
  if (progress >= 0.75) {
    activeAct = 4;
  } else if (progress >= 0.50) {
    activeAct = 3;
  } else if (progress >= 0.25) {
    activeAct = 2;
  } else {
    activeAct = 1;
  }

  actLayers.forEach((layer, idx) => {
    if (layer) {
      if (idx + 1 === activeAct) {
        layer.classList.add('active');
      } else {
        layer.classList.remove('active');
      }
    }
  });

  // Sync left ambient scrim with active phase
  const heroLeftScrim = document.getElementById('hero-left-scrim');
  if (heroLeftScrim) {
    if (activeAct === 2) {
      heroLeftScrim.classList.add('blueprint-mode');
    } else {
      heroLeftScrim.classList.remove('blueprint-mode');
    }
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

/* ==========================================================================
   6. INTERACTIVE AERIAL SECTION WIDGETS (INTERIOR, WHEELS, EXTERIOR)
   ========================================================================== */

// 1. Interior Themes
const interiorBtns = document.querySelectorAll('#widget-interior .swatch-btn');
interiorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    interiorBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// 2. Wheels
const wheelBtns = document.querySelectorAll('#widget-wheels .wheel-btn');
wheelBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    wheelBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// 3. Exterior Colors
const exteriorBtns = document.querySelectorAll('#widget-exterior .swatch-btn');
const aerialOverlay = document.querySelector('.aerial-overlay-gradient');

exteriorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    exteriorBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const color = btn.dataset.color;
    if (aerialOverlay && color) {
      if (color === '#38bdf8') {
        aerialOverlay.style.background = 'linear-gradient(90deg, rgba(14, 165, 233, 0.45) 0%, rgba(56, 189, 248, 0.15) 50%, rgba(3, 105, 161, 0.55) 100%)';
      } else if (color === '#0f172a') {
        aerialOverlay.style.background = 'linear-gradient(90deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.2) 50%, rgba(15, 23, 42, 0.65) 100%)';
      } else {
        aerialOverlay.style.background = 'linear-gradient(90deg, rgba(3, 30, 48, 0.45) 0%, rgba(3, 30, 48, 0.1) 45%, rgba(3, 30, 48, 0.5) 100%)';
      }
    }
  });
});

/* ==========================================================================
   7. SMOOTH SCROLL ANCHORS
   ========================================================================== */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const targetId = anchor.getAttribute('href');
    if (targetId && targetId !== '#') {
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        lenis.scrollTo(targetEl, { duration: 1.2 });
      }
    }
  });
});

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
resizeCanvas();
preloadFrames();
onScroll();

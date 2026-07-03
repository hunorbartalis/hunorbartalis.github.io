/*
 * main.js — Hunor Bartalis-Szélyes portfolio
 *
 * Plain DOM/JS, no build step, no framework. Handles five small jobs:
 * scroll-triggered section reveals, the mobile sidebar drawer, the
 * Projects slider (including a lazy-loaded Three.js scene), the
 * slide-viewer toggle on the talks page, and the image lightbox.
 *
 * Original code, MIT-style "do what you like" terms — feel free to reuse.
 * This file does not bundle any third-party library code itself; jQuery,
 * Font Awesome, and Three.js (+ its OBJLoader/MTLLoader examples) are all
 * loaded separately from index.html — see that file's header comment for
 * their licenses.
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

// Single source of truth for the drawer's open/closed state so the button,
// the panel, the backdrop, and the ARIA attributes never drift out of sync.
function setMenu(open) {
  sidebar.classList.toggle('open', open);
  hamburger.classList.toggle('open', open);
  overlay.classList.toggle('active', open);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

hamburger.addEventListener('click', () => setMenu(!sidebar.classList.contains('open')));

// Tapping the dimmed backdrop behind the drawer closes it again.
overlay.addEventListener('click', () => setMenu(false));

// Escape closes the drawer for keyboard users.
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

// If the viewport grows back to the desktop layout while the drawer is open,
// drop the open state so it doesn't linger as a stray overlay.
window.addEventListener('resize', () => { if (window.innerWidth > 860) setMenu(false); });

// Picking any section link (topbar, drawer, or the brand) closes the drawer,
// otherwise it stays open and covers the section you just jumped to.
document.querySelectorAll('.nav-link, .topbar-brand').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

// =================================================================================================
// Active section highlighting (scroll spy)
// =================================================================================================
// Highlights whichever section link matches the part of the page currently in
// view. A thin observation band across the middle of the viewport decides the
// "current" section, and the matching links (in both the topbar and the drawer)
// get the .active class. Falls back gracefully if a section id is ever missing.
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const spySections = [...new Set(navLinks.map(a => a.getAttribute('href')))]
  .filter(href => href && href.startsWith('#'))
  .map(href => document.getElementById(href.slice(1)))
  .filter(Boolean);

function setActiveSection(id) {
  navLinks.forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'true');
    else    a.removeAttribute('aria-current');
  });
}

if (spySections.length) {
  const lastId = spySections[spySections.length - 1].id;
  const atBottom = () =>
    window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;

  const spy = new IntersectionObserver(entries => {
    // A short final section (e.g. Awards) may never reach the middle band, so
    // once the page is at the very bottom, always mark the last section active.
    if (atBottom()) { setActiveSection(lastId); return; }
    // Otherwise, of the sections crossing the band, take the highest on screen.
    const inBand = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (inBand.length) setActiveSection(inBand[0].target.id);
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  spySections.forEach(s => spy.observe(s));

  // The observer doesn't fire on every pixel of scroll, so also catch the
  // bottom of the page directly — this makes the last link reliably light up.
  window.addEventListener('scroll', () => {
    if (atBottom()) setActiveSection(lastId);
  }, { passive: true });
}

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
// Projects slider
// =================================================================================================
// One project fills the viewport at a time inside .project-track. The dots
// and arrows just scroll the track to the next/previous slide's position —
// scroll-snap (in the CSS) handles settling neatly into place, so this code
// doesn't need to do any of the snapping math itself, only decide where to go.
const projectTrack = document.getElementById('projectTrack');

if (projectTrack) {
  const slides   = Array.from(projectTrack.querySelectorAll('.project-slide'));
  const prevBtn  = document.getElementById('projectPrev');
  const nextBtn  = document.getElementById('projectNext');
  const dotsWrap = document.getElementById('projectDots');
  const slider   = projectTrack.closest('.project-slider');

  // With a single project there's nothing to navigate between — hide the
  // whole nav row rather than show arrows and a lone dot that do nothing.
  if (slides.length <= 1) {
    slider.classList.add('single-slide');
  } else {
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'project-dot';
      dot.setAttribute('aria-label', `Go to project ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsWrap.appendChild(dot);
    });
  }

  const dots = Array.from(dotsWrap.children);

  function currentIndex() {
    return Math.round(projectTrack.scrollLeft / projectTrack.clientWidth);
  }

  function updateNav() {
    const i = currentIndex();
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
    dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
  }

  function goToSlide(i) {
    projectTrack.scrollTo({ left: i * projectTrack.clientWidth, behavior: 'smooth' });
  }

  prevBtn?.addEventListener('click', () => goToSlide(Math.max(0, currentIndex() - 1)));
  nextBtn?.addEventListener('click', () => goToSlide(Math.min(slides.length - 1, currentIndex() + 1)));

  // Scroll fires continuously while snapping, so this only needs a light
  // debounce to avoid recalculating on every pixel of the animation.
  let scrollTimer;
  projectTrack.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateNav, 60);
  });

  // The track width is part of the math above, so a resize needs the same
  // recheck a scroll would trigger.
  window.addEventListener('resize', updateNav);

  updateNav();

  // Each slide that has a 3D scene (data-scene="...") gets it lazy-loaded
  // the moment that slide's media area scrolls into view, rather than at
  // page load — the underlying OBJ model is a large download, and most
  // visitors never scroll this far, so there's no reason to pay for it upfront.
  slides.forEach(slide => {
    const sceneId = slide.dataset.scene;
    if (!sceneId) return;
    const mount = document.getElementById(`scene-${sceneId}`);
    if (!mount) return;

    const sceneObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        initProjectScene(sceneId);
        sceneObserver.disconnect();
      }
    }, { threshold: .25 });
    sceneObserver.observe(slide);
  });
}

// =================================================================================================
// Project 3D scene — All-Optical Visual Prosthesis
// =================================================================================================
// A small, self-contained Three.js scene: a transparent head + brain model
// with a glowing "objective" (the light-delivery/readout device) firing a
// cone of stimulation and readout beams onto the cortex, plus an animated
// monitor screen feeding the encoder a constantly-changing test pattern.
// Everything loops seamlessly over an 18-second cycle.
//
// initProjectScene() is the only thing called from outside this block — it's
// triggered once by the IntersectionObserver above, the first time the
// slide scrolls into view. Everything else here is private to that one call.
function initProjectScene(sceneId) {
  const mount   = document.getElementById(`scene-${sceneId}`);
  const loading = document.getElementById(`sceneLoading-${sceneId}`);
  const pauseBtn = document.getElementById(`scenePause-${sceneId}`);
  if (!mount || typeof THREE === 'undefined') return;

  const state = {
    dur: 18,          // seamless loop period, in seconds
    t: 0,
    screenTime: 0,
    playing: true,
    stimColor: new THREE.Color('#ff3b3b'),  // red = optogenetic stimulation
    readColor: new THREE.Color('#36a2ff'),  // blue = voltage-imaging readout
    showScreen: true,
  };

  let renderer, scene, camera, clock, raf;

  // -----------------------------------------------------------------------
  // Boot: renderer, scene, lights, camera — then kick off the model load
  // -----------------------------------------------------------------------
  function init() {
    const W = mount.clientWidth, H = mount.clientHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070e);
    scene.fog = new THREE.FogExp2(0x05070e, 0.035);

    camera = new THREE.PerspectiveCamera(36, W / H, 0.01, 200);

    scene.add(new THREE.AmbientLight(0x35507a, 0.55));
    scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x10141f, 0.5));
    const key = new THREE.DirectionalLight(0xdfeaff, 1.15); key.position.set(2, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x3f6cff, 0.85); rim.position.set(-3, 2, -4); scene.add(rim);
    const warm = new THREE.PointLight(0xff7a55, 0.45, 0); warm.position.set(-2, 1.5, 2); scene.add(warm);

    window.addEventListener('resize', onResize);
    loadModel();
  }

  function onResize() {
    if (!renderer) return;
    const W = mount.clientWidth, H = mount.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    updateAnnotations();
  }

  // -----------------------------------------------------------------------
  // Model loading — the actual 14MB payload, fetched only now that the
  // section is on screen
  // -----------------------------------------------------------------------
  function loadModel() {
    const basePath = 'assets/models/all-optical-prosthesis/';
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(basePath);
    mtlLoader.load('AllOpticalVisualProsthesis.mtl', materials => {
      materials.preload();
      const objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(basePath);
      objLoader.load('AllOpticalVisualProsthesis.obj', onModelLoaded);
    });
  }

  // Tagging meshes by name lets one shared OBJ work for the head (mostly
  // transparent, so you can see inside it), the brain (semi-transparent,
  // gently glowing), the glasses, and the objective body ("ms").
  function onModelLoaded(root) {
    scene.add(root);

    const brainMeshes = [];
    const boxes = {};

    root.traverse(c => {
      if (!c.isMesh) return;
      c.frustumCulled = false;
      const name = (c.name || '').toLowerCase();
      const mats = Array.isArray(c.material) ? c.material : [c.material];

      mats.forEach(m => {
        if (!m) return;
        if (name.indexOf('head') >= 0) {
          m.transparent = true; m.opacity = 0.20; m.depthWrite = false;
          m.color = new THREE.Color(0x9fb4d8); m.shininess = 60;
          m.specular = new THREE.Color(0x6f8ec0); m.side = THREE.FrontSide;
        } else if (name.indexOf('brain') >= 0) {
          m.transparent = true; m.opacity = 0.55; m.depthWrite = false;
          m.color = new THREE.Color(0xe2e7f0); m.emissive = new THREE.Color(0x223247);
          m.emissiveIntensity = 0.22; m.shininess = 32;
          m.specular = new THREE.Color(0x8a99b4); m.side = THREE.FrontSide;
        } else if (name.indexOf('glass') >= 0) {
          m.color = new THREE.Color(0x10131c); m.shininess = 120;
          m.specular = new THREE.Color(0x445566);

          // Neon signal trace: rather than a separate object floating near
          // the glasses, the glow is injected directly into the glasses'
          // own material so the light appears to travel through the real
          // mesh surface. Measuring this model's Glasses geometry directly
          // (not just by variance, which is dominated by the lens-to-lens
          // width) shows local Z is the front-to-back depth: the lens face
          // sits at the +Z end, the temple/earpiece tip at the -Z end. A
          // band of brightness swept along local Z reads as "signal
          // flowing front-to-back through the frame," which is what we want.
          //
          // uSweepCenter is updated every frame in updateScene() to slide
          // the band from the lens end (-1) to the earpiece end (+1) and
          // back, looping. uSweepWidth controls how tight the glowing
          // band is — narrow band = a traveling pulse, not a static glow.
          const sweepUniforms = {
            uSweepCenter: { value: -1 },
            uSweepWidth:  { value: 0.22 },
            uSweepColor:  { value: new THREE.Color(0x6fe8ff) },
            uSweepStrength: { value: 0 }, // 0 when idle, ramps up while a pulse is in flight
            uLocalMinZ: { value: 0 },
            uLocalMaxZ: { value: 0 },
          };
          m.onBeforeCompile = shader => {
            Object.assign(shader.uniforms, sweepUniforms);
            shader.vertexShader = shader.vertexShader
              .replace('#include <common>', `#include <common>\nvarying float vSweepLocalZ;`)
              .replace('#include <begin_vertex>', `#include <begin_vertex>\nvSweepLocalZ = position.z;`);
            shader.fragmentShader = shader.fragmentShader
              .replace('#include <common>', `#include <common>
                varying float vSweepLocalZ;
                uniform float uSweepCenter;
                uniform float uSweepWidth;
                uniform vec3  uSweepColor;
                uniform float uSweepStrength;
                uniform float uLocalMinZ;
                uniform float uLocalMaxZ;
              `)
              .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                {
                  // normalize this vertex's local Z (front-to-back depth)
                  // into -1..1 across the glasses' actual extent, so the
                  // sweep works regardless of the model's absolute units
                  float span = max(0.0001, uLocalMaxZ - uLocalMinZ);
                  float u = (vSweepLocalZ - uLocalMinZ) / span * 2.0 - 1.0;
                  float d = abs(u - uSweepCenter);
                  float band = smoothstep(uSweepWidth, 0.0, d);
                  totalEmissiveRadiance += uSweepColor * band * uSweepStrength;
                }
              `);
            m.userData.sweepShader = shader;
          };
          m.userData.sweepUniforms = sweepUniforms;
          // force a recompile so onBeforeCompile actually runs (materials
          // loaded from MTL already have a cached program otherwise)
          m.needsUpdate = true;
        } else if (name === 'ms' || name.indexOf('default') >= 0) {
          m.color = new THREE.Color(0x222a38); m.shininess = 80;
          m.specular = new THREE.Color(0x556);
        } else if (name.indexOf('monitor') >= 0) {
          m.color = new THREE.Color(0x12161d);
        }
      });

      if (name.indexOf('brain') >= 0) brainMeshes.push(c);
      if (name === 'ms') state.msMesh = c;
      if (name.indexOf('glass') >= 0) {
        state.glassesMesh = c;
        // local-space Z extent (not world-space) since the shader reads
        // the raw `position` attribute, which is in local/object space.
        // Z is the front-to-back axis here: lens face at one end, temple
        // tip / earpiece at the other. We keep the FULL local position of
        // whichever real vertex achieves each extreme — not just the Z
        // scalar — because the earpiece tip sits well off to the side and
        // up at head height, not at the model's X=0,Y=0 origin column.
        if (c.geometry?.attributes.position) {
          const posAttr = c.geometry.attributes.position;
          let lminZ = Infinity, lmaxZ = -Infinity;
          let minZVertex = new THREE.Vector3();
          let maxZVertex = new THREE.Vector3();
          for (let vi = 0; vi < posAttr.count; vi++) {
            const x = posAttr.getX(vi), y = posAttr.getY(vi), z = posAttr.getZ(vi);
            if (z < lminZ) { lminZ = z; minZVertex.set(x, y, z); }
            if (z > lmaxZ) { lmaxZ = z; maxZVertex.set(x, y, z); }
          }
          state.glassesLocalMinZ = lminZ;
          state.glassesLocalMaxZ = lmaxZ;
          state.glassesMinZVertexLocal = minZVertex;
          state.glassesMaxZVertexLocal = maxZVertex;
        }
      }

      const b = new THREE.Box3().setFromObject(c);
      const key = name.indexOf('head') >= 0 ? 'head'
                 : name.indexOf('brain') >= 0 ? 'brain'
                 : name.indexOf('glass') >= 0 ? 'glasses'
                 : name.indexOf('monitor') >= 0 ? 'monitor'
                 : name === 'ms' ? 'ms' : null;
      if (key) { boxes[key] = boxes[key] ? boxes[key].clone().union(b) : b.clone(); }
    });

    state.boxes = boxes;
    state.brainMeshes = brainMeshes;

    const center = (box, fallback) => box ? box.getCenter(new THREE.Vector3()) : fallback.clone();
    const defaultCenter = new THREE.Vector3(0, 1.6, 0);

    state.brainCenter   = center(boxes.brain, defaultCenter);
    state.glassesCenter = center(boxes.glasses, defaultCenter);
    state.monitorCenter = center(boxes.monitor, defaultCenter);
    state.brainSize   = boxes.brain   ? boxes.brain.getSize(new THREE.Vector3())   : new THREE.Vector3(0.9, 1.0, 1.1);
    state.monitorSize = boxes.monitor ? boxes.monitor.getSize(new THREE.Vector3()) : new THREE.Vector3(3, 1.8, 0.6);
    state.back = new THREE.Vector3(0, 0, -1);

    buildCortexTargets();
    buildObjectiveGlow();
    buildWirelessLink();
    buildWirelessArcs();
    buildStimulationBeams();
    if (state.showScreen) {
      buildMonitorScreen();
      buildCaptureBeams();
    }

    if (loading) loading.classList.add('is-hidden');
    clock = new THREE.Clock();
    setStaticCamera();
    initAnnotations();
    loop();
  }

  // -----------------------------------------------------------------------
  // Scene construction — finds where the objective is aiming on the cortex
  // surface, then builds the beams and screen animation around that point
  // -----------------------------------------------------------------------
  function buildCortexTargets() {
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const bs = state.brainSize, aim = state.brainCenter.clone(), diag = bs.length();

    let dir0;
    if (state.boxes.ms) {
      const mb = state.boxes.ms;
      const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
      dir0 = new THREE.Vector3(
        clamp(aim.x, mb.min.x, mb.max.x),
        clamp(aim.y, mb.min.y, mb.max.y),
        clamp(aim.z, mb.min.z, mb.max.z)
      ).sub(aim);
    } else {
      dir0 = state.back.clone();
    }
    if (dir0.length() < 1e-3) dir0 = state.back.clone();
    dir0.normalize();

    let right0 = new THREE.Vector3().crossVectors(dir0, new THREE.Vector3(0, 1, 0));
    if (right0.length() < 1e-3) right0.set(1, 0, 0);
    right0.normalize();
    const up1 = new THREE.Vector3().crossVectors(right0, dir0).normalize();
    const O = aim.clone().add(dir0.clone().multiplyScalar(diag * 0.7));

    const G = 10, block = 2;
    const spreadX = bs.x * 0.20, spreadY = bs.y * 0.18;
    const normalMat = new THREE.Matrix3();
    const pts = [], norms = [], pattern = [];
    let centerHit = null, centerNormal = null;
    const cmid = Math.floor((G - 1) / 2);

    for (let i = 0; i < G; i++) {
      for (let j = 0; j < G; j++) {
        const fi = (i / (G - 1) - 0.5) * 2, fj = (j / (G - 1) - 0.5) * 2;
        const ox = O.clone()
          .add(right0.clone().multiplyScalar(fi * spreadX))
          .add(up1.clone().multiplyScalar(fj * spreadY));
        const dir = aim.clone().sub(ox).normalize();
        ray.set(ox, dir);
        const hits = ray.intersectObjects(state.brainMeshes, true);
        if (!hits.length) continue;
        const h = hits[0];
        let wn = h.face
          ? h.face.normal.clone().applyMatrix3(normalMat.getNormalMatrix(h.object.matrixWorld)).normalize()
          : dir.clone().negate();
        if (wn.dot(dir) > 0) wn.negate();
        const p = h.point.clone().add(wn.clone().multiplyScalar(diag * 0.010));
        const cx = Math.floor(i / block), cy = Math.floor(j / block);
        pts.push(p); norms.push(wn); pattern.push(((cx + cy) % 2) === 0);
        if (i === cmid && j === cmid) { centerHit = h.point.clone(); centerNormal = wn.clone(); }
      }
    }

    if (!centerHit) {
      centerHit = aim.clone().add(dir0.clone().multiplyScalar(bs.z * 0.5));
      centerNormal = dir0.clone();
    }

    state.poolPts = pts;
    state.poolNorms = norms;
    state.cortexPoint = centerHit;
    state.cortexNormal = centerNormal;
    state.msTip = computeObjectiveTip();
  }

  // The tip of the objective ("ms" mesh) is wherever its own end-cap closest
  // to the brain is, found by projecting all its vertices onto the
  // head-to-brain axis and averaging the ones at the far end.
  function computeObjectiveTip() {
    if (!state.msMesh || !state.msMesh.geometry?.attributes.position || !state.boxes.ms) {
      return state.cortexPoint.clone().add(state.cortexNormal.clone().multiplyScalar(state.brainSize.length() * 0.05));
    }
    state.msMesh.updateWorldMatrix(true, false);
    const pos = state.msMesh.geometry.attributes.position;
    const msCenter = state.boxes.ms.getCenter(new THREE.Vector3());
    const dir = state.brainCenter.clone().sub(msCenter).normalize();

    const v = new THREE.Vector3();
    const samples = [];
    let min = Infinity, max = -Infinity;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(state.msMesh.matrixWorld);
      const proj = v.dot(dir);
      samples.push([v.x, v.y, v.z, proj]);
      if (proj < min) min = proj;
      if (proj > max) max = proj;
    }

    const threshold = max - (max - min) * 0.05;
    let sx = 0, sy = 0, sz = 0, count = 0;
    for (const s of samples) {
      if (s[3] >= threshold) { sx += s[0]; sy += s[1]; sz += s[2]; count++; }
    }
    return count ? new THREE.Vector3(sx / count, sy / count, sz / count) : msCenter;
  }

  function buildObjectiveGlow() {
    const diag = state.brainSize.length();
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(diag * 0.018, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff5638, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.position.copy(state.msTip);
    scene.add(glow);
    state.objGlow = glow;
  }

  // Mirrors computeObjectiveTip(), but finds the opposite end: the back
  // of the objective body, farthest FROM the brain rather than closest
  // to it. computeObjectiveTip() keeps vertices with the highest
  // projection along (brainCenter - msCenter) — i.e. the end nearest the
  // brain, where the beams actually originate. This does the same
  // sampling but keeps the LOWEST-projection vertices instead, which is
  // the far end of the objective's physical body.
  function computeObjectiveBack() {
    if (!state.msMesh || !state.msMesh.geometry?.attributes.position || !state.boxes.ms) {
      return state.msTip.clone();
    }
    state.msMesh.updateWorldMatrix(true, false);
    const pos = state.msMesh.geometry.attributes.position;
    const msCenter = state.boxes.ms.getCenter(new THREE.Vector3());
    const dir = state.brainCenter.clone().sub(msCenter).normalize();

    const v = new THREE.Vector3();
    const samples = [];
    let min = Infinity, max = -Infinity;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(state.msMesh.matrixWorld);
      const proj = v.dot(dir);
      samples.push([v.x, v.y, v.z, proj]);
      if (proj < min) min = proj;
      if (proj > max) max = proj;
    }

    // the back is the LOW end of the projection range, mirroring
    // computeObjectiveTip()'s use of the high end
    const threshold = min + (max - min) * 0.05;
    let sx = 0, sy = 0, sz = 0, count = 0;
    for (const s of samples) {
      if (s[3] <= threshold) { sx += s[0]; sy += s[1]; sz += s[2]; count++; }
    }
    return count ? new THREE.Vector3(sx / count, sy / count, sz / count) : msCenter;
  }

  // Drives the neon sweep that travels through the glasses' own mesh
  // material, from the lens side (facing the monitor) to the earpiece
  // side (facing the objective) — see the 'glass' branch in
  // onModelLoaded for the actual shader injection. This function just
  // figures out which physical end of the glasses is the earpiece and
  // stores that as a sign the per-frame update can use.
  function buildWirelessLink() {
    if (state.glassesMesh && state.glassesMesh.material) {
      const mat = Array.isArray(state.glassesMesh.material) ? state.glassesMesh.material[0] : state.glassesMesh.material;
      const u = mat.userData.sweepUniforms;
      if (u) {
        u.uLocalMinZ.value = state.glassesLocalMinZ;
        u.uLocalMaxZ.value = state.glassesLocalMaxZ;
      }
    }

    // Figure out which physical end of the glasses (local Z = min, or
    // local Z = max — the front-to-back axis) is the earpiece nearer the
    // objective, working in world space via the mesh's own matrix so this
    // is correct regardless of how the glasses are rotated in the scene.
    // Uses the REAL vertex at each Z extreme (full local X/Y/Z, captured
    // in onModelLoaded) rather than a synthesized (0,0,z) point — the
    // earpiece tip sits well off the model's central axis, up at head
    // height and out to the side, so zeroing X/Y would land near the
    // coordinate origin instead of anywhere close to the actual ear.
    const mesh = state.glassesMesh;
    let earpieceIsMaxZ = true;
    let earpieceWorld = state.glassesCenter.clone();

    if (mesh && state.glassesMinZVertexLocal && state.glassesMaxZVertexLocal) {
      mesh.updateWorldMatrix(true, false);
      const minPoint = state.glassesMinZVertexLocal.clone().applyMatrix4(mesh.matrixWorld);
      const maxPoint = state.glassesMaxZVertexLocal.clone().applyMatrix4(mesh.matrixWorld);
      const distToMinSide = minPoint.distanceTo(state.msTip);
      const distToMaxSide = maxPoint.distanceTo(state.msTip);
      earpieceIsMaxZ = distToMaxSide < distToMinSide;
      earpieceWorld = earpieceIsMaxZ ? maxPoint : minPoint;
    }

    // Start a touch forward of the earpiece itself (back toward the lens
    // side) and end a touch short of the very back of the objective —
    // small nudges on both ends so the waves begin a bit earlier and
    // finish a bit sooner than the exact earpiece/back-of-objective points.
    const objectiveBack = computeObjectiveBack();
    const travelAxis = objectiveBack.clone().sub(earpieceWorld);
    const travelLength = travelAxis.length();
    const travelDir = travelAxis.clone().normalize();

    state.wirelessStart = earpieceWorld.clone().addScaledVector(travelDir, -travelLength * 2);
    state.wirelessEnd = objectiveBack.clone().addScaledVector(travelDir, -travelLength * 0.3);

    // store the sweep direction as a sign so updateScene() can drive the
    // shader's uSweepCenter from -1 (lens) toward whichever sign (+1 or
    // -1) actually corresponds to the earpiece for this model
    state.glassesSweepEarpieceSign = earpieceIsMaxZ ? 1 : -1;
  }

  // Wifi-style signal arcs traveling from the glasses' earpiece to the
  // objective, matching the direction the neon sweep already travels.
  //
  // Deliberately built as a genuinely FLAT 2D shape (THREE.ShapeGeometry,
  // not a sphere/torus/tube swept through 3D), then billboarded to face
  // the camera every frame the exact same way the very first working
  // version of this effect did. This sidesteps every category of bug we
  // ran into with 3D orientation (pole axes, basis vectors, roll
  // ambiguity) — a flat shape that always faces the camera has no
  // "which way is it pointing in 3D" question to get wrong.
  function buildWirelessArcs() {
    const diag = state.brainSize.length();

    // a single crescent/arc outline, drawn once in 2D and reused by
    // every instance — looks like one ring of a wifi icon: a thick arc,
    // open on one side, like a backwards "C". Centered on angle 0 so the
    // arc's curved bulge faces right (+X in the shape's own local plane,
    // which maps to screen-right once billboarded), with its open mouth
    // facing left.
    const outerR = 1, innerR = 0.72;
    const arcSpan = Math.PI * 0.85; // a bit less than a semicircle
    const arcStart = -arcSpan / 2;

    const shape = new THREE.Shape();
    for (let i = 0; i <= 32; i++) {
      const t = arcStart + (i / 32) * arcSpan;
      const x = Math.cos(t) * outerR, y = Math.sin(t) * outerR;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    for (let i = 32; i >= 0; i--) {
      const t = arcStart + (i / 32) * arcSpan;
      const x = Math.cos(t) * innerR, y = Math.sin(t) * innerR;
      shape.lineTo(x, y);
    }
    shape.closePath();

    const arcGeo = new THREE.ShapeGeometry(shape, 32);

    const arcCount = 3;
    state.wirelessArcs = [];
    for (let i = 0; i < arcCount; i++) {
      const mesh = new THREE.Mesh(
        arcGeo,
        new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      mesh.userData.offset = i / arcCount;
      mesh.frustumCulled = false;
      scene.add(mesh);
      state.wirelessArcs.push(mesh);
    }
  }

  // The visible "light show": a cone of thin tubes from the objective tip
  // down to a pool of points on the cortex surface. Red tubes = stimulation,
  // blue tubes = simultaneous readout — both flicker independently so it
  // reads as a single beam rapidly time-multiplexing across targets.
  function buildStimulationBeams() {
    const diag = state.brainSize.length();
    state.redTubes = []; state.blueTubes = [];
    const ray = new THREE.Raycaster();
    const origin = state.msTip.clone();
    const axis0 = state.brainCenter.clone().sub(origin).normalize();

    let surf = state.cortexPoint.clone(), normal = state.cortexNormal.clone().normalize();
    ray.set(origin, axis0);
    const hit0 = ray.intersectObjects(state.brainMeshes, true);
    if (hit0.length) {
      surf = hit0[0].point.clone();
      if (hit0[0].face) {
        const nm = new THREE.Matrix3().getNormalMatrix(hit0[0].object.matrixWorld);
        normal = hit0[0].face.normal.clone().applyMatrix3(nm).normalize();
        if (normal.dot(axis0) > 0) normal.negate();
      }
    }

    let holeR = diag * 0.03;
    if (state.boxes.ms) {
      const s = state.boxes.ms.getSize(new THREE.Vector3());
      holeR = Math.min(s.x, s.z) * 0.32;
    }

    const L = Math.max(1e-3, surf.clone().sub(origin).length());
    const coneAngle = Math.atan(holeR / L);
    let e1 = new THREE.Vector3().crossVectors(axis0, new THREE.Vector3(0, 1, 0));
    if (e1.length() < 1e-3) e1.crossVectors(axis0, new THREE.Vector3(1, 0, 0));
    e1.normalize();
    const e2 = new THREE.Vector3().crossVectors(axis0, e1).normalize();

    const n = state.poolPts.length;
    let seed = 31;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    for (let k = 0; k < n; k++) {
      const ang = Math.sqrt(rnd()) * coneAngle;
      const az = rnd() * Math.PI * 2;
      const dir = axis0.clone()
        .multiplyScalar(Math.cos(ang))
        .add(e1.clone().multiplyScalar(Math.sin(ang) * Math.cos(az)))
        .add(e2.clone().multiplyScalar(Math.sin(ang) * Math.sin(az)))
        .normalize();

      ray.set(origin, dir);
      const hits = ray.intersectObjects(state.brainMeshes, true);
      const target = hits.length ? hits[0].point.clone() : surf.clone();

      const mid = origin.clone().add(target).multiplyScalar(0.5);
      const segment = target.clone().sub(origin);
      const len = segment.length();
      segment.normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), segment);

      const geo = new THREE.CylinderGeometry(diag * 0.0016, diag * 0.0009, len, 8, 1, true);
      const red  = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: state.stimColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      const blue = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: state.readColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      red.position.copy(mid); red.quaternion.copy(quat);
      blue.position.copy(mid); blue.quaternion.copy(quat);
      red.renderOrder = 5; blue.renderOrder = 6;
      red.frustumCulled = false; blue.frustumCulled = false;
      scene.add(red, blue);
      state.redTubes.push(red); state.blueTubes.push(blue);
    }

    // a handful of pre-computed "stimulation patterns" (random subsets of
    // ~14 targets) that the loop cycles through, crossfading between them
    const K = 6, M = Math.min(15, Math.max(8, Math.round(n * 0.18)));
    let seed2 = 7;
    const rnd2 = () => { seed2 = (seed2 * 1103515245 + 12345) & 0x7fffffff; return seed2 / 0x7fffffff; };
    state.patterns = [];
    for (let p = 0; p < K; p++) {
      const idx = [], used = {};
      while (idx.length < M) {
        const r = Math.floor(rnd2() * n);
        if (!used[r]) { used[r] = 1; idx.push(r); }
      }
      state.patterns.push(idx);
    }
    state.phases = state.poolPts.map(() => rnd2() * Math.PI * 2);
  }

  function buildMonitorScreen() {
    const w = state.monitorSize.x * 0.92, h = state.monitorSize.y * 0.72;
    state.scrW = w; state.scrH = h;
    const cvW = 960, cvH = Math.round(cvW * (h / w));
    const canvas = document.createElement('canvas');
    canvas.width = cvW; canvas.height = cvH;
    state.scrCv = canvas;
    state.scrCtx = canvas.getContext('2d');

    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    state.scrTex = tex;
    drawScreenFrame(0);

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    const sc = state.monitorCenter.clone().add(new THREE.Vector3(0, state.monitorSize.y * 0.1, -state.monitorSize.z * 0.25));
    plane.position.copy(sc);
    plane.lookAt(sc.clone().add(new THREE.Vector3(0, 0, -1)));
    scene.add(plane);
    state.monScreenCenter = sc.clone();
  }

  // Simple changing test pattern on the monitor — a random shape every
  // 0.8s — standing in for the kind of visual stimulus the encoder would
  // actually be reading from in a real experiment.
  function drawScreenFrame(t) {
    const ctx = state.scrCtx;
    const W = state.scrCv.width, H = state.scrCv.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (!state.currentShape || t >= state.nextChangeTime) {
      state.nextChangeTime = t + 0.8;
      const margin = 60;
      state.currentShape = {
        x: margin + Math.random() * (W - 2 * margin),
        y: margin + Math.random() * (H - 2 * margin),
        size: 40 + Math.random() * 60,
        type: Math.floor(Math.random() * 3),
      };
    }

    const o = state.currentShape;
    ctx.fillStyle = '#fff';
    if (o.type === 0) {
      ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === 1) {
      ctx.fillRect(o.x - o.size, o.y - o.size, o.size * 2, o.size * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(o.x, o.y - o.size);
      ctx.lineTo(o.x - o.size, o.y + o.size);
      ctx.lineTo(o.x + o.size, o.y + o.size);
      ctx.closePath();
      ctx.fill();
    }
    state.scrTex.needsUpdate = true;
  }

  // Beams of "image light" converging from across the screen onto both
  // glasses lenses — the visual counterpart to the screen acting as the
  // thing being captured, rather than just displayed.
  function buildCaptureBeams() {
    const diag = state.brainSize.length();
    const sc = state.monScreenCenter;
    const w = state.scrW, h = state.scrH;
    const up = new THREE.Vector3(0, 1, 0);
    const facing = sc.clone().sub(state.glassesCenter); facing.y = 0;
    if (facing.length() < 1e-3) facing.set(-1, 0, 0);
    facing.normalize();
    const eyeAxis = new THREE.Vector3().crossVectors(up, facing).normalize();
    const gs = state.boxes.glasses ? state.boxes.glasses.getSize(new THREE.Vector3()) : new THREE.Vector3(0.3, 0.1, 0.2);
    const sep = (Math.abs(gs.x * eyeAxis.x) + Math.abs(gs.z * eyeAxis.z)) * 0.24 || diag * 0.04;
    const base = state.glassesCenter.clone();
    base.x += (sc.x - base.x) * 0.3; base.z += (sc.z - base.z) * 0.3;
    const foci = [
      base.clone().add(eyeAxis.clone().multiplyScalar(sep)),
      base.clone().add(eyeAxis.clone().multiplyScalar(-sep)),
    ];

    state.captureBeams = []; state.captureGlows = [];
    foci.forEach((focus, fi) => {
      const cols = 3, rows = 3;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const dx = (i / (cols - 1) - 0.5) * w * 0.66;
          const dy = (j / (rows - 1) - 0.5) * h * 0.66;
          const start = sc.clone().add(new THREE.Vector3(dx, dy, 0));
          const dir = focus.clone().sub(start);
          const len = dir.length();
          dir.normalize();
          const mid = start.clone().add(focus).multiplyScalar(0.5);
          const geo = new THREE.CylinderGeometry(diag * 0.0012, diag * 0.0012, len, 6, 1, true);
          const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
          mesh.position.copy(mid);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          mesh.renderOrder = 4; mesh.frustumCulled = false;
          mesh.userData.phase = (i * rows + j) * 0.7 + fi * 0.4;
          scene.add(mesh);
          state.captureBeams.push(mesh);
        }
      }
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(diag * 0.012, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xaef0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      glow.position.copy(focus);
      scene.add(glow);
      state.captureGlows.push(glow);
    });
  }

  // Fixed framing — replicates the original reference video exactly: a wide
  // side-on shot with both the head/objective and the monitor in frame. The
  // source scene computed this as a lerp that's frozen at its starting
  // value (u=0), so these numbers are that starting value, not a new guess.
  function setStaticCamera() {
    const az = 104 * Math.PI / 180;
    const el = 13  * Math.PI / 180;
    const dist = 5.0;
    // wide midpoint between the glasses and the monitor — same as the
    // original scene's _sceneMid(), so both ends up in shot
    const target = new THREE.Vector3(
      0,
      state.glassesCenter.y,
      (state.glassesCenter.z + (state.showScreen ? 0.9 : 0)) * 0.5 + 0.2
    );

    camera.position.set(
      target.x + dist * Math.cos(el) * Math.sin(az),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(target);
  }

  function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  // -----------------------------------------------------------------------
  // Per-frame update — advances the loop clock and animates beam opacity,
  // the screen pattern, and the capture-beam glow
  // -----------------------------------------------------------------------
  function updateScene() {
    const T = state.dur, n = state.poolPts.length, K = state.patterns.length;
    const switches = 90; // integer switches per loop keeps the seam invisible
    const seg = (state.t / T) * switches;
    const pi = Math.floor(seg) % K, piNext = (pi + 1) % K;
    const blend = seg - Math.floor(seg);
    const crossfade = smooth01(Math.max(0, (blend - 0.7) / 0.3));

    const redIntensity = new Float32Array(n);
    state.patterns[pi].forEach(i => { redIntensity[i] = Math.max(redIntensity[i], 1 - crossfade); });
    state.patterns[piNext].forEach(i => { redIntensity[i] = Math.max(redIntensity[i], crossfade); });

    const fR = 2 * Math.PI * 108 / T, fB = 2 * Math.PI * 90 / T;
    for (let i = 0; i < n; i++) {
      const a = redIntensity[i];
      if (a <= 0) { state.redTubes[i].material.opacity = 0; state.blueTubes[i].material.opacity = 0; continue; }
      const flickerR = 0.2 + 0.8 * Math.max(0, Math.sin(state.t * fR + state.phases[i]));
      const flickerB = 0.2 + 0.8 * Math.max(0, Math.sin(state.t * fB + state.phases[i] + 2.1));
      state.redTubes[i].material.opacity  = a * flickerR * 0.92;
      state.blueTubes[i].material.opacity = a * flickerB * 0.45;
    }

    if (state.scrCtx) drawScreenFrame(state.screenTime);
    if (state.objGlow) state.objGlow.material.opacity = 0.22 + 0.22 * Math.abs(Math.sin(state.t * 9));

    // Neon sweep through the glasses' own mesh material, from the lens
    // side to the earpiece side — driven by uniforms on the glasses'
    // shader (see the 'glass' branch in onModelLoaded for the injection).
    // Loops continuously on its own; the objective's glow above already
    // pulses independently and doesn't need to be triggered by this.
    if (state.glassesMesh) {
      const cycle = 0.5;
      const phase = (state.t / cycle) % 1;
      const mat = Array.isArray(state.glassesMesh.material) ? state.glassesMesh.material[0] : state.glassesMesh.material;
      const u = mat && mat.userData.sweepUniforms;

      if (u) {
        const easedFrame = smooth01(phase);
        // slide from -sign (lens) to +sign (earpiece), where sign is
        // whichever local-Z direction we determined is the earpiece
        const sign = state.glassesSweepEarpieceSign;
        u.uSweepCenter.value = -sign + easedFrame * (2 * sign);
        // brightest mid-travel, soft fade at both ends so the glow
        // doesn't pop in at the lens or vanish abruptly at the earpiece
        const fadeIn  = smooth01(phase / 0.15);
        const fadeOut = smooth01((1 - phase) / 0.15);
        u.uSweepStrength.value = 2.2 * Math.min(fadeIn, fadeOut);
      }

      // Wifi arcs: travel earpiece -> objective on the same cycle/phase
      // as the glasses sweep, so the two read as one continuous signal.
      // Position is plain linear interpolation along a straight line —
      // no 3D orientation math at all, since the arcs are billboarded
      // flat to the camera every frame (mesh.quaternion.copy(camera.
      // quaternion)), the same technique the very first flat-disc
      // version used successfully.
      if (state.wirelessArcs && state.wirelessStart && state.wirelessEnd) {
        const diag = state.brainSize.length();
        const minSize = diag * 0.05;
        const maxSize = diag * 0.16;

        for (const arc of state.wirelessArcs) {
          const u2 = (phase + arc.userData.offset) % 1;
          const eased = smooth01(u2);
          arc.position.copy(state.wirelessStart).lerp(state.wirelessEnd, eased);
          arc.quaternion.copy(camera.quaternion);

          const size = minSize + (maxSize - minSize) * eased;
          arc.scale.set(size, size, size);

          const fadeInArc  = smooth01(u2 / 0.12);
          const fadeOutArc = smooth01((1 - u2) / 0.25);
          arc.material.opacity = 0.32 * Math.min(fadeInArc, fadeOutArc);
        }
      }
    }

    if (state.captureBeams) {
      for (const m of state.captureBeams) {
        m.material.opacity = 0.10 + 0.12 * Math.max(0, Math.sin(state.t * 3.2 + m.userData.phase));
      }
      for (const g of state.captureGlows) g.material.opacity = 0.30 + 0.25 * Math.abs(Math.sin(state.t * 3.2));
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    if (state.playing) {
      state.t += dt;
      if (state.t >= state.dur) state.t -= state.dur;
      state.screenTime += dt;
    }
    updateScene();
    renderer.render(scene, camera);
  }

  // -----------------------------------------------------------------------
  // Annotations — floating labels positioned by projecting each anchor's
  // 3D point through the camera to 2D pixel coordinates. Since the camera
  // never moves, this only needs to run once after the camera is set (plus
  // again on resize) rather than every frame.
  // -----------------------------------------------------------------------
  function initAnnotations() {
    const wrap = document.getElementById(`sceneAnnotations-${sceneId}`);
    if (!wrap) return;

    state.annotationEls = {
      glasses:   wrap.querySelector('[data-anchor="glasses"]'),
      objective: wrap.querySelector('[data-anchor="objective"]'),
      cortex:    wrap.querySelector('[data-anchor="cortex"]'),
    };
    state.annotationAnchors = {
      glasses:   state.glassesCenter,
      objective: state.msTip,
      cortex:    state.cortexPoint,
    };

    updateAnnotations();
    requestAnimationFrame(() => wrap.classList.add('is-visible'));
    window.addEventListener('resize', updateAnnotations);
  }

  function updateAnnotations() {
    if (!state.annotationEls || !mount) return;
    const W = mount.clientWidth, H = mount.clientHeight;

    for (const key in state.annotationEls) {
      const el = state.annotationEls[key];
      const anchor = state.annotationAnchors[key];
      if (!el || !anchor) continue;

      const projected = anchor.clone().project(camera);
      const x = (projected.x * 0.5 + 0.5) * W;
      const y = (-projected.y * 0.5 + 0.5) * H;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;

      // a point that's behind the camera or off to the side projects to a
      // wild coordinate — hide rather than show a label flung off-canvas
      const onScreen = projected.z < 1 && x > -40 && x < W + 40 && y > -40 && y < H + 40;
      el.style.visibility = onScreen ? 'visible' : 'hidden';
    }
  }

  // -----------------------------------------------------------------------
  // Pause/resume button — freezes the loop clock in place rather than
  // tearing down the scene, so resuming picks up exactly where it left off
  // -----------------------------------------------------------------------
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      state.playing = !state.playing;
      pauseBtn.classList.toggle('is-playing', state.playing);
      pauseBtn.innerHTML = state.playing
        ? '<i class="fa-solid fa-pause"></i>'
        : '<i class="fa-solid fa-play"></i>';
      pauseBtn.setAttribute('aria-label', state.playing ? 'Pause animation' : 'Play animation');
    });
  }

  init();
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

// While a drag or continuous wheel/pinch zoom is happening we promote the
// image to its own compositor layer (via .interacting) so it tracks the input
// smoothly. A short debounce after the last change removes that class, which
// makes the browser re-rasterise the image at its current scale — i.e. sharp,
// not a stretched low-res texture. This is what was missing for wheel zoom:
// the buttons got the same crisp result for free when their transition ended.
let interactTimer = null;
function markInteracting() {
  lbImg.classList.add('interacting');
  clearTimeout(interactTimer);
  interactTimer = setTimeout(() => lbImg.classList.remove('interacting'), 180);
}

// Reapplies the current scale/offset to the image. `animated` controls whether
// the CSS transition is allowed to run — off during drag/wheel (so it tracks
// the pointer instantly), on for double-click and the +/- buttons (so those
// feel like a deliberate, eased jump rather than a snap).
function applyTransform(animated) {
  lbImg.classList.toggle('no-transition', !animated);
  lbImg.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
  lbZoomLevelTxt.textContent = `${Math.round(scale * 100)}%`;
  lbInner.classList.toggle('zoomed', scale > 1.01);
  // Continuous input (wheel/drag) needs the smooth layer + a settle-sharpen;
  // animated jumps re-rasterise on their own when the transition finishes.
  if (!animated) markInteracting();
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

// Wheel = zoom toward the cursor. This covers three input styles:
//   - a regular mouse wheel (chunky notches)
//   - a trackpad two-finger scroll (many small deltas → smooth zoom)
//   - a trackpad pinch or Ctrl+scroll, which the browser reports as a wheel
//     event with ctrlKey set — the same gesture that would otherwise zoom the
//     whole page. We always preventDefault so the page never scrolls or zooms
//     underneath the open viewer; the image zooms instead.
// The step scales with how far the wheel/pinch actually moved (normalised
// across the browser's line / page / pixel delta modes) so it feels smooth
// rather than stepping in fixed jumps.
lbInner.addEventListener('wheel', e => {
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  const px = e.deltaY * unit;                       // normalise to pixels
  let step = -px * (e.ctrlKey ? 0.010 : 0.003);     // pinch/ctrl is finer, so weight it up
  step = Math.max(-0.6, Math.min(0.6, step));       // don't let one flick leap the whole range
  if (step) zoomAt(e.clientX, e.clientY, step, false);
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

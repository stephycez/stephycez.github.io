const photoFiles = [
  ['671222146164780dc3aed614_000015-p-1080.jpg', 330],
  ['6710a7bd96145c59156fada6_20240511-IMG_1471-p-1080.jpg', 778],
  ['6710a7bb61826c79e6405957_20240330-DSCF2827-p-1080.jpg', 530],
  ['6710a7be02c631e7020ad6ef_20240511-IMG_1353-p-1080.jpg', 750],
  ['6710a7c127b3e3017575c47c_20231018-IMG_1154-p-1080.jpg', 350],
  ['6710a9dccb4ba8435d91cde7_DSCF2008-p-1080.jpg', 930],
  ['6710a7bde2ff495668115f1b_20240106-DSCF2476-p-1080.jpg', 330],
  ['6710a7bd40a77e5ff4366a81_20240114-DSCF2570-p-1080.jpg', 330],
  ['6710a7bef9a2728043ec5ea4_20231019-IMG_1824-p-1080.jpg', 330],
  ['6710a7bcc4cfa11400e3a95a_DSCF0521-p-1080.jpg', 700],
  ['6710ad9bf92975b38806d2f2_20231018-IMG_1155-p-1080.jpg', 350],
  ['6710aceb6312f1cfdb22d651_20240509-IMG_9743-p-1080.jpg', 350],
  ['67fa56425a584206e8a10eea_20240330-DSCF2984-p-1080.jpg', 730]
];

const gallery = document.querySelector('.gallery');
const viewport = gallery.querySelector('.gallery-viewport');
const track = gallery.querySelector('.gallery-track');
const dots = gallery.querySelector('.gallery-dots');
const count = document.getElementById('photo-count');
const baseUrl = 'https://cdn.prod.website-files.com/627b553a75f1c5052e36658a/';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const speed = 45; // Pixels per second; continuous rather than one photo every few seconds.
const total = photoFiles.length;
let offsets = [];
let sequenceWidth = 0;
let distance = 0;
let current = -1;
let tween = null;
let lastFrame = 0;
let pointerStart;
let hasPassedStart = false;

// Three identical sets leave one full set on either side when the loop wraps.
for (let copy = 0; copy < 3; copy += 1) {
  photoFiles.forEach(([file, width], index) => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';
    slide.style.setProperty('--photo-ratio', `${width} / 500`);
    slide.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = baseUrl + file;
    img.alt = copy === 1 ? `Photograph ${index + 1} of ${total} from Zicheng Zhu's gallery` : '';
    img.loading = copy === 1 && index < 3 ? 'eager' : 'lazy';
    slide.append(img);
    track.append(slide);
  });
}

for (let index = 0; index < total; index += 1) {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.setAttribute('aria-label', `Show photo ${index + 1} of ${total}`);
  dot.addEventListener('click', () => goTo(index));
  dots.append(dot);
}

function wrap(value) {
  return ((value % sequenceWidth) + sequenceWidth) % sequenceWidth;
}

function activeIndex() {
  const x = wrap(distance);
  let index = 0;
  for (let i = 1; i < total; i += 1) {
    if (offsets[i] <= x) index = i;
  }
  return index;
}

function updateLabels(index) {
  if (index === current) return;
  current = index;
  [...dots.children].forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
  [...track.children].forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== total + current)));
  count.textContent = `Photo ${current + 1} of ${total}`;
}

function render() {
  if (!sequenceWidth) return;
  const index = activeIndex();
  const left = window.innerWidth <= 700 ? 16 : viewport.clientWidth / 2 - 190;
  track.style.transform = `translate3d(${left - track.children[total].offsetLeft - distance}px,0,0)`;
  if (!hasPassedStart && distance >= left) hasPassedStart = true;
  viewport.style.setProperty('--leading-blank', hasPassedStart ? '0px' : `${Math.max(0, left - distance)}px`);
  gallery.classList.toggle('at-start', !hasPassedStart && distance < 1);
  updateLabels(index);
}

function measure() {
  const oldWidth = sequenceWidth;
  const first = track.children[total].offsetLeft;
  sequenceWidth = track.children[total * 2].offsetLeft - first;
  offsets = photoFiles.map((_, i) => track.children[total + i].offsetLeft - first);
  if (oldWidth) distance *= sequenceWidth / oldWidth;
  render();
}

function animateBy(delta) {
  hasPassedStart = true;
  const start = distance;
  tween = {
    start,
    end: start + delta,
    startedAt: performance.now(),
    duration: Math.min(1400, Math.max(500, Math.abs(delta) / 1.2))
  };
}

function move(step) {
  const x = wrap(distance);
  const index = activeIndex();
  let target;
  if (step > 0) {
    target = index === total - 1 ? sequenceWidth : offsets[index + 1];
  } else {
    target = index === 0 ? offsets[total - 1] - sequenceWidth : offsets[index - 1];
  }
  animateBy(target - x);
}

function goTo(index) {
  const x = wrap(distance);
  let delta = offsets[index] - x;
  if (delta > sequenceWidth / 2) delta -= sequenceWidth;
  if (delta < -sequenceWidth / 2) delta += sequenceWidth;
  animateBy(delta);
}

function tick(now) {
  const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
  lastFrame = now;
  if (tween) {
    const progress = Math.min(1, (now - tween.startedAt) / tween.duration);
    const eased = progress * progress * (3 - 2 * progress);
    distance = tween.start + (tween.end - tween.start) * eased;
    if (progress === 1) tween = null;
  } else if (!reducedMotion.matches && !document.hidden && !gallery.querySelector(':focus-visible')) {
    distance += speed * elapsed;
  }
  if (sequenceWidth && (distance >= sequenceWidth || distance < 0)) distance = wrap(distance);
  render();
  requestAnimationFrame(tick);
}

document.getElementById('previous-photo').addEventListener('click', () => move(-1));
document.getElementById('next-photo').addEventListener('click', () => move(1));
gallery.addEventListener('pointerdown', event => { pointerStart = event.clientX; });
gallery.addEventListener('pointerup', event => {
  if (pointerStart == null) return;
  const delta = event.clientX - pointerStart;
  pointerStart = undefined;
  if (Math.abs(delta) > 40) move(delta < 0 ? 1 : -1);
});
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === 'ArrowRight') move(1);
});
window.addEventListener('resize', measure);
measure();
requestAnimationFrame(tick);

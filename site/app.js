const CATEGORIES = {
  length: {
    units: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'],
    toBase: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
    convert(val, from, to) { return val * this.toBase[from] / this.toBase[to]; }
  },
  weight: {
    units: ['mg', 'g', 'kg', 't', 'oz', 'lb'],
    toBase: { mg: 0.000001, g: 0.001, kg: 1, t: 1000, oz: 0.0283495, lb: 0.453592 },
    convert(val, from, to) { return val * this.toBase[from] / this.toBase[to]; }
  },
  temperature: {
    units: ['°C', '°F', 'K'],
    convert(val, from, to) {
      if (from === to) return val;
      let c = from === '°C' ? val : from === '°F' ? (val - 32) * 5 / 9 : val - 273.15;
      return to === '°C' ? c : to === '°F' ? c * 9 / 5 + 32 : c + 273.15;
    }
  },
  volume: {
    units: ['ml', 'L', 'tsp', 'tbsp', 'fl oz', 'cup', 'pt', 'qt', 'gal'],
    toBase: { ml: 0.001, L: 1, tsp: 0.00492892, tbsp: 0.0147868, 'fl oz': 0.0295735, cup: 0.236588, pt: 0.473176, qt: 0.946353, gal: 3.78541 },
    convert(val, from, to) { return val * this.toBase[from] / this.toBase[to]; }
  },
  baking: {
    units: ['tsp', 'tbsp', 'fl oz', 'cup', 'ml', 'g', 'oz', 'lb'],
    volToMl: { tsp: 4.92892, tbsp: 14.7868, 'fl oz': 29.5735, cup: 236.588, ml: 1 },
    wtToG:   { g: 1, oz: 28.3495, lb: 453.592 },
    convert(val, from, to, density) {
      if (from === to) return val;
      const isVolFrom = from in this.volToMl;
      const isVolTo   = to   in this.volToMl;
      const grams = isVolFrom ? val * this.volToMl[from] * density : val * this.wtToG[from];
      return isVolTo ? grams / density / this.volToMl[to] : grams / this.wtToG[to];
    }
  }
};

// g/ml densities for common baking ingredients
const INGREDIENTS = {
  'All-purpose flour':  0.528,
  'Bread flour':        0.507,
  'Cake flour':         0.422,
  'Whole wheat flour':  0.507,
  'Almond flour':       0.406,
  'Granulated sugar':   0.845,
  'Brown sugar (packed)': 0.929,
  'Powdered sugar':     0.507,
  'Butter':             0.911,
  'Honey':              1.436,
  'Maple syrup':        1.325,
  'Milk':               1.030,
  'Water':              1.000,
  'Olive oil':          0.911,
  'Cocoa powder':       0.359,
  'Salt (fine)':        1.217,
  'Rolled oats':        0.380,
  'Cornstarch':         0.541,
  'Baking soda':        0.869,
  'Baking powder':      0.900,
};

let activeCat = 'length';
let lastEdited = 'a';

const valA      = document.getElementById('val-a');
const valB      = document.getElementById('val-b');
const unitA     = document.getElementById('unit-a');
const unitB     = document.getElementById('unit-b');
const ingWrap   = document.getElementById('ingredient-wrap');
const ingSel    = document.getElementById('ingredient');

// Populate ingredient dropdown once
Object.keys(INGREDIENTS).forEach(name => {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  ingSel.appendChild(opt);
});

function populateSelects(cat) {
  const units = CATEGORIES[cat].units;
  [unitA, unitB].forEach((sel, i) => {
    sel.innerHTML = '';
    units.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      sel.appendChild(opt);
    });
    if (cat === 'baking') {
      sel.value = i === 0 ? 'cup' : 'g';
    } else {
      sel.selectedIndex = i === 1 ? 1 : 0;
    }
  });
}

function fmt(n) {
  if (!isFinite(n)) return '';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.0001 && abs < 1e12) return String(parseFloat(n.toPrecision(7)));
  return n.toExponential(4);
}

function density() {
  return INGREDIENTS[ingSel.value] || 1.0;
}

function recalc(source) {
  const cat = CATEGORIES[activeCat];
  const d = activeCat === 'baking' ? density() : undefined;
  if (source === 'a') {
    const v = parseFloat(valA.value);
    valB.value = isNaN(v) ? '' : fmt(cat.convert(v, unitA.value, unitB.value, d));
  } else {
    const v = parseFloat(valB.value);
    valA.value = isNaN(v) ? '' : fmt(cat.convert(v, unitB.value, unitA.value, d));
  }
}

function switchCat(cat) {
  activeCat = cat;
  document.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.cat === cat;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
  });
  ingWrap.hidden = cat !== 'baking';
  populateSelects(cat);
  valA.value = '';
  valB.value = '';
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchCat(btn.dataset.cat));
});

valA.addEventListener('input',  () => { lastEdited = 'a'; recalc('a'); });
valB.addEventListener('input',  () => { lastEdited = 'b'; recalc('b'); });
unitA.addEventListener('change', () => recalc(lastEdited));
unitB.addEventListener('change', () => recalc(lastEdited));
ingSel.addEventListener('change', () => recalc(lastEdited));

populateSelects(activeCat);

// PWA install
(function () {
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  const btn = document.getElementById('install-btn');
  let prompt;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  if (isIOS) {
    btn.textContent = '⊕ Install';
    btn.hidden = false;
    btn.addEventListener('click', () => alert('Tap the Share icon ⎋, then "Add to Home Screen".'));
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e;
    btn.hidden = false;
  });

  window.addEventListener('appinstalled', () => { btn.hidden = true; prompt = null; });

  btn.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') btn.hidden = true;
    prompt = null;
  });
}());

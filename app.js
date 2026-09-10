/* ===========================================================
   Objectifs — logique de l'application (v2)

   Stockage : localStorage, clé "objectifs2026_data" (inchangée
   pour rester compatible avec les données déjà présentes).

   Forme du state stocké (v2) :
   {
     version: 2,
     goals: [ { ...voir migrateGoal... } ],
     categories: ["Argent", "Travail", ...],
     preferences: { theme: "system"|"light"|"dark", lastYear, sortMode }
   }

   v1 (avant cette mise à jour) stockait directement un tableau
   d'objectifs sans wrapper : migrateData() détecte ce cas et
   migre automatiquement, sans jamais supprimer de données.
   =========================================================== */

const STORAGE_KEY = "objectifs2026_data";
const DATA_VERSION = 2;
const USER_NAME = "Michael";
const DEFAULT_CATEGORIES = ["Argent", "Travail", "Voyage", "Sport", "Achats", "Personnel"];
const QUOTES = [
  "Small steps every day.",
  "Discipline beats motivation.",
  "Progress, not perfection.",
  "Un objectif à la fois.",
  "Le futur se construit aujourd'hui."
];

const SEED_GOALS = [
  {
    id: "g1", name: "Épargner mes premiers 1000 €", category: "Argent",
    type: "progress", completed: false, current: 0, target: 1000, unit: "€",
    checkpoints: [
      { value: 200, label: "200 €" },
      { value: 500, label: "500 €" },
      { value: 1000, label: "1000 €" }
    ],
    deadline: null, note: null, year: 2026, period: "all", order: 0,
    completedAt: null, photo: null, createdAt: 1
  },
  {
    id: "g2", name: "Trouver un job à temps partiel", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: "2026-09-30", note: null, year: 2026, period: "all", order: 1,
    completedAt: null, photo: null, createdAt: 2
  },
  {
    id: "g3", name: "Trouver mon stage", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: "2026-10-31", note: "Idéalement à l'étranger", year: 2026, period: "all", order: 2,
    completedAt: null, photo: null, createdAt: 3
  },
  {
    id: "g4", name: "Avoir un entretien pour un stage", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: "2026-10-15", note: null, year: 2026, period: "all", order: 3,
    completedAt: null, photo: null, createdAt: 4
  },
  {
    id: "g5", name: "Voyager à Amsterdam", category: "Voyage",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: null, note: null, year: 2026, period: "all", order: 4,
    completedAt: null, photo: null, createdAt: 5
  },
  {
    id: "g6", name: "Participer à une course", category: "Sport",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: null, note: "Marathon ou semi-marathon", year: 2026, period: "all", order: 5,
    completedAt: null, photo: null, createdAt: 6
  },
  {
    id: "g7", name: "Acheter une Apple Watch Series 8", category: "Achats",
    type: "binary", completed: false, current: null, target: null, unit: "", checkpoints: [],
    deadline: null, note: null, year: 2026, period: "all", order: 6,
    completedAt: null, photo: null, createdAt: 7
  }
];

/* ---------- State ---------- */
let state = null;
let selectedYear = 2026;
let activeFilter = "all";      // all | ongoing | done
let activePeriod = "all";      // all | Q1 | Q2 | Q3 | Q4
let activeCategory = "all";
let sortMode = "custom";       // custom | alpha | progress | category | deadline
let editingId = null;
let currentType = "binary";
let formCheckpoints = [];

/* ---------- Persistence & migration ---------- */
function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    state = buildFreshState();
    saveData();
    return;
  }
  let parsed;
  try{ parsed = JSON.parse(raw); }catch(e){ parsed = null; }

  if(!parsed){
    state = buildFreshState();
    saveData();
    return;
  }

  state = migrateData(parsed);
  saveData();
}

function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildFreshState(){
  return {
    version: DATA_VERSION,
    goals: SEED_GOALS.map(g => ({ ...g, checkpoints: g.checkpoints.map(cp => ({ ...cp })) })),
    categories: [...DEFAULT_CATEGORIES],
    preferences: { theme: "system", lastYear: 2026, sortMode: "custom" }
  };
}

// Détecte le format des données existantes et les fait évoluer
// vers le format v2, sans jamais rien supprimer.
function migrateData(parsed){
  let rawGoals, rawCategories, rawPreferences;

  if(Array.isArray(parsed)){
    // v1 : un simple tableau d'objectifs, pas de wrapper
    rawGoals = parsed;
    rawCategories = null;
    rawPreferences = null;
  }else{
    rawGoals = Array.isArray(parsed.goals) ? parsed.goals : [];
    rawCategories = Array.isArray(parsed.categories) ? parsed.categories : null;
    rawPreferences = parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : null;
  }

  const goals = rawGoals.map((g, i) => migrateGoal(g, i));
  const categories = rawCategories && rawCategories.length
    ? rawCategories
    : Array.from(new Set([...DEFAULT_CATEGORIES, ...goals.map(g => g.category)]));

  const preferences = {
    theme: (rawPreferences && rawPreferences.theme) || "system",
    lastYear: (rawPreferences && rawPreferences.lastYear) || (goals[0] ? goals[0].year : 2026),
    sortMode: (rawPreferences && rawPreferences.sortMode) || "custom"
  };

  return { version: DATA_VERSION, goals, categories, preferences };
}

function migrateGoal(g, index){
  const type = g.type === "progress" ? "progress" : "binary";
  return {
    id: g.id || uid(),
    name: g.name || "Sans nom",
    category: g.category || "Personnel",
    type,
    completed: !!g.completed,
    current: type === "progress" ? (typeof g.current === "number" ? g.current : 0) : null,
    target: type === "progress" ? (typeof g.target === "number" ? g.target : 0) : null,
    unit: g.unit || "",
    checkpoints: Array.isArray(g.checkpoints) ? g.checkpoints : defaultCheckpointsFor(g),
    deadline: g.deadline || null,
    note: g.note || null,
    year: typeof g.year === "number" ? g.year : 2026,
    period: g.period || "all",
    order: typeof g.order === "number" ? g.order : index,
    completedAt: g.completedAt || null,
    photo: g.photo || null,
    createdAt: g.createdAt || Date.now()
  };
}

// Restaure les checkpoints connus pour l'objectif d'épargne historique,
// pour les utilisateurs qui avaient déjà ces données avant les checkpoints.
function defaultCheckpointsFor(g){
  if(g.type === "progress" && (g.id === "g1" || (g.name || "").includes("1000"))){
    return [
      { value: 200, label: "200 €" },
      { value: 500, label: "500 €" },
      { value: 1000, label: "1000 €" }
    ];
  }
  return [];
}

/* ---------- Helpers ---------- */
function uid(){
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function isDone(g){
  if(g.type === "binary") return g.completed;
  return g.target > 0 && g.current >= g.target;
}
function progressPercent(g){
  if(g.type !== "progress" || !g.target || g.target <= 0) return 0;
  return Math.min(100, Math.round((g.current / g.target) * 100));
}
function sortableProgress(g){
  return g.type === "progress" ? progressPercent(g) : (g.completed ? 100 : 0);
}
function formatDate(iso){
  if(!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
function formatTimestamp(ts){
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
function isOverdue(g){
  if(!g.deadline || isDone(g)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = g.deadline.split("-").map(Number);
  return new Date(y, m - 1, d) < today;
}
function daysBetween(iso){
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
}
// Seuil (en jours) à partir duquel on affiche le compte à rebours "J-X".
// Au-delà, une deadline lointaine reste affichée sans compteur.
const COUNTDOWN_THRESHOLD_DAYS = 30;
function deadlineLabel(iso, overdue){
  const days = daysBetween(iso);
  if(overdue){
    const n = Math.abs(days);
    return "En retard · " + n + (n === 1 ? " jour" : " jours");
  }
  if(days === 0) return "Deadline · aujourd'hui";
  if(days === 1) return "Deadline · demain";
  if(days <= COUNTDOWN_THRESHOLD_DAYS) return "Deadline · " + formatDate(iso) + " · J-" + days;
  return "Deadline · " + formatDate(iso);
}
function formatValue(n){
  if(n === null || n === undefined || isNaN(n)) return "0";
  return String(n);
}
function getQuarter(date){
  return Math.floor(date.getMonth() / 3) + 1;
}

/* ---------- Filtrage / tri ---------- */
function getComparator(mode){
  switch(mode){
    case "alpha":
      return (a, b) => a.name.localeCompare(b.name, "fr");
    case "progress":
      return (a, b) => sortableProgress(b) - sortableProgress(a);
    case "category":
      return (a, b) => a.category.localeCompare(b.category, "fr") || (a.order - b.order);
    case "deadline":
      return (a, b) => {
        if(!a.deadline && !b.deadline) return a.order - b.order;
        if(!a.deadline) return 1;
        if(!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      };
    default:
      return (a, b) => a.order - b.order;
  }
}

function scopedGoals(){
  // objectifs de l'année + période sélectionnées (sans le filtre catégorie/statut)
  return state.goals.filter(g => g.year === selectedYear
    && (activePeriod === "all" || g.period === activePeriod));
}

function getVisibleGoals(){
  const list = scopedGoals().filter(g =>
    (activeCategory === "all" || g.category === activeCategory)
    && (activeFilter === "all" || (activeFilter === "done" ? isDone(g) : !isDone(g)))
  );
  const comparator = getComparator(sortMode);
  return [...list].sort((a, b) => {
    const da = isDone(a), db = isDone(b);
    if(da !== db) return da ? 1 : -1;
    return comparator(a, b);
  });
}

function canDrag(){
  return sortMode === "custom" && activeFilter === "all" && activePeriod === "all" && activeCategory === "all";
}

/* ---------- Thème ---------- */
function applyTheme(theme){
  if(theme === "light" || theme === "dark"){
    document.documentElement.setAttribute("data-theme", theme);
  }else{
    document.documentElement.removeAttribute("data-theme");
  }
  document.querySelector('meta[name="theme-color"]').setAttribute(
    "content",
    theme === "dark" ? "#0B0B0C" : "#FAFAFA"
  );
}

/* ---------- Rendering ---------- */
function renderAll(){
  renderHeader();
  renderYearSwitcher();
  renderPeriodTabs();
  renderFilters();
  renderSummary();
  renderList();
}

function getGreeting(){
  const h = new Date().getHours();
  if(h < 5) return "Hello, oiseau nocturne 🦉";
  if(h < 12) return `Bonjour ${USER_NAME}`;
  if(h < 18) return `Bon après-midi ${USER_NAME}`;
  if(h < 23) return `Bonsoir ${USER_NAME}`;
  return "Hello, oiseau nocturne 🦉";
}

function renderHeader(){
  document.getElementById("greeting").textContent = getGreeting();
  const now = new Date();
  const q = getQuarter(now);
  const ongoing = state.goals.filter(g => g.year === selectedYear && !isDone(g)).length;
  document.getElementById("headerSubtitle").textContent =
    `T${q} ${selectedYear} · ${ongoing} objectif${ongoing !== 1 ? "s" : ""} en cours`;
}

function renderYearSwitcher(){
  document.getElementById("yearLabel").textContent = selectedYear;
}

function renderPeriodTabs(){
  document.querySelectorAll(".period-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.period === activePeriod);
  });
}

function renderFilters(){
  const container = document.getElementById("filters");
  container.innerHTML = "";
  const scoped = scopedGoals();

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "filter-chip" + (activeCategory === "all" ? " active" : "");
  allChip.textContent = "Tout";
  allChip.addEventListener("click", () => { activeCategory = "all"; renderAll(); });
  container.appendChild(allChip);

  state.categories.forEach(cat => {
    if(!scoped.some(g => g.category === cat)) return;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter-chip" + (activeCategory === cat ? " active" : "");
    chip.textContent = cat;
    chip.addEventListener("click", () => { activeCategory = cat; renderAll(); });
    container.appendChild(chip);
  });
}

function renderStatButtons(){
  document.querySelectorAll(".stat-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === activeFilter);
  });
}

function renderSummary(){
  const scoped = scopedGoals().filter(g => activeCategory === "all" || g.category === activeCategory);
  const total = scoped.length;
  const done = scoped.filter(isDone).length;
  const ongoing = total - done;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statDone").textContent = done;
  document.getElementById("statOngoing").textContent = ongoing;
  document.getElementById("globalProgressFill").style.width = pct + "%";
  document.getElementById("globalProgressLabel").textContent = pct + " %";
  renderStatButtons();
}

function renderList(){
  const list = document.getElementById("goalList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const visible = getVisibleGoals();
  emptyState.hidden = visible.length > 0;
  emptyState.textContent = state.goals.length === 0
    ? "Aucun objectif ici. Ajoute-en un avec le bouton +."
    : "Rien à afficher avec ces filtres.";

  visible.forEach(g => list.appendChild(renderCard(g)));
}

function renderCard(g){
  const done = isDone(g);
  const overdue = isOverdue(g);

  const card = document.createElement("div");
  card.className = "goal-card" + (done ? " done" : "");
  card.dataset.id = g.id;
  card.addEventListener("click", () => {
    if(card.dataset.justDragged){ delete card.dataset.justDragged; return; }
    openForm(g.id);
  });

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check" + (done ? " checked" : "");
  check.innerHTML = "&#10003;";
  check.setAttribute("aria-label", done ? "Marquer comme en cours" : "Marquer comme terminé");
  check.addEventListener("click", (e) => { e.stopPropagation(); toggleComplete(g.id); });

  const body = document.createElement("div");
  body.className = "goal-body";

  const name = document.createElement("div");
  name.className = "goal-name";
  name.textContent = g.name;
  body.appendChild(name);

  const meta = document.createElement("div");
  meta.className = "goal-meta";
  const catSpan = document.createElement("span");
  catSpan.textContent = g.category;
  meta.appendChild(catSpan);

  if(done && g.completedAt){
    const dSpan = document.createElement("span");
    dSpan.textContent = "✓ Terminé · " + formatTimestamp(g.completedAt);
    meta.appendChild(dSpan);
  }else if(g.deadline){
    const dSpan = document.createElement("span");
    if(overdue) dSpan.className = "overdue";
    dSpan.textContent = deadlineLabel(g.deadline, overdue);
    meta.appendChild(dSpan);
  }
  body.appendChild(meta);

  if(g.note){
    const note = document.createElement("div");
    note.className = "goal-note";
    note.textContent = g.note;
    body.appendChild(note);
  }

  if(g.type === "progress"){
    const wrap = document.createElement("div");
    wrap.className = "progress-wrap";
    const values = document.createElement("div");
    values.className = "progress-values";
    const left = document.createElement("span");
    left.textContent = `${formatValue(g.current)} / ${formatValue(g.target)} ${g.unit || ""}`.trim();
    values.appendChild(left);
    if(g.checkpoints && g.checkpoints.length){
      const reached = g.checkpoints.filter(cp => g.current >= cp.value).length;
      const cpSpan = document.createElement("span");
      cpSpan.className = "checkpoint-count";
      cpSpan.textContent = `${reached} / ${g.checkpoints.length} étapes`;
      values.appendChild(cpSpan);
    }
    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = progressPercent(g) + "%";
    track.appendChild(fill);
    wrap.appendChild(values);
    wrap.appendChild(track);
    body.appendChild(wrap);
  }

  card.appendChild(check);
  card.appendChild(body);

  card.addEventListener("contextmenu", (e) => e.preventDefault());

  attachDrag(card, g);

  return card;
}

/* ---------- Drag & drop (ordre personnalisé) ---------- */
function attachDrag(card){
  if(!canDrag()) return;

  let longPressTimer = null;
  let dragging = false;
  let startX = 0, startY = 0;
  let pointerId = null;

  function cancelPress(){ clearTimeout(longPressTimer); }

  function onDown(e){
    if(e.target.closest(".check")) return;
    startX = e.clientX; startY = e.clientY;
    pointerId = e.pointerId;
    longPressTimer = setTimeout(() => {
      dragging = true;
      card.classList.add("dragging");
      card.style.touchAction = "none";
      try{ card.setPointerCapture(pointerId); }catch(err){}
      if(navigator.vibrate) navigator.vibrate(10);
    }, 420);
  }

  function onMove(e){
    if(!dragging){
      if(Math.abs(e.clientY - startY) > 10 || Math.abs(e.clientX - startX) > 10) cancelPress();
      return;
    }
    e.preventDefault();
    const list = document.getElementById("goalList");
    const deltaY = e.clientY - startY;
    card.style.transform = `translateY(${deltaY}px)`;

    const siblings = Array.from(list.children);
    const idx = siblings.indexOf(card);
    const rect = card.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;

    const next = siblings[idx + 1];
    const prev = siblings[idx - 1];

    if(next){
      const nRect = next.getBoundingClientRect();
      if(centerY > nRect.top + nRect.height / 2){
        list.insertBefore(next, card);
        card.style.transform = "translateY(0px)";
        startY = e.clientY;
        return;
      }
    }
    if(prev){
      const pRect = prev.getBoundingClientRect();
      if(centerY < pRect.top + pRect.height / 2){
        list.insertBefore(card, prev);
        card.style.transform = "translateY(0px)";
        startY = e.clientY;
        return;
      }
    }
  }

  function onUp(){
    cancelPress();
    if(!dragging){ return; }
    dragging = false;
    card.classList.remove("dragging");
    card.style.transform = "";
    card.style.touchAction = "";
    try{ card.releasePointerCapture(pointerId); }catch(err){}
    card.dataset.justDragged = "1";

    const list = document.getElementById("goalList");
    Array.from(list.children).forEach((el, i) => {
      const g = state.goals.find(x => x.id === el.dataset.id);
      if(g) g.order = i;
    });
    saveData();
  }

  card.addEventListener("pointerdown", onDown);
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);
  card.addEventListener("pointerleave", () => { if(!dragging) cancelPress(); });
}

/* ---------- Actions ---------- */
function toggleComplete(id){
  const g = state.goals.find(x => x.id === id);
  if(!g) return;
  if(g.type === "binary"){
    g.completed = !g.completed;
    g.completedAt = g.completed ? Date.now() : null;
  }else{
    if(isDone(g)){
      g.current = g._prevCurrent ?? Math.max(0, g.target - 1);
      g.completedAt = null;
    }else{
      g._prevCurrent = g.current;
      g.current = g.target;
      g.completedAt = Date.now();
    }
  }
  saveData();
  renderAll();
}

function deleteGoal(id){
  state.goals = state.goals.filter(g => g.id !== id);
  saveData();
  closeForm();
  renderAll();
}

/* ---------- Formulaire ---------- */
const formOverlay = document.getElementById("formOverlay");
const formSheet = document.getElementById("formSheet");
const goalForm = document.getElementById("goalForm");
const fName = document.getElementById("fName");
const fCategory = document.getElementById("fCategory");
const fType = document.getElementById("fType");
const fCurrent = document.getElementById("fCurrent");
const fTarget = document.getElementById("fTarget");
const fUnit = document.getElementById("fUnit");
const fYear = document.getElementById("fYear");
const fPeriod = document.getElementById("fPeriod");
const fDeadline = document.getElementById("fDeadline");
const fNote = document.getElementById("fNote");
const progressFields = document.getElementById("progressFields");
const formDelete = document.getElementById("formDelete");
const formTitle = document.getElementById("formTitle");

function populateCategorySelect(){
  fCategory.innerHTML = "";
  state.categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    fCategory.appendChild(opt);
  });
}

function setType(type){
  currentType = type;
  fType.querySelectorAll(".segment").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
  progressFields.hidden = type !== "progress";
}

fType.querySelectorAll(".segment").forEach(btn => {
  btn.addEventListener("click", () => setType(btn.dataset.type));
});

function renderCheckpointsEditor(){
  const container = document.getElementById("checkpointsEditor");
  container.innerHTML = "";
  formCheckpoints.forEach((cp, i) => {
    const row = document.createElement("div");
    row.className = "checkpoint-row";

    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.className = "cp-value";
    valueInput.placeholder = "Valeur";
    valueInput.value = cp.value === "" || cp.value === undefined ? "" : cp.value;
    valueInput.addEventListener("input", () => {
      formCheckpoints[i].value = valueInput.value === "" ? "" : Number(valueInput.value);
    });

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "cp-label";
    labelInput.placeholder = "Libellé (optionnel)";
    labelInput.value = cp.label || "";
    labelInput.addEventListener("input", () => {
      formCheckpoints[i].label = labelInput.value;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "checkpoint-remove";
    removeBtn.innerHTML = "&times;";
    removeBtn.addEventListener("click", () => {
      formCheckpoints.splice(i, 1);
      renderCheckpointsEditor();
    });

    row.appendChild(valueInput);
    row.appendChild(labelInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

document.getElementById("addCheckpointBtn").addEventListener("click", () => {
  formCheckpoints.push({ value: "", label: "" });
  renderCheckpointsEditor();
});

function lockBodyScroll(){ document.body.classList.add("no-scroll"); }
function unlockBodyScroll(){ document.body.classList.remove("no-scroll"); }

function openForm(id){
  editingId = id;
  populateCategorySelect();
  goalForm.reset();
  formSheet.style.transform = "";

  if(id){
    const g = state.goals.find(x => x.id === id);
    formTitle.textContent = "Modifier l'objectif";
    formDelete.hidden = false;
    fName.value = g.name;
    fCategory.value = g.category;
    setType(g.type);
    fCurrent.value = g.current ?? "";
    fTarget.value = g.target ?? "";
    fUnit.value = g.unit || "";
    fYear.value = g.year;
    fPeriod.value = g.period || "all";
    fDeadline.value = g.deadline || "";
    fNote.value = g.note || "";
    formCheckpoints = (g.checkpoints || []).map(cp => ({ ...cp }));
  }else{
    formTitle.textContent = "Nouvel objectif";
    formDelete.hidden = true;
    setType("binary");
    if(fCategory.options.length) fCategory.value = fCategory.options[0].value;
    fYear.value = selectedYear;
    fPeriod.value = activePeriod === "all" ? "all" : activePeriod;
    formCheckpoints = [];
  }
  renderCheckpointsEditor();

  formOverlay.hidden = false;
  lockBodyScroll();
}

function closeForm(){
  formOverlay.hidden = true;
  editingId = null;
  unlockBodyScroll();
}

function saveForm(){
  const name = fName.value.trim();
  if(!name){ fName.focus(); return; }

  const category = fCategory.value || "Personnel";
  const deadline = fDeadline.value || null;
  const note = fNote.value.trim() || null;
  const year = Number(fYear.value) || selectedYear;
  const period = fPeriod.value || "all";

  const cleanedCheckpoints = formCheckpoints
    .filter(cp => cp.value !== "" && cp.value !== null && !isNaN(cp.value))
    .map(cp => ({ value: Number(cp.value), label: (cp.label && cp.label.trim()) || `${cp.value}` }))
    .sort((a, b) => a.value - b.value);

  if(editingId){
    const g = state.goals.find(x => x.id === editingId);
    g.name = name;
    g.category = category;
    g.type = currentType;
    g.year = year;
    g.period = period;
    g.deadline = deadline;
    g.note = note;
    if(currentType === "progress"){
      g.current = fCurrent.value === "" ? 0 : Number(fCurrent.value);
      g.target = fTarget.value === "" ? 0 : Number(fTarget.value);
      g.unit = fUnit.value.trim();
      g.checkpoints = cleanedCheckpoints;
    }else{
      g.current = null; g.target = null; g.unit = ""; g.checkpoints = [];
    }
  }else{
    const maxOrder = state.goals.reduce((m, g) => Math.max(m, g.order ?? 0), -1);
    const newGoal = {
      id: uid(),
      name, category,
      type: currentType,
      completed: false,
      current: currentType === "progress" ? (fCurrent.value === "" ? 0 : Number(fCurrent.value)) : null,
      target: currentType === "progress" ? (fTarget.value === "" ? 0 : Number(fTarget.value)) : null,
      unit: currentType === "progress" ? fUnit.value.trim() : "",
      checkpoints: currentType === "progress" ? cleanedCheckpoints : [],
      deadline, note, year, period,
      order: maxOrder + 1,
      completedAt: null,
      photo: null,
      createdAt: Date.now()
    };
    state.goals.push(newGoal);
  }

  saveData();
  closeForm();
  renderAll();
}

document.getElementById("formCancel").addEventListener("click", closeForm);
document.getElementById("formSave").addEventListener("click", (e) => { e.preventDefault(); saveForm(); });
goalForm.addEventListener("submit", (e) => { e.preventDefault(); saveForm(); });
formDelete.addEventListener("click", () => {
  if(editingId && confirm("Supprimer cet objectif ?")) deleteGoal(editingId);
});
formOverlay.addEventListener("click", (e) => { if(e.target === formOverlay) closeForm(); });

/* ---------- Swipe-to-close du bottom sheet ---------- */
function attachSheetSwipe(){
  const handle = document.getElementById("sheetHandle");
  const header = document.getElementById("sheetHeader");
  let startY = 0;
  let dragging = false;

  function onDown(e){
    startY = e.clientY;
    dragging = true;
    formSheet.style.transition = "none";
    try{ e.target.setPointerCapture(e.pointerId); }catch(err){}
  }
  function onMove(e){
    if(!dragging) return;
    const delta = Math.max(0, e.clientY - startY);
    formSheet.style.transform = `translateY(${delta}px)`;
  }
  function onUp(e){
    if(!dragging) return;
    dragging = false;
    const delta = Math.max(0, e.clientY - startY);
    formSheet.style.transition = "transform .22s ease";
    if(delta > 120){
      formSheet.style.transform = "translateY(100%)";
      setTimeout(() => {
        closeForm();
        formSheet.style.transform = "";
        formSheet.style.transition = "";
      }, 220);
    }else{
      formSheet.style.transform = "translateY(0px)";
      setTimeout(() => { formSheet.style.transition = ""; }, 230);
    }
  }

  [handle, header].forEach(el => {
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
}

/* ---------- Année / période / statut / tri ---------- */
document.getElementById("yearPrev").addEventListener("click", () => {
  selectedYear -= 1;
  state.preferences.lastYear = selectedYear;
  saveData();
  renderAll();
});
document.getElementById("yearNext").addEventListener("click", () => {
  selectedYear += 1;
  state.preferences.lastYear = selectedYear;
  saveData();
  renderAll();
});

document.querySelectorAll(".period-tab").forEach(btn => {
  btn.addEventListener("click", () => { activePeriod = btn.dataset.period; renderAll(); });
});

document.querySelectorAll(".stat-btn").forEach(btn => {
  btn.addEventListener("click", () => { activeFilter = btn.dataset.filter; renderAll(); });
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  sortMode = e.target.value;
  state.preferences.sortMode = sortMode;
  saveData();
  renderAll();
});

/* ---------- Réglages (page dédiée) ---------- */
const mainView = document.getElementById("mainView");
const settingsView = document.getElementById("settingsView");

function openSettings(){
  closeForm();
  renderThemeOptions();
  renderCategoryList();
  refreshUpdateStatus();
  mainView.hidden = true;
  settingsView.hidden = false;
  updateNavActive();
}
function closeSettings(){
  settingsView.hidden = true;
  mainView.hidden = false;
  updateNavActive();
}
function updateNavActive(){
  document.getElementById("navGoalsBtn").classList.toggle("active", settingsView.hidden);
  document.getElementById("navSettingsBtn").classList.toggle("active", !settingsView.hidden);
}

document.getElementById("menuBtn").addEventListener("click", openSettings);
document.getElementById("settingsBack").addEventListener("click", closeSettings);

/* Bottom nav */
document.getElementById("navGoalsBtn").addEventListener("click", () => {
  if(!settingsView.hidden) closeSettings();
});
document.getElementById("navSettingsBtn").addEventListener("click", () => {
  if(settingsView.hidden) openSettings();
});
document.getElementById("navAddBtn").addEventListener("click", () => openForm(null));

/* Apparence */
function renderThemeOptions(){
  document.querySelectorAll("#themeOptions .radio-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === state.preferences.theme);
  });
}
document.querySelectorAll("#themeOptions .radio-item").forEach(btn => {
  btn.addEventListener("click", () => {
    state.preferences.theme = btn.dataset.theme;
    saveData();
    applyTheme(state.preferences.theme);
    renderThemeOptions();
  });
});

/* Catégories */
function renderCategoryList(){
  const container = document.getElementById("categoryList");
  container.innerHTML = "";
  state.categories.forEach(cat => {
    const row = document.createElement("div");
    row.className = "menu-item category-row";

    const name = document.createElement("span");
    name.textContent = cat;

    const actions = document.createElement("div");
    actions.className = "cat-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.textContent = "Renommer";
    renameBtn.addEventListener("click", () => renameCategory(cat));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "cat-delete";
    deleteBtn.textContent = "Supprimer";
    deleteBtn.addEventListener("click", () => deleteCategory(cat));

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(name);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function renameCategory(oldName){
  const input = prompt("Nouveau nom de la catégorie", oldName);
  if(!input) return;
  const trimmed = input.trim();
  if(!trimmed || trimmed === oldName) return;
  if(state.categories.includes(trimmed)){ alert("Cette catégorie existe déjà."); return; }
  state.categories = state.categories.map(c => c === oldName ? trimmed : c);
  state.goals.forEach(g => { if(g.category === oldName) g.category = trimmed; });
  saveData();
  renderCategoryList();
  renderAll();
}

function deleteCategory(name){
  if(!confirm(`Supprimer la catégorie "${name}" ?\nLes objectifs associés passeront en "Personnel", ils ne seront pas supprimés.`)) return;
  state.categories = state.categories.filter(c => c !== name);
  if(!state.categories.includes("Personnel")) state.categories.push("Personnel");
  state.goals.forEach(g => { if(g.category === name) g.category = "Personnel"; });
  saveData();
  renderCategoryList();
  renderAll();
}

document.getElementById("addCategoryBtn").addEventListener("click", () => {
  const input = prompt("Nom de la nouvelle catégorie");
  if(!input) return;
  const trimmed = input.trim();
  if(!trimmed) return;
  if(state.categories.includes(trimmed)){ alert("Cette catégorie existe déjà."); return; }
  state.categories.push(trimmed);
  saveData();
  renderCategoryList();
});

/* Export / import / reset */
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "objectifs2026.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      state = migrateData(parsed);
      saveData();
      applyTheme(state.preferences.theme);
      selectedYear = state.preferences.lastYear || selectedYear;
      sortMode = state.preferences.sortMode || "custom";
      document.getElementById("sortSelect").value = sortMode;
      renderThemeOptions();
      renderCategoryList();
      renderAll();
      closeSettings();
    }catch(err){
      alert("Fichier invalide. Impossible d'importer ces données.");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if(confirm("Êtes-vous sûr ?\nCette action supprimera tous vos objectifs.")){
    const keepTheme = state.preferences.theme;
    state = buildFreshState();
    state.preferences.theme = keepTheme;
    saveData();
    selectedYear = state.preferences.lastYear;
    sortMode = state.preferences.sortMode;
    document.getElementById("sortSelect").value = sortMode;
    renderCategoryList();
    renderAll();
    closeSettings();
  }
});

/* ---------- Mise à jour de la PWA ---------- */
let swRegistration = null;
let waitingWorker = null;

function setUpdateStatus(text, showApply){
  document.getElementById("updateStatus").textContent = text;
  document.getElementById("applyUpdateBtn").hidden = !showApply;
}

// Point d'entrée unique quand un SW "waiting" apparaît ou disparaît :
// pilote à la fois le bandeau discret et le statut de la page Réglages.
function setWaitingWorker(worker){
  waitingWorker = worker;
  const banner = document.getElementById("updateBanner");
  if(waitingWorker){
    banner.hidden = false;
    setUpdateStatus("Nouvelle version disponible.", true);
  }else{
    banner.hidden = true;
  }
}

function refreshUpdateStatus(){
  if(waitingWorker){
    setUpdateStatus("Nouvelle version disponible.", true);
  }else{
    setUpdateStatus("", false);
  }
}

async function checkForUpdate(){
  if(!("serviceWorker" in navigator)){
    setUpdateStatus("Non disponible sur ce navigateur.", false);
    return;
  }
  setUpdateStatus("Recherche en cours…", false);
  try{
    const reg = swRegistration || await navigator.serviceWorker.getRegistration();
    if(!reg){ setUpdateStatus("Service worker non initialisé.", false); return; }
    swRegistration = reg;
    await reg.update();
    setTimeout(() => {
      if(reg.waiting){
        setWaitingWorker(reg.waiting);
      }else{
        setWaitingWorker(null);
        setUpdateStatus("Vous utilisez la dernière version.", false);
      }
    }, 700);
  }catch(e){
    setUpdateStatus("Impossible de vérifier pour le moment.", false);
  }
}

function applyUpdate(){
  if(waitingWorker){
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setUpdateStatus("Mise à jour en cours…", false);
    document.getElementById("updateBanner").hidden = true;
  }
}

document.getElementById("checkUpdateBtn").addEventListener("click", checkForUpdate);
document.getElementById("applyUpdateBtn").addEventListener("click", applyUpdate);
document.getElementById("updateBannerBtn").addEventListener("click", applyUpdate);

function initServiceWorker(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      swRegistration = reg;
      if(reg.waiting && navigator.serviceWorker.controller){
        setWaitingWorker(reg.waiting);
      }
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if(!nw) return;
        nw.addEventListener("statechange", () => {
          if(nw.state === "installed" && navigator.serviceWorker.controller){
            setWaitingWorker(nw);
          }
        });
      });
    }).catch(() => {});

    let refreshed = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if(refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  });
}

/* ---------- Footer ---------- */
function renderFooterQuote(){
  const el = document.getElementById("appFooter");
  el.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/* ---------- Init ---------- */
loadData();
selectedYear = state.preferences.lastYear || new Date().getFullYear();
sortMode = state.preferences.sortMode || "custom";
document.getElementById("sortSelect").value = sortMode;
applyTheme(state.preferences.theme || "system");
renderThemeOptions();
renderCategoryList();
renderFooterQuote();
attachSheetSwipe();
updateNavActive();
renderAll();
initServiceWorker();
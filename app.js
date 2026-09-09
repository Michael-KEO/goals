/* ===========================================================
   Objectifs 2026 — logique de l'application
   Stockage : localStorage, clé "objectifs2026_data"
   Modèle d'un objectif :
   {
     id: string,
     name: string,
     category: string,
     type: "binary" | "progress",
     completed: boolean,
     current: number | null,   // seulement si type = progress
     target: number | null,    // seulement si type = progress
     unit: string,             // ex "€", optionnel
     deadline: string | null,  // format "YYYY-MM-DD"
     note: string | null,
     createdAt: number
   }
   =========================================================== */

const STORAGE_KEY = "objectifs2026_data";
const DEFAULT_CATEGORIES = ["Argent", "Travail", "Voyage", "Sport", "Achats", "Personnel"];

const SEED_GOALS = [
  {
    id: "g1", name: "Épargner mes premiers 1000 €", category: "Argent",
    type: "progress", completed: false, current: 0, target: 1000, unit: "€",
    deadline: null, note: null, createdAt: 1
  },
  {
    id: "g2", name: "Trouver un job à temps partiel", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: "2026-09-30", note: null, createdAt: 2
  },
  {
    id: "g3", name: "Trouver mon stage", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: "2026-10-31", note: "Idéalement à l'étranger", createdAt: 3
  },
  {
    id: "g4", name: "Avoir un entretien pour un stage", category: "Travail",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: "2026-10-15", note: null, createdAt: 4
  },
  {
    id: "g5", name: "Voyager à Amsterdam", category: "Voyage",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: null, note: null, createdAt: 5
  },
  {
    id: "g6", name: "Participer à une course", category: "Sport",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: null, note: "Marathon ou semi-marathon", createdAt: 6
  },
  {
    id: "g7", name: "Acheter une Apple Watch Series 8", category: "Achats",
    type: "binary", completed: false, current: null, target: null, unit: "",
    deadline: null, note: null, createdAt: 7
  }
];

/* ---------- State ---------- */
let goals = [];
let activeCategory = "all";
let editingId = null; // null = mode création

/* ---------- Persistence ---------- */
function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    goals = SEED_GOALS;
    saveData();
    return;
  }
  try{
    const parsed = JSON.parse(raw);
    goals = Array.isArray(parsed) ? parsed : [];
  }catch(e){
    goals = [];
  }
}
function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

/* ---------- Helpers ---------- */
function uid(){
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function usedCategories(){
  const cats = new Set(DEFAULT_CATEGORIES);
  goals.forEach(g => cats.add(g.category));
  return Array.from(cats);
}
function isDone(g){
  if(g.type === "binary") return g.completed;
  return g.target > 0 && g.current >= g.target;
}
function progressPercent(g){
  if(g.type !== "progress" || !g.target || g.target <= 0) return 0;
  return Math.min(100, Math.round((g.current / g.target) * 100));
}
function formatDate(iso){
  if(!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
function isOverdue(g){
  if(!g.deadline || isDone(g)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const [y, m, d] = g.deadline.split("-").map(Number);
  return new Date(y, m - 1, d) < today;
}
function formatValue(n){
  if(n === null || n === undefined || isNaN(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(n);
}

/* ---------- Rendering ---------- */
function renderAll(){
  renderFilters();
  renderSummary();
  renderList();
}

function renderFilters(){
  const container = document.getElementById("filters");
  const cats = usedCategories();
  container.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.className = "filter-chip" + (activeCategory === "all" ? " active" : "");
  allChip.textContent = "Tout";
  allChip.dataset.category = "all";
  allChip.addEventListener("click", () => { activeCategory = "all"; renderAll(); });
  container.appendChild(allChip);

  cats.forEach(cat => {
    const hasGoals = goals.some(g => g.category === cat);
    if(!hasGoals) return;
    const chip = document.createElement("button");
    chip.className = "filter-chip" + (activeCategory === cat ? " active" : "");
    chip.textContent = cat;
    chip.dataset.category = cat;
    chip.addEventListener("click", () => { activeCategory = cat; renderAll(); });
    container.appendChild(chip);
  });
}

function renderSummary(){
  const total = goals.length;
  const done = goals.filter(isDone).length;
  const ongoing = total - done;
  const globalPct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statDone").textContent = done;
  document.getElementById("statOngoing").textContent = ongoing;
  document.getElementById("globalProgressFill").style.width = globalPct + "%";
  document.getElementById("globalProgressLabel").textContent = globalPct + " %";
}

function renderList(){
  const list = document.getElementById("goalList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const filtered = activeCategory === "all"
    ? goals
    : goals.filter(g => g.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    const da = isDone(a), db = isDone(b);
    if(da !== db) return da ? 1 : -1;
    return a.createdAt - b.createdAt;
  });

  emptyState.hidden = sorted.length > 0;

  sorted.forEach(g => list.appendChild(renderCard(g)));
}

function renderCard(g){
  const done = isDone(g);
  const overdue = isOverdue(g);

  const card = document.createElement("div");
  card.className = "goal-card" + (done ? " done" : "");
  card.addEventListener("click", (e) => {
    if(e.target.closest(".check")) return;
    openForm(g.id);
  });

  const check = document.createElement("button");
  check.className = "check" + (done ? " checked" : "");
  check.innerHTML = "&#10003;";
  check.setAttribute("aria-label", done ? "Marquer comme en cours" : "Marquer comme terminé");
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleComplete(g.id);
  });

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

  if(g.deadline){
    const dSpan = document.createElement("span");
    if(overdue){
      dSpan.className = "overdue";
      dSpan.textContent = "Deadline dépassée · " + formatDate(g.deadline);
    }else{
      dSpan.textContent = "Deadline · " + formatDate(g.deadline);
    }
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
    values.textContent = `${formatValue(g.current)} / ${formatValue(g.target)} ${g.unit || ""}`.trim();
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
  return card;
}

/* ---------- Actions ---------- */
function toggleComplete(id){
  const g = goals.find(x => x.id === id);
  if(!g) return;
  if(g.type === "binary"){
    g.completed = !g.completed;
  }else{
    // pour un objectif de progression, la coche bascule entre "terminé" et "reprendre à 0 du dernier point connu"
    if(isDone(g)){
      g.current = g._prevCurrent ?? Math.max(0, g.target - 1);
    }else{
      g._prevCurrent = g.current;
      g.current = g.target;
    }
  }
  saveData();
  renderAll();
}

function deleteGoal(id){
  goals = goals.filter(g => g.id !== id);
  saveData();
  closeForm();
  renderAll();
}

/* ---------- Formulaire ---------- */
const formOverlay = document.getElementById("formOverlay");
const goalForm = document.getElementById("goalForm");
const fName = document.getElementById("fName");
const fCategory = document.getElementById("fCategory");
const fType = document.getElementById("fType");
const fCurrent = document.getElementById("fCurrent");
const fTarget = document.getElementById("fTarget");
const fUnit = document.getElementById("fUnit");
const fDeadline = document.getElementById("fDeadline");
const fNote = document.getElementById("fNote");
const progressFields = document.getElementById("progressFields");
const formDelete = document.getElementById("formDelete");
const formTitle = document.getElementById("formTitle");

let currentType = "binary";

function populateCategorySelect(){
  fCategory.innerHTML = "";
  usedCategories().forEach(cat => {
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

function openForm(id){
  editingId = id;
  populateCategorySelect();
  goalForm.reset();

  if(id){
    const g = goals.find(x => x.id === id);
    formTitle.textContent = "Modifier l'objectif";
    formDelete.hidden = false;
    fName.value = g.name;
    fCategory.value = g.category;
    setType(g.type);
    fCurrent.value = g.current ?? "";
    fTarget.value = g.target ?? "";
    fUnit.value = g.unit || "";
    fDeadline.value = g.deadline || "";
    fNote.value = g.note || "";
  }else{
    formTitle.textContent = "Nouvel objectif";
    formDelete.hidden = true;
    setType("binary");
    if(fCategory.options.length) fCategory.value = fCategory.options[0].value;
  }

  formOverlay.hidden = false;
}

function closeForm(){
  formOverlay.hidden = true;
  editingId = null;
}

function saveForm(){
  const name = fName.value.trim();
  if(!name){ fName.focus(); return; }

  const category = fCategory.value || "Personnel";
  const deadline = fDeadline.value || null;
  const note = fNote.value.trim() || null;

  if(editingId){
    const g = goals.find(x => x.id === editingId);
    g.name = name;
    g.category = category;
    g.type = currentType;
    g.deadline = deadline;
    g.note = note;
    if(currentType === "progress"){
      g.current = fCurrent.value === "" ? 0 : Number(fCurrent.value);
      g.target = fTarget.value === "" ? 0 : Number(fTarget.value);
      g.unit = fUnit.value.trim();
    }else{
      g.current = null; g.target = null; g.unit = "";
    }
  }else{
    const newGoal = {
      id: uid(),
      name, category,
      type: currentType,
      completed: false,
      current: currentType === "progress" ? (fCurrent.value === "" ? 0 : Number(fCurrent.value)) : null,
      target: currentType === "progress" ? (fTarget.value === "" ? 0 : Number(fTarget.value)) : null,
      unit: currentType === "progress" ? fUnit.value.trim() : "",
      deadline, note,
      createdAt: Date.now()
    };
    goals.push(newGoal);
  }

  saveData();
  closeForm();
  renderAll();
}

document.getElementById("addBtn").addEventListener("click", () => openForm(null));
document.getElementById("formCancel").addEventListener("click", closeForm);
document.getElementById("formSave").addEventListener("click", (e) => { e.preventDefault(); saveForm(); });
goalForm.addEventListener("submit", (e) => { e.preventDefault(); saveForm(); });
formDelete.addEventListener("click", () => {
  if(editingId && confirm("Supprimer cet objectif ?")) deleteGoal(editingId);
});
formOverlay.addEventListener("click", (e) => { if(e.target === formOverlay) closeForm(); });

/* ---------- Menu (export / import / reset) ---------- */
const menuOverlay = document.getElementById("menuOverlay");
document.getElementById("menuBtn").addEventListener("click", () => { menuOverlay.hidden = false; });
document.getElementById("menuCancel").addEventListener("click", () => { menuOverlay.hidden = true; });
menuOverlay.addEventListener("click", (e) => { if(e.target === menuOverlay) menuOverlay.hidden = true; });

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(goals, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "objectifs2026.json";
  a.click();
  URL.revokeObjectURL(url);
  menuOverlay.hidden = true;
});

document.getElementById("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!Array.isArray(parsed)) throw new Error("Format invalide");
      goals = parsed;
      saveData();
      renderAll();
      menuOverlay.hidden = true;
    }catch(err){
      alert("Fichier invalide. Impossible d'importer ces données.");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if(confirm("Réinitialiser toutes les données ? Cette action est irréversible.")){
    goals = JSON.parse(JSON.stringify(SEED_GOALS));
    saveData();
    renderAll();
    menuOverlay.hidden = true;
  }
});

/* ---------- Service worker (offline) ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ---------- Init ---------- */
loadData();
renderAll();

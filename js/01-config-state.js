/* =====================================================================
   01 — GLOBAL CONFIG & STATE
   1.1  Application state object
   1.2  Section lists (all / guided workflow)
   1.3  Error markers (invalid value detection)
   1.4  Intent patterns & routing
   1.5  Analysis goals
   1.6  Goal / intent detection helpers
   1.7  Workflow builder
   1.8  Templates
   1.9  UI persistence helpers (saveUI / getUI)
   ===================================================================== */

/* 1.1 Application state --------------------------------------------- */
const state = { df:null, columns:[], originalDf:null, history:[], rules:[], customMarkers:[],
                guidedMode:true, ui:{}, workflow:null, typeCache:{}, diag:null, goal:"generic", recs:[], _mc:null, _patterns:null };

/* 1.2 Section lists ------------------------------------------------- */
const ALL_SECTIONS = ["Setup","Preview","Columns","Types","Invalid values","Text cleaning","Duplicates","Missing values","Outliers","Formulas","Rules","Visualizations","Express cleaning","History","Compare & Export"];
const FULL_GUIDED  = ["Preview","Columns","Types","Invalid values","Duplicates","Missing values","Outliers","Rules","History","Compare & Export"];
let currentSection = "Preview";

/* 1.3 Error markers ------------------------------------------------- */
let ERROR_MARKERS = ["error","err","errors","#error","#error!","n/a","n.a.","na","#n/a","null","#null!","none","nil","nan","#ref!","#value!","#num!","#div/0!","#name?","#name!","-","--","---","?","??","???","tbd","xxx","...","..","unavailable","non renseigné","non renseigne","inconnu","à définir","a definir","vide"];
let ERROR_SET = new Set(ERROR_MARKERS.map(function(m){ return m.toLowerCase(); }));

/* 1.4 Intent patterns & routing ------------------------------------ */
const INTENT_PATTERNS = {
  columns:/column|colonne|drop|supprim.*colonne|remove col|renam|standardi/i,
  invalid:/invalid|error|erreur|corrupt|marker|marqueur|N\/A/i,
  duplicates:/duplicat|doublon|repeat|répét/i,
  missing:/missing|manquant|nan|vide|empty|null|remplir|fill|impute|inférer|inferer|déduire|deduce/i,
  outliers:/outlier|aberrant|extrême|extreme|anomal|hors.*plage/i,
  formulas:/calcul|compute|total|derived|nouvelle.*colonne|formula/i,
  rules:/valid|règle|regle|rule|between|entre|constrain/i,
  text:/text|texte|case|majuscule|whitespace|trim|space|accent/i,
  visualizations:/visuali|graph|chart|plot|graphique|histogram/i
};
const INTENT_TO_SECTIONS = { columns:"Columns", invalid:"Invalid values", duplicates:"Duplicates", missing:"Missing values", outliers:"Outliers", formulas:"Formulas", rules:"Rules", text:"Invalid values", visualizations:"Visualizations" };

/* 1.5 Analysis goals ------------------------------------------------ */
const GOALS = {
  ml_supervised:{ label:"Supervised ML (prediction / classification)", rgx:/prédi|predi|regress|classif|forecast|churn|scoring|machine learning|\bml\b|train|entrain|model/i },
  clustering:{ label:"Clustering / segmentation", rgx:/cluster|segment|kmeans|k-means|typolog/i },
  exploratory:{ label:"Exploratory analysis", rgx:/explor|analys|dashboard|insight|comprendre|understand/i },
  reporting:{ label:"Reporting / sharing", rgx:/rapport|report|export|excel|présent|present|partag|share/i }
};

/* 1.6 Goal / intent detection -------------------------------------- */
function detectGoal(t){ for (var k in GOALS) { if (GOALS[k].rgx.test(t)) return k; } return "generic"; }
function detectIntents(text) {
  var t = text.toLowerCase(); var found = [];
  Object.entries(INTENT_PATTERNS).forEach(function(pair){ if (pair[1].test(t)) found.push(pair[0]); });
  var goal = detectGoal(t);
  if (goal==="ml_supervised"||goal==="clustering") found.push("columns","invalid","missing","duplicates","outliers");
  if (goal==="exploratory") found.push("missing","invalid","duplicates","visualizations");
  if (goal==="reporting") found.push("invalid","missing","text","visualizations");
  if (/complet|full|tout|everything|all/.test(t)) return Object.keys(INTENT_TO_SECTIONS);
  return [...new Set(found)];
}

/* 1.7 Workflow builder --------------------------------------------- */
function buildWorkflow(intents) {
  var wf = ["Preview","Columns","Types"];
  ["Invalid values","Duplicates","Missing values","Outliers","Formulas","Rules","Visualizations"]
    .forEach(function(sec){ if (Object.entries(INTENT_TO_SECTIONS).some(function(pair){ return pair[1]===sec && intents.indexOf(pair[0])>=0; })) wf.push(sec); });
  wf.push("History","Compare & Export"); return wf;
}

/* 1.8 Templates ----------------------------------------------------- */
const TEMPLATES = [
  { title:"🧹 Full cleaning", desc:"Every step, complete workflow", intents:Object.keys(INTENT_TO_SECTIONS), goal:"generic" },
  { title:"⚡ Quick clean", desc:"Duplicates + missing + errors", intents:["duplicates","missing","invalid"], goal:"generic" },
  { title:"🤖 Prepare for ML", desc:"ML: errors, missing, outliers, duplicates, ID columns", intents:["columns","invalid","missing","duplicates","outliers"], goal:"ml_supervised" },
  { title:"🎯 Clustering", desc:"Scale-ready numeric columns, no IDs, no missing", intents:["columns","missing","outliers","duplicates"], goal:"clustering" },
  { title:"📊 Analysis-ready", desc:"Exploratory analysis with visualizations", intents:["missing","invalid","duplicates","visualizations"], goal:"exploratory" },
  { title:"✔ Validation only", desc:"Business rules + invalid values", intents:["invalid","rules"], goal:"generic" }
];

/* 1.9 UI persistence helpers --------------------------------------- */
function saveUI(s,k,v) { if (!state.ui[s]) state.ui[s] = {}; state.ui[s][k] = v; }
function getUI(s,k,f) { return state.ui[s] && state.ui[s][k] !== undefined ? state.ui[s][k] : f; }

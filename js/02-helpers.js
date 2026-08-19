/* =====================================================================
   02 — GENERIC HELPERS
   2.1  Toast notifications
   2.2  applyChange (history + re-render)
   2.3  Value tests (isMissing / isInvalid)
   2.4  Numeric helpers (median, mean, mode, quantile, numericValues)
   2.5  Progress modal
   2.6  Batched processing
   2.7  Multi-select widget
   ===================================================================== */

/* 2.1 Toast --------------------------------------------------------- */
function toast(msg, type) { if(!type)type="success"; var t=document.getElementById("toast"); t.textContent=msg; t.style.background=type==="error"?"var(--danger)":"var(--accent2)"; t.classList.remove("hidden"); setTimeout(function(){t.classList.add("hidden");},2500); }

/* 2.2 applyChange --------------------------------------------------- */
function applyChange(newDf, description, action) {
  state.typeCache = {}; state.diag = null; state._mc = null;
  var entry = { description:description, action:action, timestamp:new Date().toLocaleTimeString() };
  if (state.df.length < 20000) {
    try { entry.snapshot = structuredClone(state.df); }
    catch(e) { entry.snapshot = JSON.parse(JSON.stringify(state.df)); }
  }
  state.history.push(entry);
  if (state.history.length > 30) state.history.shift();
  state.df = newDf; state.columns = Object.keys(newDf[0] || {});
  entry.qualityAfter = qualityAudit().score;
  toast(description); renderSection(currentSection);
}

/* 2.3 Value tests --------------------------------------------------- */
function isMissing(v) { return v===null||v===undefined||v===""||(typeof v==="number"&&isNaN(v)); }
function isInvalid(v) { if (isMissing(v)) return false; var s=String(v).trim().toLowerCase(); if(!s) return false; return ERROR_SET.has(s)||state.customMarkers.indexOf(s)>=0; }

/* 2.4 Numeric helpers ---------------------------------------------- */
function numericValues(col) { var out=[]; for(var i=0;i<state.df.length;i++){var v=state.df[i][col]; if(typeof v==="number"&&!isNaN(v)) out.push(v);} return out; }
function median(a) { var s=a.slice().sort(function(x,y){return x-y;}); var m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function mean(a) { var s=0; for(var i=0;i<a.length;i++) s+=a[i]; return s/a.length; }
function mode(a) { var c={}; for(var i=0;i<a.length;i++) c[a[i]]=(c[a[i]]||0)+1; var best=null,bc=0; for(var k in c){if(c[k]>bc){bc=c[k];best=k;}} return best; }
function quantile(a,q) { var s=a.slice().sort(function(x,y){return x-y;}); var p=(s.length-1)*q; var b=Math.floor(p); var r=p-b; return s[b+1]!==undefined?s[b]+r*(s[b+1]-s[b]):s[b]; }

/* 2.5 Progress modal ------------------------------------------------ */
function showProgress(title) {
  let m = document.getElementById("progressModal");
  if (!m) {
    m = document.createElement("div"); m.id = "progressModal";
    m.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center";
    m.innerHTML = `<div style="background:var(--panel);padding:30px;border-radius:12px;min-width:400px;text-align:center">
      <h3 id="pmTitle" style="margin:0 0 20px">${title}</h3>
      <div style="height:20px;background:var(--panel2);border-radius:10px;overflow:hidden">
        <div id="pmBar" style="height:100%;width:0%;background:var(--accent);transition:width 0.1s"></div>
      </div>
      <div id="pmText" class="muted" style="margin-top:12px">Processing...</div></div>`;
    document.body.appendChild(m);
  } else { document.getElementById("pmTitle").textContent = title; m.style.display = "flex"; }
}
function updateProgress(done, total) {
  const pct = Math.round(done/total*100);
  document.getElementById("pmBar").style.width = pct+"%";
  document.getElementById("pmText").textContent = `${done.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
}
function hideProgress() { const m = document.getElementById("progressModal"); if (m) m.style.display = "none"; }

/* 2.6 Batched processing ------------------------------------------- */
async function processBatched(transformFn, description, action, options={}) {
  const total = state.df.length;
  const threshold = options.threshold || 5000;
  const batchSize = Math.max(1000, Math.min(5000, Math.floor(total/20)));
  if (total < threshold) { return applyChange(transformFn(state.df), description, action); }
  showProgress(description); await new Promise(r => setTimeout(r, 50));
  const newDf = [];
  try {
    for (let i = 0; i < total; i += batchSize) {
      const batch = state.df.slice(i, i + batchSize);
      const result = transformFn(batch);
      if (Array.isArray(result)) newDf.push(...result);
      updateProgress(Math.min(i + batchSize, total), total);
      await new Promise(r => setTimeout(r, 5));
    }
  } finally { hideProgress(); }
  applyChange(newDf, description, action);
}

/* 2.7 Multi-select widget ------------------------------------------ */
function multiSelectHTML(id, options, selected=[]) {
  return `<div class="multiselect" id="${id}">
    <button type="button" class="multiselect-toggle" onclick="toggleMulti('${id}')">${selected.length ? `${selected.length} selected` : 'Select columns...'}</button>
    <div class="multiselect-menu hidden">
      <label><input type="checkbox" class="ms-all" onchange="toggleAllMulti('${id}', this.checked)" /> <b>All</b></label>
      <hr style="border-color:var(--border)"/>
      ${options.map(opt => `<label><input type="checkbox" value="${opt}" ${selected.includes(opt)?'checked':''} onchange="updateMultiText('${id}')" /> ${opt}</label>`).join('')}
    </div></div>`;
}
window.toggleMulti = (id) => { document.querySelector(`#${id} .multiselect-menu`).classList.toggle('hidden'); };
window.toggleAllMulti = (id, ch) => { document.querySelectorAll(`#${id} input[type=checkbox]:not(.ms-all)`).forEach(cb => cb.checked = ch); updateMultiText(id); };
window.updateMultiText = (id) => { const s = getMultiSelected(id); document.querySelector(`#${id} .multiselect-toggle`).textContent = s.length ? `${s.length} selected` : 'Select columns...'; };
function getMultiSelected(id) { return [...document.querySelectorAll(`#${id} input[type=checkbox]:not(.ms-all):checked`)].map(cb => cb.value); }
document.addEventListener('click', (e) => { document.querySelectorAll('.multiselect').forEach(ms => { if (!ms.contains(e.target)) ms.querySelector('.multiselect-menu').classList.add('hidden'); }); });

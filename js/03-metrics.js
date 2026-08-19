/* =====================================================================
   03 — METRICS & QUALITY
   3.1  Cached metrics (single pass: missing / invalid / duplicates)
   3.2  Metric accessors (countMissing / countInvalid / countDuplicates)
   3.3  Quality audit (0–100 score + issues)
   3.4  Per-column recommendation
   3.5  Fill strategies by type
   3.6  computeFillValue
   ===================================================================== */

/* 3.1 Cached metrics (single pass) --------------------------------- */
function getCachedMetrics() {
  if (state._mc) return state._mc;
  var miss=0, inv=0, seen={}, dup=0;
  var cols=state.columns, nc=cols.length, n=state.df.length;
  for (var i=0; i<n; i++) {
    var r=state.df[i], h="";
    for (var j=0; j<nc; j++) {
      var v=r[cols[j]];
      if (isMissing(v)) miss++;
      else if (isInvalid(v)) inv++;
      h += (v===null||v===undefined ? "\x00" : String(v)) + "\x01"; // duplicate hash
    }
    if (seen[h]) dup++; else seen[h]=1;
  }
  state._mc = { missing:miss, invalid:inv, duplicates:dup };
  return state._mc;
}

/* 3.2 Metric accessors --------------------------------------------- */
function countMissing() { return getCachedMetrics().missing; }
function countInvalid() { return getCachedMetrics().invalid; }
function countDuplicates() { return getCachedMetrics().duplicates; }

/* 3.3 Quality audit ------------------------------------------------ */
function qualityAudit() {
  if (!state.df || !state.df.length) return { score:0, issues:[] };
  var n=state.df.length, cc=state.columns.length, metrics=getCachedMetrics();
  var issues=[], penalty=0;
  var add=function(p,t,x){ penalty+=p; if(p>0&&x) issues.push({type:t,text:x,penalty:p}); };
  var mr=metrics.missing/(n*cc); add(Math.min(25,mr*100), mr>0.1?"bad":"warn", mr>0?(mr*100).toFixed(1)+"% missing cells":"");
  var ir=metrics.invalid/(n*cc); add(Math.min(15,ir*200), ir>0.02?"bad":"warn", metrics.invalid>0?metrics.invalid+" invalid value(s)":"");
  var dr=metrics.duplicates/n; add(Math.min(15,dr*100), dr>0.05?"bad":"warn", metrics.duplicates>0?metrics.duplicates+" duplicated row(s)":"");
  var ec=[]; for(var i=0;i<state.columns.length;i++){var col=state.columns[i]; var allMiss=true; for(var j=0;j<n;j++){if(!isMissing(state.df[j][col])){allMiss=false;break;}} if(allMiss) ec.push(col);}
  add(Math.min(10,ec.length*5),"bad", ec.length?ec.length+" empty column(s)":"");
  var ccc=[]; for(var i=0;i<state.columns.length;i++){var col=state.columns[i]; var u=new Set(); for(var j=0;j<n;j++){var v=state.df[j][col]; if(!isMissing(v)){u.add(v); if(u.size>1)break;}} if(u.size===1) ccc.push(col);}
  add(Math.min(10,ccc.length*3),"warn", ccc.length?ccc.length+" constant column(s)":"");
  return { score:Math.max(0,Math.round(100-penalty)), issues:issues };
}

/* 3.4 Per-column recommendation ------------------------------------ */
function columnRecommendation(col) {
  var n=state.df.length; var missing=0,invalid=0,unique=new Set();
  for(var i=0;i<n;i++){var v=state.df[i][col]; if(isMissing(v))missing++; else if(isInvalid(v))invalid++; else unique.add(v);}
  var missPct=missing/n*100, invPct=invalid/n*100;
  if (missing===n) return {text:"⚠ Empty — drop",cls:"bad"};
  if (missPct>=80) return {text:"⚠ "+missPct.toFixed(0)+"% missing — drop",cls:"bad"};
  if (missPct>=50) return {text:"⚠ "+missPct.toFixed(0)+"% missing — consider drop",cls:"warn"};
  if (unique.size===1) return {text:"⚠ Constant — drop",cls:"bad"};
  if (invPct>=30) return {text:"⚠ "+invPct.toFixed(0)+"% invalid — clean first",cls:"warn"};
  if (unique.size===n && n>20) return {text:"ℹ Unique per row — likely ID",cls:"warn"};
  return {text:"✓ Keep",cls:"good"};
}

/* 3.5 Fill strategies by type -------------------------------------- */
var STRATEGIES_BY_TYPE = { integer:["zero","median","mean","mode","custom"], float:["zero","median","mean","mode","custom"], boolean:["unknown","mode","custom"], date:["unknown","mode","custom"], categorical:["unknown","mode","custom"], text:["unknown","mode","custom"], empty:["unknown","zero","custom"] };
function getDefaultStrategy(t) { return (STRATEGIES_BY_TYPE[t]||["unknown"])[0]; }

/* 3.6 computeFillValue --------------------------------------------- */
function computeFillValue(col, strategy, cv) {
  var type=detectType(col); var vals=numericValues(col);
  if (strategy==="median"&&vals.length) return median(vals);
  if (strategy==="mean"&&vals.length) return mean(vals);
  if (strategy==="mode") { var m=mode(state.df.map(function(r){return r[col];}).filter(function(v){return !isMissing(v);})); return (type==="integer"||type==="float")?parseFloat(m):m; }
  if (strategy==="zero") return 0;
  if (strategy==="unknown") return "Unknown";
  if (strategy==="custom") return cv;
  return null;
}

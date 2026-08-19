/* =====================================================================
   04 — TYPE DETECTION & PARSING
   4.1  detectType (integer/float/boolean/date/categorical/text/empty)
   4.2  typeBadge
   4.3  MONTH_MAP (English + French month names)
   4.4  parseNumberValue
   4.5  parseDateValue (month names, numeric formats, Excel serial)
   4.6  detectDateFormat
   4.7  Smart split — analyzeColumnContent
   4.8  Smart split — smartSplitDateText
   ===================================================================== */

/* 4.1 detectType --------------------------------------------------- */
function detectType(col) {
  if (state.typeCache[col]) return state.typeCache[col];
  var values = [], total = state.df.length;
  var step = Math.max(1, Math.floor(total/2000));
  for (var i=0; i<total; i+=step) { var v=state.df[i][col]; if(!isMissing(v)&&!isInvalid(v)) values.push(v); }
  if (!values.length) return state.typeCache[col] = "empty";
  var numCount=0; for(var i=0;i<values.length;i++) if(typeof values[i]==="number"&&!isNaN(values[i])) numCount++;
  var result;
  if (numCount/values.length>0.9) {
    var allInt=true; for(var i=0;i<values.length;i++) if(typeof values[i]==="number"&&!Number.isInteger(values[i])){allInt=false;break;}
    result = allInt?"integer":"float";
  } else {
    var boolSet={"true":1,"false":1,"yes":1,"no":1,"0":1,"1":1,"oui":1,"non":1};
    var boolCount=0; for(var i=0;i<values.length;i++) if(boolSet[String(values[i]).toLowerCase()]) boolCount++;
    if (boolCount/values.length>0.9) result="boolean";
    else {
      var dateCount=0; for(var i=0;i<values.length;i++) if(typeof values[i]==="string"&&values[i].length>=6&&!isNaN(Date.parse(values[i]))) dateCount++;
      if (dateCount/values.length>0.8) result="date";
      else { var unique=new Set(); for(var i=0;i<values.length;i++) unique.add(String(values[i])); result=(unique.size<=20||unique.size/values.length<0.1)?"categorical":"text"; }
    }
  }
  return state.typeCache[col] = result;
}

/* 4.2 typeBadge ---------------------------------------------------- */
function typeBadge(col) { var t=detectType(col); return '<span class="badge '+t+'">'+t+'</span>'; }

/* 4.3 MONTH_MAP ---------------------------------------------------- */
var MONTH_MAP = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
  // French month names
  janvier:1,février:2,fevrier:2,mars:3,avril:4,mai:5,juin:6,
  juillet:7,août:8,aout:8,septembre:9,octobre:10,novembre:11,décembre:12,decembre:12
};

/* 4.4 parseNumberValue --------------------------------------------- */
function parseNumberValue(s) {
  if (typeof s==="number") return s;
  if (isMissing(s)||isInvalid(s)) return null;
  s=String(s).trim(); if(!s) return null;
  var n=Number(s); if(!isNaN(n)) return n;
  var s2=s.replace(/\s/g,"").replace(/,/g,"."); n=Number(s2); if(!isNaN(n)) return n;
  var s3=s.replace(/\s/g,"").replace(/\./g,"").replace(",","."); n=Number(s3); if(!isNaN(n)) return n;
  return null;
}

/* 4.5 parseDateValue ----------------------------------------------- */
function parseDateValue(s, fmt) {
  if (isMissing(s)||isInvalid(s)) return null;
  if (typeof s==="number") {
    if (s>10000&&s<200000){var dd=new Date((s-25569)*86400000);return !isNaN(dd.getTime())?dd.toISOString().split("T")[0]:null;}
    return null;
  }
  s=String(s).trim(); if(!s||s.length<4) return null;
  function tryD(y,m,d){
    y=parseInt(y);m=parseInt(m);d=parseInt(d);
    if(isNaN(y)||isNaN(m)||isNaN(d))return null;
    if(y<100)y+=2000; if(m<1||m>12||d<1||d>31)return null;
    var dt=new Date(y,m-1,d);
    return(!isNaN(dt)&&dt.getMonth()===m-1)?dt.toISOString().split("T")[0]:null;
  }
  // Month-name format: "June 26, 1898" / "26 June 1898" / "June 26, 1898, Edmonton"
  var tokens=s.split(/[\s,]+/).filter(Boolean);
  var monthIdx=-1, monthNum=0;
  for(var ti=0;ti<tokens.length;ti++){
    var mn=MONTH_MAP[tokens[ti].toLowerCase()];
    if(mn){monthIdx=ti;monthNum=mn;break;}
  }
  if(monthIdx>=0){
    var nums=[];
    for(var ni=0;ni<Math.min(tokens.length,4);ni++){
      if(ni!==monthIdx && /^\d+$/.test(tokens[ni])){
        var nn=parseInt(tokens[ni]);
        if((nn>=1&&nn<=31)||(nn>=1000&&nn<=2200)) nums.push(nn);
      }
    }
    if(nums.length>=2){
      var day,year;
      if(nums[0]<=31&&nums[1]>=100){day=nums[0];year=nums[1];}
      else if(nums[1]<=31&&nums[0]>=100){day=nums[1];year=nums[0];}
      else{day=nums[0];year=nums[1];if(year<100)year+=2000;}
      return tryD(year,monthNum,day);
    }
    if(nums.length===1){ if(nums[0]>=100) return tryD(nums[0],monthNum,1); else return null; }
  }
  // Numeric formats
  var parts=s.split(/[\/\-\.]/);
  if(fmt==="auto"){
    if(parts.length===3&&parseInt(parts[0])>31)return tryD(parts[0],parts[1],parts[2]);
    if(parts.length===3){ if(parseInt(parts[0])>12)return tryD(parts[2],parts[1],parts[0]); return tryD(parts[2],parts[1],parts[0]); }
    return null;
  }
  if(parts.length!==3)return null;
  if(fmt==="YYYY-MM-DD")return tryD(parts[0],parts[1],parts[2]);
  if(fmt==="DD/MM/YYYY"||fmt==="DD-MM-YYYY"||fmt==="DD.MM.YYYY")return tryD(parts[2],parts[1],parts[0]);
  if(fmt==="MM/DD/YYYY")return tryD(parts[2],parts[0],parts[1]);
  return null;
}

/* 4.6 detectDateFormat --------------------------------------------- */
function detectDateFormat(col){
  var samples=[];
  for(var i=0;i<state.df.length&&samples.length<100;i++){
    var v=state.df[i][col];if(!isMissing(v)&&!isInvalid(v))samples.push(String(v).trim());}
  if(!samples.length)return"auto";
  var monthCount=0;
  samples.forEach(function(s){var w=s.split(/[\s,]+/);if(w.some(function(ww){return MONTH_MAP[ww.toLowerCase()]!==undefined;}))monthCount++;});
  if(monthCount/samples.length>0.5)return"auto";
  if(samples.filter(function(s){return /^\d{4}[\/\-]/.test(s);}).length>samples.length*0.8)return"YYYY-MM-DD";
  var splits=samples.map(function(s){return s.split(/[\/\-\.]/);}).filter(function(p){return p.length===3;});
  if(!splits.length)return"auto";
  var firstMax=Math.max.apply(null,splits.map(function(p){return parseInt(p[0])||0;}));
  var secondMax=Math.max.apply(null,splits.map(function(p){return parseInt(p[1])||0;}));
  if(firstMax>12&&secondMax<=12)return"DD/MM/YYYY";
  if(secondMax>12&&firstMax<=12)return"MM/DD/YYYY";
  var sep=samples[0]&&samples[0].match(/[\/\-\.]/);sep=sep?sep[0]:"/";
  if(sep==="-")return"DD-MM-YYYY";if(sep===".")return"DD.MM.YYYY";return"DD/MM/YYYY";
}

/* 4.7 analyzeColumnContent (detect mixed date+text) ---------------- */
function analyzeColumnContent(col){
  var samples=[],maxSamples=200;
  for(var i=0;i<state.df.length&&samples.length<maxSamples;i++){
    var v=state.df[i][col];if(!isMissing(v)&&!isInvalid(v))samples.push(String(v).trim());}
  if(!samples.length)return{type:"empty"};
  var hasDateAndText=0,dateParts=[],textParts=[],originals=[];
  samples.forEach(function(s){
    var tokens=s.split(/[,;|]\s*/).map(function(t){return t.trim();}).filter(Boolean);
    if(tokens.length<2)return;
    var dateTokens=[],txtTokens=[];
    tokens.forEach(function(t){
      var words=t.split(/\s+/);
      var hasMonth=words.some(function(w){return MONTH_MAP[w.toLowerCase()]!==undefined;});
      if(hasMonth){ dateTokens.push(t); }
      else if(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(t)||/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(t)){ dateTokens.push(t); }
      else if(/^\d{1,4}$/.test(t)){
        var nn=parseInt(t);
        if((nn>=1&&nn<=31)||(nn>=1000&&nn<=2200))dateTokens.push(t); else txtTokens.push(t);
      } else { txtTokens.push(t); }
    });
    if(dateTokens.length>=1&&txtTokens.length>=1){
      hasDateAndText++;
      if(dateParts.length<5){dateParts.push(dateTokens.join(", "));textParts.push(txtTokens.join(", "));originals.push(s);}
    }
  });
  if(hasDateAndText/samples.length>=0.3)
    return{type:"date_and_text",ratio:hasDateAndText/samples.length,dateParts:dateParts,textParts:textParts,originals:originals,total:samples.length};
  return{type:"simple"};
}

/* 4.8 smartSplitDateText ------------------------------------------- */
function smartSplitDateText(value,numericCount){
  if(isMissing(value))return{date:null,text:null};
  if(!numericCount)numericCount=3;
  var s=String(value).trim();
  var tokens=s.split(/[,;|]\s*/).map(function(t){return t.trim();}).filter(Boolean);
  var dateTokens=[],textTokens=[],dateNumCollected=0;
  tokens.forEach(function(t){
    var words=t.split(/\s+/);
    var hasMonth=words.some(function(w){return MONTH_MAP[w.toLowerCase()]!==undefined;});
    if(hasMonth){ dateTokens.push(t); }
    else if(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(t)||/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(t)){ dateTokens.push(t); }
    else if(/^\d{1,4}$/.test(t)){
      var nn=parseInt(t);
      if(dateNumCollected<numericCount&&((nn>=1&&nn<=31)||(nn>=1000&&nn<=2200))){ dateTokens.push(t);dateNumCollected++; }
      else {textTokens.push(t);}
    } else { textTokens.push(t); }
  });
  return{date:dateTokens.join(", ")||null,text:textTokens.join(", ")||null};
}

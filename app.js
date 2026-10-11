// Versleutelde versie: data.json en alle plaatjes zijn AES-GCM versleuteld (sleutel via PBKDF2-SHA256).
let KEY=null; const urlCache={};
const ub=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(buf){const b=new Uint8Array(buf);return crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},KEY,b.slice(12))}
async function derive(pw,m){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:ub(m.salt),iterations:m.iterations},base,256);return new Uint8Array(bits)}
async function useRaw(raw,m){KEY=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);await dec(ub(m.check))}
async function gate(){const m=await (await fetch('meta.json',{cache:'no-cache'})).json();
  const saved=sessionStorage.getItem('k');if(saved){try{await useRaw(ub(saved),m);return}catch(e){sessionStorage.removeItem('k')}}
  $('gate').hidden=false;$('pw').focus();await new Promise(res=>{const go=async()=>{$('pwok').disabled=true;$('pwerr').hidden=true;
    try{const raw=await derive($('pw').value,m);await useRaw(raw,m);sessionStorage.setItem('k',btoa(String.fromCharCode(...raw)));$('gate').hidden=true;res()}
    catch(e){$('pwerr').hidden=false;$('pw').value='';$('pw').focus()}$('pwok').disabled=false};
  $('pwok').onclick=go;$('pw').onkeydown=e=>e.key==='Enter'&&go()})}
async function blobUrl(p){if(!urlCache[p])urlCache[p]=fetch(p).then(r=>r.arrayBuffer()).then(dec).then(b=>URL.createObjectURL(new Blob([b],{type:'image/jpeg'})));return urlCache[p]}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);blobUrl(e.target.dataset.src).then(u=>e.target.src=u)}}),{rootMargin:'300px'});
function hydrate(){document.querySelectorAll('img[data-src]:not([src])').forEach(i=>io.observe(i))}
let CARDS = [], sel = JSON.parse(localStorage.getItem('sel') || '[]');
const $ = id => document.getElementById(id);
const setName = s => s.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
function save(){localStorage.setItem('sel',JSON.stringify(sel))}
function renderGrid(){const q=$('q').value.trim().toLowerCase(),st=$('set').value,se=$('season').value;
  const list=CARDS.filter(c=>(!q||c.name.toLowerCase().includes(q))&&(!st||c.set===st)&&(!se||c.seasons.includes(+se)));
  $('count').textContent=list.length+' plaatjes';
  $('grid').innerHTML=list.map(c=>`<div class="card${sel.includes(c.id)?' on':''}" data-id="${c.id}" title="${c.info||''}"><div class="badge">${sel.filter(x=>x===c.id).length||''}</div><img data-src="${c.thumb}" alt="${c.name}"><div class="n">${c.name}</div><div class="s">${setName(c.set)} #${c.number}${c.seasons.length?' · S'+c.seasons.join(', S'):''}</div></div>`).join('')||'<p>Niets gevonden 😢</p>';hydrate()}
function renderSel(){const by=Object.fromEntries(CARDS.map(c=>[c.id,c]));sel=sel.filter(i=>by[i]);
  $('selcount').textContent='('+sel.length+')';$('empty').hidden=sel.length>0;$('pdf').disabled=!sel.length;
  $('sel').innerHTML=sel.map((id,i)=>`<li><img data-src="${by[id].thumb}"><span>${by[id].name}</span><button data-a="up" data-i="${i}" title="Omhoog">⬆️</button><button data-a="down" data-i="${i}" title="Omlaag">⬇️</button><button data-a="del" data-i="${i}" title="Weg">❌</button></li>`).join('');hydrate();save()}
$('grid').onclick=e=>{const c=e.target.closest('.card');if(!c)return;const id=c.dataset.id,k=sel.indexOf(id);k<0?sel.push(id):sel.splice(k,1);renderSel();renderGrid()};
$('sel').onclick=e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i,a=b.dataset.a;
  if(a==='del')sel.splice(i,1);else{const j=a==='up'?i-1:i+1;if(j<0||j>=sel.length)return;[sel[i],sel[j]]=[sel[j],sel[i]]}renderSel();renderGrid()};
$('clear').onclick=()=>{if(confirm('Printlijst leegmaken?')){sel=[];renderSel();renderGrid()}};
['q','set','season'].forEach(i=>$(i).addEventListener('input',renderGrid));
function loadImg(src){return new Promise((r,j)=>{const im=new Image();im.onload=()=>r(im);im.onerror=j;im.src=src})}
// Zelfde maten als tools/print_sheet.py: marge 8 mm, tussenruimte 8 mm, gestippelde kniplijnen.
async function makePDF(){const lay=+document.querySelector('input[name=lay]:checked').value,by=Object.fromEntries(CARDS.map(c=>[c.id,c]));
  $('pdf').disabled=true;const land=lay===2;const doc=new jspdf.jsPDF({orientation:land?'landscape':'portrait',unit:'mm',format:'a4',compress:true});
  const W=land?297:210,H=land?210:297,m=8,g=8,cols=lay===1?1:2,rows=lay===4?2:1,cw=(W-2*m-(cols-1)*g)/cols,ch=(H-2*m-(rows-1)*g)/rows;
  for(let i=0;i<sel.length;i++){const k=i%lay;if(i&&!k)doc.addPage();
    if(!k&&lay>1){doc.setLineDashPattern([0.7,1.06],0);doc.setLineWidth(0.1);doc.setDrawColor(153);doc.line(W/2,m/2,W/2,H-m/2);if(lay===4)doc.line(m/2,H/2,W-m/2,H/2)}
    $('status').textContent=`Bezig… ${i+1}/${sel.length}`;const c=by[sel[i]],im=await loadImg(await blobUrl(c.page));
    const col=k%cols,row=Math.floor(k/cols),x0=m+col*(cw+g),y0=m+row*(ch+g),s=Math.min(cw/im.naturalWidth,ch/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;
    doc.addImage(im,'JPEG',x0+(cw-w)/2,y0+(ch-h)/2,w,h,c.id,'NONE')}
  window.__lastPdf=doc.output('datauristring');doc.save(`kleurplaten-${lay}per-vel.pdf`);$('status').textContent='Klaar! ✅';$('pdf').disabled=false}
$('pdf').onclick=()=>makePDF().catch(e=>{$('status').textContent='Fout: '+e;$('pdf').disabled=false});
(async()=>{await gate();CARDS=JSON.parse(new TextDecoder().decode(await dec(await (await fetch('d/data',{cache:'no-cache'})).arrayBuffer()))).cards;
  [...new Set(CARDS.map(c=>c.set))].sort().forEach(s=>$('set').add(new Option(setName(s),s)));renderGrid();renderSel()})();

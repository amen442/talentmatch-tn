const U={
  esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  fmtDate:d=>d?new Date(d).toLocaleString('fr-FR'):'—',
  count:(arr,fn)=>{const m={};arr.forEach(x=>{const k=fn(x)||'Non renseigné';m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])},
  safeUrl:u=>{try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)?x.href:null}catch(e){return null}},
  toast(msg,type='info'){const t=document.createElement('div');t.className='toast '+type;t.setAttribute('role',type==='error'?'alert':'status');
    const text=document.createElement('span');text.textContent=msg;const x=document.createElement('button');x.className='toast-close';x.type='button';x.setAttribute('aria-label','Fermer');x.textContent='×';
    t.append(text,x);document.getElementById('toasts').appendChild(t);
    const leave=()=>{if(t.classList.contains('leaving'))return;t.classList.add('leaving');setTimeout(()=>t.remove(),250)};x.onclick=leave;setTimeout(leave,4500)}
};
U.opp=o=>typeof o==='string'?o:(o&&(o.title||o.name))||'';
// Lien CV : une URL http(s), ou un fichier PDF/Word importé localement (encodé en data: URL).
U.cvUrl=u=>{const v=String(u||'');return U.safeUrl(v)||(/^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,/.test(v)?v:null)};
U.link=(u,t)=>{const s=U.safeUrl(u);return s?`<a href="${U.esc(s)}" target="_blank" rel="noopener noreferrer">${U.esc(t)}</a>`:'<span class="muted">—</span>'};
U.logError=(src,msg)=>{let a=[];try{a=JSON.parse(localStorage.getItem('tm_errors')||'[]')}catch(e){}a.unshift({src,msg,at:new Date().toISOString()});localStorage.setItem('tm_errors',JSON.stringify(a.slice(0,50)))};
U.download=(name,txt)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+txt],{type:'text/csv'}));a.download=name;a.click()};
U.toCSV=(rows,cols)=>[cols.join(',')].concat(rows.map(r=>cols.map(c=>{let v=Array.isArray(r[c])?r[c].join('; '):(r[c]??'');v=String(v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(','))).join('\n');
U.parseCSV=t=>{t=t.replace(/^\uFEFF/,'');const l=t.split('\n')[0],d=(l.match(/;/g)||[]).length>(l.match(/,/g)||[]).length?';':',';const rows=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];
    if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch=='"')q=true;else if(ch==d){r.push(c);c=''}
    else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);c='';rows.push(r);r=[]}else c+=ch}
  if(c||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(v=>v.trim()))};
U.modal=html=>{const o=document.createElement('div');o.className='overlay';o.innerHTML='<div class="modal" role="dialog" aria-modal="true"><button class="btn x" aria-label="Fermer">✕</button>'+html+'</div>';document.body.appendChild(o);
  const before=document.activeElement,onKey=e=>{if(e.key==='Escape')close()};
  const close=()=>{document.removeEventListener('keydown',onKey);o.classList.add('leaving');setTimeout(()=>o.remove(),180);if(before&&before.focus)before.focus()};
  o.querySelector('.x').onclick=close;o.onclick=e=>{if(e.target===o)close()};document.addEventListener('keydown',onKey);
  const first=o.querySelector('.modal input,.modal select,.modal textarea,.modal .btn:not(.x)');(first||o.querySelector('.x')).focus({preventScroll:true});
  return{el:o,close}};
// Tableau avec tri (clic sur l'en-tête), pagination et actions (boutons data-act)
U.table=(el,cols,o={})=>{let rows=[],sort=null,pg=1,cur=[];const ps=o.pageSize||10;
  function draw(){const r=[...rows];if(sort)r.sort((a,b)=>{const x=a[sort.k]??'',y=b[sort.k]??'';return(typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'fr'))*sort.d});
    const n=Math.max(1,Math.ceil(r.length/ps));pg=Math.min(pg,n);cur=r.slice((pg-1)*ps,pg*ps);
    if(!r.length){el.innerHTML='<p class="muted">Aucun résultat.</p>';return}
    el.innerHTML=`<div class="tw"><table><thead><tr>${cols.map(c=>`<th data-k="${c.k}">${c.l}${sort&&sort.k===c.k?(sort.d>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead><tbody>${cur.map(x=>`<tr>${cols.map(c=>`<td>${c.r?c.r(x):U.esc(Array.isArray(x[c.k])?x[c.k].join(', '):x[c.k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="pager"><button class="btn" data-p="-1">‹</button><span>Page ${pg}/${n} — ${r.length} ligne(s)</span><button class="btn" data-p="1">›</button></div>`}
  el.onclick=e=>{const th=e.target.closest('th[data-k]'),pb=e.target.closest('[data-p]'),ab=e.target.closest('[data-act]');
    if(th&&th.dataset.k!=='_'){const k=th.dataset.k;sort=sort&&sort.k===k?{k,d:-sort.d}:{k,d:1};draw()}
    else if(pb){pg=Math.max(1,pg+ +pb.dataset.p);draw()}
    else if(ab){const i=[...el.querySelectorAll('tbody tr')].indexOf(ab.closest('tr'));o.onAction&&o.onAction(ab.dataset.act,cur[i])}};
  return{set(r){rows=r;pg=1;draw()}}};

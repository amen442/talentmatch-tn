(function(){
  const I=App.icon;
  const empty=(text,icon)=>`<div class="empty-inline">${icon||''}<span>${text}</span></div>`;
  function bars(el,rows){el.innerHTML=rows.length?rows.map(([k,v])=>{const max=rows[0][1];return`<div class="bar"><span title="${U.esc(k)}">${U.esc(k)}</span><span class="track"><i style="width:${Math.max(4,v/max*100)}%"></i></span><b>${v}</b></div>`}).join(''):empty('Aucune donnée pour le moment.')}
  // Compteurs animés (respecte « réduire les animations »)
  function countUp(el){const end=+el.dataset.v;if(!end||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){el.textContent=end;return}
    const t0=performance.now(),d=700;const step=t=>{const p=Math.min(1,(t-t0)/d);el.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
  const studentName=id=>{const s=Store.get('students').find(x=>x.ID===id);return s?(s.Name||s.ID):id};
  const companyName=id=>{const c=Store.get('companies').find(x=>x.id===id);return c?(c.name||c.id):id};
  function render(){
    const s=Store.stats(),items=[
      ['Étudiants importés',s.students,I.students,'var(--blue)','var(--blue-soft)'],
      ['Entreprises',s.companies,I.companies,'var(--teal)','var(--teal-soft)'],
      ['Domaines',s.domains,I.dashboard,'var(--violet)','var(--violet-soft)'],
      ['Matchings calculés',s.matches,I.matching,'var(--ok)','var(--ok-soft)'],
      ['Sans correspondance',s.unmatched,I.history,'var(--amber)','var(--amber-soft)']];
    document.getElementById('stats').innerHTML=items.map(i=>`<div class="card stat" style="--accent:${i[3]};--accent-soft:${i[4]}"><div class="v" data-v="${i[1]}">0</div><div class="l">${i[0]}</div><div class="ico">${i[2]}</div></div>`).join('');
    document.querySelectorAll('#stats .v').forEach(countUp);
    bars(document.getElementById('chartProfiles'),U.count(Store.get('students'),x=>x.Profil));
    bars(document.getElementById('chartDomains'),U.count(Store.get('companies'),x=>x.domain));
    const ls=Store.get('searches').slice(0,5),lm=Store.get('matches').slice(0,5);
    document.getElementById('lastSearches').innerHTML=ls.length?'<div class="list">'+ls.map(x=>`<div>${U.esc(x.domain)} — <b>${x.count??0}</b> résultat(s)<br><span class="muted small">${U.fmtDate(x.searchedAt)}</span></div>`).join('')+'</div>':empty('Aucune recherche effectuée. <a href="pages/search.html">Lancer une recherche</a>',I.search);
    document.getElementById('lastMatches').innerHTML=lm.length?'<div class="list">'+lm.map(x=>`<div>${U.esc(studentName(x.studentId))} ↔ ${U.esc(companyName(x.companyId))} : <b>${U.esc(x.score)}</b>/100<br><span class="muted small">${U.fmtDate(x.at)}</span></div>`).join('')+'</div>':empty('Aucun matching calculé. <a href="pages/matching.html">Lancer un matching</a>',I.matching);
    const demo=Store.get('students').some(x=>x.isDemo)||Store.get('companies').some(x=>x.isDemo);
    document.getElementById('demoBar').innerHTML=Store.mode()==='demo'
      ?(demo?'Données <b>fictives</b> chargées. <button class="btn" id="clr">Supprimer les données de démo</button>':'Mode démo : aucune donnée. <button class="btn" id="ld">Charger des données fictives</button>')+' <button class="btn" id="go">Passer en mode connecté</button>'
      :'Mode connecté : seules les données importées ou renvoyées par n8n sont affichées. <button class="btn" id="bk">Revenir en démo</button>';
    const on=(id,fn)=>{const e=document.getElementById(id);if(e)e.onclick=fn};
    on('ld',()=>{Store.loadDemo();render()});on('clr',()=>{Store.clearDemo();render()});
    on('go',()=>{const miss=['STUDENTS_IMPORT_WEBHOOK','COMPANY_SEARCH_WEBHOOK','MATCHING_WEBHOOK'].filter(k=>!TM_CONFIG[k]);
      if(miss.length){U.toast('Configurez d\'abord : '+miss.join(', '),'error');return}Store.setMode('connected');App.refreshMode();render()});
    on('bk',()=>{Store.setMode('demo');App.refreshMode();render()});
  }
  render();
})();

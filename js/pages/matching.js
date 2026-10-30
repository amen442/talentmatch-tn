// Le profil de l'étudiant est comparé localement aux entreprises de la page Entreprises (voir Matching.run) ; aucun appel réseau.
(function(){const $=id=>document.getElementById(id);const P=new URLSearchParams(location.search);
  const S=Store.get('students'),nm=s=>s.Name||s.ID;
  $('mStudent').innerHTML=S.length?S.map(s=>`<option value="${U.esc(s.ID)}">${U.esc(nm(s))}</option>`).join(''):'<option value="">Aucun étudiant importé</option>';
  $('mDomain').innerHTML='<option value="">Tous domaines (comparer toutes les entreprises enregistrées)</option>'+TM_CONFIG.DOMAINS.map(d=>`<option>${U.esc(d)}</option>`).join('');
  if(P.get('domain'))$('mDomain').value=P.get('domain');
  if(P.get('student'))$('mStudent').value=P.get('student');
  const list=a=>(a||[]).length?`<ul>${a.map(x=>`<li>${U.esc(x)}</li>`).join('')}</ul>`:'<span class="muted">—</span>';
  function show(r){const m=r.bestMatch;
    const warn=r.message&&m?`<div class="card" style="margin-bottom:10px"><p class="muted">${U.esc(r.message)}</p></div>`:'';
    if(!m)return $('out').innerHTML=warn+`<div class="card"><p class="muted">${U.esc(r.message||'Aucune entreprise adaptée trouvée.')}</p></div>`;
    $('out').innerHTML=warn+`<div class="card"><h3>Meilleure entreprise pour ${U.esc(r.studentName||'cet étudiant')}</h3>
      <p><b>${U.esc(m.name)}</b> <span class="score ${m.score>=70?'hi':m.score<40?'lo':''}">${m.score}/100</span></p>
      <div class="kv"><b>Pourquoi</b><span>${list(m.reasons)}</span><b>À développer</b><span>${list(m.skillGaps)}</span>
      <b>Site web</b><span>${U.link(m.website,m.website)}</span><b>LinkedIn</b><span>${U.link(m.linkedinUrl,m.linkedinUrl||'')}</span></div></div>`}
  $('run').onclick=async()=>{const s=S.find(x=>x.ID===$('mStudent').value);if(!s)return U.toast('Choisissez un étudiant.','error');
    $('run').disabled=true;$('out').innerHTML='';$('state').textContent='Comparaison avec les entreprises enregistrées…';
    const r=await Matching.run({student:s,domain:$('mDomain').value});$('run').disabled=false;$('state').textContent='';
    if(!r.ok)return U.toast(r.error,'error');show(r.data);U.toast('Matching terminé.','success')};
})();

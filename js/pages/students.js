(function(){const $=id=>document.getElementById(id);let pend=null;
  $('fDomain').innerHTML='<option value="">Tous domaines</option>'+TM_CONFIG.DOMAINS.map(d=>`<option>${U.esc(d)}</option>`).join('');
  const dopt=sel=>'<option value="">—</option>'+TM_CONFIG.DOMAINS.map(d=>`<option ${d===sel?'selected':''}>${U.esc(d)}</option>`).join('');
  $('q').value=new URLSearchParams(location.search).get('q')||'';
  const T=U.table($('tbl'),[{k:'Name',l:'Nom'},{k:'Email',l:'Email'},{k:'Phone',l:'Téléphone'},{k:'Profil',l:'Profil'},{k:'Organization',l:'Organisation'},{k:'ID',l:'Identifiant'},{k:'domain',l:'Domaine',r:s=>U.esc(s.domain||'—')},{k:'_',l:'',r:()=>'<button class="btn" data-act="v">Fiche</button>'}],{onAction:(a,s)=>fiche(s)});
  function refresh(){const all=Store.get('students'),cur=$('fProfil').value;
    $('fProfil').innerHTML='<option value="">Tous profils</option>'+[...new Set(all.map(s=>s.Profil).filter(Boolean))].map(p=>`<option>${U.esc(p)}</option>`).join('');$('fProfil').value=cur;
    const q=$('q').value.toLowerCase(),fp=$('fProfil').value,fd=$('fDomain').value;
    const rows=all.filter(s=>(!q||[s.Name,s.Email,s.Profil,s.Organization].join(' ').toLowerCase().includes(q))&&(!fp||s.Profil===fp)&&(!fd||s.domain===fd));
    $('count').textContent=rows.length+' / '+all.length+' étudiant(s)';T.set(rows)}
  ['q','fProfil','fDomain'].forEach(i=>$(i).oninput=refresh);
  function preview(a,name,source){const it=a.items,c=s=>it.filter(x=>x.status===s).length;
    const m=U.modal(`<h3>Prévisualisation — ${U.esc(name)}</h3><p><span class="badge ok">${c('valid')} valides</span> <span class="badge warn">${c('duplicate')} doublons (ID/email)</span> <span class="badge err">${c('rejected')} rejetées</span></p><div class="tw"><table><tr><th>Ligne</th><th>Nom</th><th>Email</th><th>Statut</th></tr>${it.slice(0,50).map(x=>`<tr><td>${x.line}</td><td>${U.esc(x.row.Name)}</td><td>${U.esc(x.row.Email)}</td><td>${x.status==='valid'?'OK':x.status==='duplicate'?'Doublon':U.esc(x.errors.join(', '))}</td></tr>`).join('')}</table></div><p class="muted small">50 premières lignes. Les données de démo seront remplacées.</p><button class="btn primary" id="ok" ${c('valid')?'':'disabled'}>Importer ${c('valid')} étudiant(s)</button>`);
    m.el.querySelector('#ok').onclick=async()=>{const r=Students.commit(it);m.close();refresh();
      $('report').hidden=false;$('report').textContent=`Import local : ${r.imported} importée(s), ${r.duplicates} ignorée(s) (doublons), ${r.rejected} rejetée(s).`;
      if(Store.mode()==='connected'&&N8N.configured('import')){const x=await N8N.call('import',{action:'import_students',source,students:r.rows,metadata:{fileName:name,rows:it.length,importedAt:new Date().toISOString()}});
        if(x.ok)U.toast('n8n : '+x.data.importedCount+' importée(s), '+(x.data.duplicateCount??0)+' doublon(s).','success');else{U.toast(x.error,'error');U.logError('import',x.error)}}
      else U.toast('Import local terminé.','success')}}
  $('file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5e6)return U.toast('Fichier trop volumineux (5 Mo max).','error');
    const a=Students.analyse(await f.text());if(a.error){U.toast(a.error,'error');U.logError('import',a.error);return}preview(a,f.name,'csv')};
  $('gd').onclick=async()=>{$('gd').disabled=true;const r=await N8N.call('import',{action:'import_students',source:'google_drive',students:[],metadata:{request:'fetch'}});$('gd').disabled=false;
    if(!r.ok){U.toast(r.error,'error');return}
    if(!Array.isArray(r.data.students))return U.toast('n8n n\'a pas renvoyé de tableau « students » (extension du contrat nécessaire pour Google Drive).','error');
    const a=Students.analyse(r.data.students);if(a.error)return U.toast(a.error,'error');preview(a,'Google Drive','google_drive')};
  $('exp').onclick=()=>{const s=Store.get('students');if(!s.length)return U.toast('Rien à exporter.','error');U.download('etudiants.csv',U.toCSV(s,Students.COLS))};
  function addForm(){let cvFile=null;
    const m=U.modal(`<h3>Ajouter un étudiant</h3><div class="form">
      <label>Nom *<input id="n"></label><label>Email *<input id="e" placeholder="nom@exemple.com"></label>
      <label>Téléphone<input id="p"></label><label>Profil<input id="pr" placeholder="ex. Informatique, Data…"></label>
      <label>Organisation<input id="o"></label><label>Identifiant<input id="id" placeholder="auto si vide"></label>
      <label>Lien CV<input id="cv" placeholder="https://"></label><label>Domaine<select id="d">${dopt('')}</select></label>
      <label>Ou importer un fichier (PDF/Word, 1,5 Mo max)<input type="file" id="cvFile" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
      <p class="muted small full" id="cvInfo"></p>
      <label class="full">Compétences (séparées par ,)<input id="sk"></label></div>
      <div class="actions" style="margin-top:12px"><button class="btn primary" id="ok">Enregistrer</button></div>`);
    const g=i=>m.el.querySelector('#'+i);
    const clearCvFile=()=>{cvFile=null;g('cvFile').value='';g('cvInfo').innerHTML='';g('cv').disabled=false};
    g('cvFile').onchange=()=>{const f=g('cvFile').files[0];if(!f)return;
      if(f.size>1.5e6){U.toast('Fichier trop volumineux (1,5 Mo max — stockage local limité).','error');g('cvFile').value='';return}
      if(!/\.(pdf|docx?)$/i.test(f.name)&&!/^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/.test(f.type)){U.toast('Format non supporté (PDF ou Word uniquement).','error');g('cvFile').value='';return}
      const reader=new FileReader();
      reader.onload=()=>{cvFile={name:f.name,dataUrl:reader.result};g('cv').value='';g('cv').disabled=true;
        g('cvInfo').innerHTML='Fichier sélectionné : '+U.esc(f.name)+' <button type="button" class="btn" id="cvClear" style="padding:2px 8px">Retirer</button>';
        g('cvInfo').querySelector('#cvClear').onclick=clearCvFile};
      reader.onerror=()=>U.toast('Lecture du fichier impossible.','error');
      reader.readAsDataURL(f)};
    g('cv').oninput=()=>{if(g('cv').value.trim()&&cvFile)clearCvFile()};
    g('ok').onclick=()=>{const link=cvFile?cvFile.dataUrl:g('cv').value.trim();
      if(link&&!U.cvUrl(link))return U.toast('Lien CV non valide (http/https requis).','error');
      const sp=v=>v.split(',').map(x=>x.trim()).filter(Boolean);
      const r=Students.add({Name:g('n').value.trim(),Email:g('e').value.trim(),Phone:g('p').value.trim(),Profil:g('pr').value.trim(),Organization:g('o').value.trim(),ID:g('id').value.trim(),'Resume link':link,domain:g('d').value||null,skills:sp(g('sk').value)});
      if(r.error)return U.toast(r.error,'error');
      m.close();U.toast('Étudiant ajouté.','success');refresh()}}
  $('add').onclick=addForm;
  function fiche(s){const ms=Store.get('matches').filter(m=>m.studentId===s.ID),cn=id=>(Store.get('companies').find(c=>c.id===id)||{}).name||id;
    const m=U.modal(`<h3>${U.esc(s.Name)}</h3><div class="kv"><b>Email</b><span>${U.esc(s.Email)}</span><b>Téléphone</b><span>${U.esc(s.Phone||'—')}</span><b>Profil d'origine</b><span>${U.esc(s.Profil||'—')}</span><b>Organisation d'origine</b><span>${U.esc(s.Organization||'—')}</span><b>Identifiant</b><span>${U.esc(s.ID)}</span><b>CV</b><span>${U.cvUrl(s['Resume link'])?`<a href="${U.esc(U.cvUrl(s['Resume link']))}" target="_blank" rel="noopener noreferrer">Ouvrir le CV</a>`:'<span class="muted">—</span>'}</span>
    <b>Domaine normalisé</b><span><select id="dm"><option value="">Non déterminé</option>${TM_CONFIG.DOMAINS.map(d=>`<option ${s.domain===d?'selected':''}>${U.esc(d)}</option>`).join('')}</select> <button class="btn" id="sv">Enregistrer</button></span>
    <b>Compétences</b><span>${(s.skills||[]).length?U.esc(s.skills.join(', ')):'<span class="muted">Non disponibles (enrichissement à partir des CV via un futur workflow n8n)</span>'}</span><b>Technologies</b><span>${(s.tools||[]).length?U.esc(s.tools.join(', ')):'<span class="muted">Non disponibles</span>'}</span><b>Niveau d'études</b><span>${U.esc(s.level||'Non renseigné')}</span></div>
    <h3 style="margin-top:16px">Résultats de matching</h3>${ms.length?ms.sort((a,b)=>b.score-a.score).map(x=>`<div>${U.esc(cn(x.companyId))} : <b>${x.score}</b>/100</div>`).join(''):'<p class="muted">Aucun.</p>'}
    <h3 style="margin-top:16px">Historique</h3><p class="muted small">Importé le ${U.fmtDate(s.importedAt)}. Valeurs d'origine conservées.</p>`);
    m.el.querySelector('#sv').onclick=()=>{const a=Store.get('students'),i=a.findIndex(x=>x.ID===s.ID);a[i].domain=m.el.querySelector('#dm').value||null;Store.set('students',a);U.toast('Domaine enregistré.','success');m.close();refresh()}}
  refresh();
})();

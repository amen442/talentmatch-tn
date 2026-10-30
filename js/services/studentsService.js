// Import / validation / déduplication des étudiants. Colonnes d'origine conservées telles quelles.
const Students={
  COLS:['Time','Name','Email','Phone','Profil','Organization','ID','Resume link'],
  // input : texte CSV ou tableau d'objets (ex. renvoyé par n8n depuis Google Drive)
  analyse(input){
    let rows;if(typeof input==='string')rows=U.parseCSV(input);else rows=[this.COLS,...input.map(o=>this.COLS.map(c=>o[c]??''))];
    if(rows.length<2)return{error:'Fichier vide ou sans données.'};
    const head=rows[0].map(h=>h.trim()),miss=this.COLS.filter(c=>!head.includes(c));
    if(miss.length)return{error:'Colonnes manquantes : '+miss.join(', ')};
    const ex=Store.get('students').filter(s=>!s.isDemo),ids=new Set(ex.map(s=>s.ID)),em=new Set(ex.map(s=>(s.Email||'').toLowerCase()));
    return{items:rows.slice(1).map((r,n)=>{const o={};head.forEach((h,i)=>o[h]=String(r[i]??'').trim());const errs=[];
      if(!o.Name)errs.push('Nom manquant');if(!o.ID)errs.push('ID manquant');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.Email))errs.push('Email invalide');
      if(o['Resume link']&&!U.cvUrl(o['Resume link']))errs.push('Lien CV non valide');
      let st='valid';if(errs.length)st='rejected';else{const e=o.Email.toLowerCase();if(ids.has(o.ID)||em.has(e))st='duplicate';else{ids.add(o.ID);em.add(e)}}
      return{row:o,line:n+2,status:st,errors:errs}})}},
  commit(items){const ok=items.filter(x=>x.status==='valid').map(x=>({...x.row,importedAt:new Date().toISOString()}));
    Store.clearDemo();Store.set('students',[...ok,...Store.get('students')]);
    return{imported:ok.length,duplicates:items.filter(x=>x.status==='duplicate').length,rejected:items.filter(x=>x.status==='rejected').length,rows:ok}},
  // Ajout manuel (formulaire page Étudiants) : mêmes règles de validation/dédoublonnage que l'import CSV.
  add(o){
    const ex=Store.get('students').filter(s=>!s.isDemo),name=(o.Name||'').trim(),email=(o.Email||'').trim();
    if(!name)return{error:'Nom obligatoire.'};
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return{error:'Email invalide.'};
    if(o['Resume link']&&!U.cvUrl(o['Resume link']))return{error:'Lien CV non valide.'};
    const id=(o.ID||'').trim()||'S-'+Date.now();
    if(ex.some(s=>s.ID===id))return{error:'Identifiant déjà utilisé.'};
    if(ex.some(s=>(s.Email||'').toLowerCase()===email.toLowerCase()))return{error:'Email déjà utilisé.'};
    const student={Time:new Date().toISOString(),Name:name,Email:email,Phone:(o.Phone||'').trim(),Profil:(o.Profil||'').trim(),Organization:(o.Organization||'').trim(),ID:id,'Resume link':o['Resume link']||'',importedAt:new Date().toISOString(),domain:o.domain||null,skills:o.skills||[]};
    Store.clearDemo();
    // Un CV importé en fichier (data: URL) peut être volumineux : le stockage local (localStorage) a un quota
    // limité (~5-10 Mo au total), donc l'écriture peut échouer si plusieurs CV sont importés ainsi.
    try{Store.set('students',[student,...Store.get('students')])}
    catch(e){return{error:'Stockage local plein : le fichier CV est trop volumineux. Utilisez plutôt un lien (Google Drive…).'}}
    return{ok:true,student}}
};

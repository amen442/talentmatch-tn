// CRUD entreprises, dédupliquées par site officiel (ou nom à défaut).
const Companies={
  key(c){try{return new URL(c.website).hostname.replace(/^www\./,'')}catch(e){return null}},
  idFor(c){return 'C-'+(this.key(c)||c.name.toLowerCase().replace(/\W+/g,'-'))},
  save(c,editId){const a=Store.get('companies'),k=this.key(c);
    const dup=a.find(x=>x.id!==editId&&(k?this.key(x)===k:(x.name||'').toLowerCase()===c.name.toLowerCase()));
    if(dup)return{error:'Doublon : « '+dup.name+' » existe déjà.',dup};
    const id=editId||this.idFor(c);
    if(editId){const i=a.findIndex(x=>x.id===editId);a[i]={...a[i],...c}}else a.unshift({...c,id});
    Store.set('companies',a);return{ok:true,id}},
  remove(id){Store.set('companies',Store.get('companies').filter(x=>x.id!==id))},
  // Ajoute les entreprises d'une recherche à celles déjà enregistrées : aucune recherche précédente n'est effacée.
  // Une entreprise déjà connue (même site, ou même nom à défaut) est mise à jour avec les données les plus récentes,
  // sauf si elle a été vérifiée manuellement (une vérification humaine n'est jamais écrasée par une recherche).
  saveWeb(list){const all=Store.get('companies').filter(c=>!c.isDemo),keyOf=c=>this.key(c)||(c.name||'').toLowerCase(),byKey=new Map(all.map(c=>[keyOf(c),c]));
    const added=[];
    list.forEach(c=>{const k=keyOf(c),existing=byKey.get(k);
      if(!existing){const entry={...c,id:this.idFor(c)};byKey.set(k,entry);added.push(entry)}
      else if(existing.origin==='web'&&!existing.verified)Object.assign(existing,c,{id:existing.id})});
    Store.set('companies',[...added,...all])},
  // Une entreprise issue du web n'est JAMAIS marquée « vérifiée » : seule une vérification manuelle le fait.
  fromWeb(w,domain){return{name:w.name,description:w.description||'',domain:w.domain||domain,country:w.country||'',subdomain:w.subdomain||'',city:w.city||'',website:w.website||'',linkedinUrl:w.linkedinUrl||'',linkedinStatus:w.linkedinStatus||'Not found',logoUrl:w.logoUrl||w.logo_url||w.logoURL||w.logo||w.imageUrl||w.image||'',careersUrl:w.careersUrl||w.careerUrl||w.jobsUrl||w.jobUrl||'',opportunities:w.opportunities||[],skills:w.skills||w.specialties||w.expertise||[],sourceUrl:w.sourceUrl||w.sourceURL||'',sourceDomain:w.sourceDomain||'',verified:false,origin:'web',lastChecked:w.lastChecked||null,relevanceScore:w.relevanceScore??null}}
};

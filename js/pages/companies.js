(function(){const $=id=>document.getElementById(id);
  const dopt=sel=>'<option value="">—</option>'+TM_CONFIG.DOMAINS.map(d=>`<option ${d===sel?'selected':''}>${U.esc(d)}</option>`).join('');
  $('fDomain').innerHTML='<option value="">Tous</option>'+TM_CONFIG.DOMAINS.map(d=>`<option>${U.esc(d)}</option>`).join('');
  const values=value=>Array.isArray(value)?value.map(U.opp).filter(Boolean):value?[String(value)]:[];
  const text=value=>value?U.esc(value):'<span class="muted">Non renseigné</span>';
  const hostOf=u=>{const s=U.safeUrl(u);try{return s?new URL(s).hostname.replace(/^www\./,''):''}catch(e){return''}};
  const initials=n=>String(n||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>Array.from(p)[0].toLocaleUpperCase('fr')).join('')||'?';
  const logoOf=c=>{const l=U.safeUrl(c.logoUrl),h=hostOf(c.website);return l&&!/linkedin\.com|sortlist\.com|clutch\.co/i.test(l)?l:h?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=128`:''};
  const liOf=c=>{const u=U.safeUrl(c.linkedinUrl);return u&&/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/company\/[^/?#]+/i.test(u)?u:''};
  const liLabel={Found:'LinkedIn trouvé','Needs verification':'LinkedIn à vérifier','Not found':'LinkedIn introuvable'};
  // Même fiche que dans « Recherche d'entreprises » : toutes les entreprises de toutes les recherches s'accumulent ici.
  function card(c){const name=c.name||'Entreprise sans nom',skills=values(c.skills),site=U.safeUrl(c.website),li=liOf(c),jobs=U.safeUrl(c.careersUrl),src=U.safeUrl(c.sourceUrl),logo=logoOf(c),
      st=li?(c.linkedinStatus==='Found'?'Found':'Needs verification'):(c.linkedinStatus==='Needs verification'?'Needs verification':'Not found'),
      score=Number.isFinite(Number(c.relevanceScore))&&c.relevanceScore!==null?Math.round(Math.max(0,Math.min(100,c.relevanceScore<=1?c.relevanceScore*100:c.relevanceScore))):null,
      place=[c.city,/^tunisia$/i.test(c.country||'')?'Tunisie':c.country].filter(Boolean).join(', ');
    return `<article class="search-company-card">
      <header class="search-company-head">
        <div class="company-logo" aria-label="Logo ${U.esc(name)}"><span class="company-logo-fallback" aria-hidden="true">${U.esc(initials(name))}</span>${logo?`<img src="${U.esc(logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</div>
        <div class="company-heading"><h3>${U.esc(name)}</h3>${c.domain?`<span class="company-domain-badge">${U.esc(c.domain)}</span>`:''}${place?`<p class="company-location">${U.esc(place)}</p>`:''}</div>
        ${score!==null?`<span class="relevance-indicator" title="Pertinence de recherche, pas une évaluation de l'entreprise"><span aria-hidden="true">●</span> Pertinence ${score}%</span>`:''}
      </header>
      <div class="search-company-body">
        ${c.description?`<p class="company-description is-collapsed">${U.esc(c.description)}</p>`:'<p class="company-description-empty">Aucune description fournie par la recherche.</p>'}
        ${skills.length?`<div class="company-specialties" aria-label="Spécialités">${skills.map(t=>`<span class="specialty-badge">${U.esc(t)}</span>`).join('')}</div>`:''}
        <div class="company-links">
          ${site?`<span class="company-link-row"><b>Site</b><a href="${U.esc(site)}" target="_blank" rel="noopener noreferrer">${U.esc(hostOf(site)||site)}</a></span>`:''}
          <span class="company-link-row"><b>LinkedIn</b>${li?`<a href="${U.esc(li)}" target="_blank" rel="noopener noreferrer">Page entreprise</a>`:'<span class="muted">Aucune page fiable</span>'}<span class="linkedin-status is-${st==='Found'?'found':st==='Not found'?'missing':'check'}">${U.esc(liLabel[st])}</span></span>
        </div>
        ${c.verified?'':'<p class="verification-note">Entreprise issue de la recherche web : vérifiez le site officiel avant validation.</p>'}
      </div>
      <footer class="search-company-actions">
        ${site?`<a class="btn primary" href="${U.esc(site)}" target="_blank" rel="noopener noreferrer">Visiter le site</a>`:''}
        ${li?`<a class="btn" href="${U.esc(li)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`:''}
        ${jobs?`<a class="btn" href="${U.esc(jobs)}" target="_blank" rel="noopener noreferrer">Offres d’emploi</a>`:''}
        <button class="btn" data-act="e" data-id="${U.esc(c.id)}">Modifier</button><button class="btn" data-act="d" data-id="${U.esc(c.id)}">Supprimer</button>
        ${src?`<a class="source-link" href="${U.esc(src)}" target="_blank" rel="noopener noreferrer">Voir la source</a>`:''}
      </footer>
    </article>`}
  $('companyCards').onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;const c=Store.get('companies').find(x=>x.id===b.dataset.id);if(!c)return;
    if(b.dataset.act==='e')form(c);else if(confirm('Supprimer « '+c.name+' » ?')){Companies.remove(c.id);U.toast('Entreprise supprimée.','success');refresh()}};
  function refresh(){const all=Store.get('companies'),q=$('q').value.toLowerCase(),d=$('fDomain').value,o=$('fOrigin').value,v=$('fVer').value;
    const r=all.filter(c=>(!q||[c.name,c.domain,c.subdomain,c.city,c.website,c.description].join(' ').toLowerCase().includes(q))&&(!d||c.domain===d)&&(!o||(c.origin==='web'?'web':'manual')===o)&&(!v||(c.verified?'1':'0')===v));
    $('count').textContent=r.length+' / '+all.length+' entreprise(s)';$('companyCards').innerHTML=r.length?r.map(card).join(''):'<div class="card company-card-empty muted">Aucune entreprise ne correspond aux filtres.</div>'}
  ['q','fDomain','fOrigin','fVer'].forEach(i=>$(i).oninput=refresh);
  function form(c){c=c||{};const m=U.modal(`<h3>${c.id?'Modifier':'Ajouter'} une entreprise</h3><div class="form">
    <label>Nom *<input id="n" value="${U.esc(c.name)}"></label><label>Domaine *<select id="d">${dopt(c.domain)}</select></label><label>Sous-domaine<input id="s" value="${U.esc(c.subdomain)}"></label><label>Ville<input id="v" value="${U.esc(c.city)}"></label>
    <label>Site officiel<input id="w" value="${U.esc(c.website)}" placeholder="https://"></label><label>Page carrière<input id="cu" value="${U.esc(c.careersUrl)}"></label><label>Source de découverte<input id="su" value="${U.esc(c.sourceUrl)}"></label>
    <label>Opportunités (séparées par ,)<input id="o" value="${U.esc(values(c.opportunities).join(', '))}"></label><label>Compétences recherchées (,)<input id="k" value="${U.esc(values(c.skills).join(', '))}"></label>
    <label class="full">Description<textarea id="ds">${U.esc(c.description)}</textarea></label><label><span><input type="checkbox" id="ve" ${c.verified?'checked':''}> Vérifiée manuellement</span></label></div><div class="actions" style="margin-top:12px"><button class="btn primary" id="ok">Enregistrer</button></div>`);
    const g=i=>m.el.querySelector('#'+i);
    g('ok').onclick=()=>{const web=g('w').value.trim(),car=g('cu').value.trim(),src=g('su').value.trim();
      if(!g('n').value.trim()||!g('d').value)return U.toast('Nom et domaine obligatoires.','error');
      if((web&&!U.safeUrl(web))||(car&&!U.safeUrl(car))||(src&&!U.safeUrl(src)))return U.toast('URL invalide (http/https requis).','error');
      const sp=v=>v.split(',').map(x=>x.trim()).filter(Boolean),was=c.verified;
      const r=Companies.save({name:g('n').value.trim(),domain:g('d').value,subdomain:g('s').value.trim(),city:g('v').value.trim(),website:web,careersUrl:car,sourceUrl:src,opportunities:sp(g('o').value),skills:sp(g('k').value),description:g('ds').value.trim(),verified:g('ve').checked,origin:c.origin||'manual',lastChecked:g('ve').checked&&!was?new Date().toISOString():c.lastChecked||null},c.id);
      if(r.error)return U.toast(r.error,'error');m.close();U.toast('Entreprise enregistrée.','success');refresh()}}
  $('add').onclick=()=>form();refresh();
})();

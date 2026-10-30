// Comparaison locale du profil de l'étudiant avec les entreprises déjà enregistrées (page Entreprises) :
// aucun appel réseau, le résultat dépend uniquement de ce qui est dans companies.html.
const Matching={
  // Score sur 100, réparti en 3 blocs proportionnels (35 domaine + 35 compétences + 20 vocabulaire) plus de petits bonus,
  // pour que les correspondances réelles mais peu documentées (peu de compétences renseignées) ne soient pas écrasées
  // par un calcul additif sans plafond proportionnel.
  score(student,targetDomain,company){
    const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const words=v=>norm(v).split(/[^a-z0-9+]+/).filter(w=>w.length>=3);
    const studentSkills=(student.skills||[]).map(norm).filter(Boolean);
    const studentWords=new Set([...words(student.Profil),...words(student.Organization),...studentSkills.flatMap(words)]);
    const companySkills=(company.skills||[]).map(norm).filter(Boolean);
    const companyWords=new Set([...words(company.description),...words(company.name),...companySkills.flatMap(words)]);
    const reasons=[],skillGaps=[];let score=0;

    if(targetDomain&&company.domain===targetDomain){score+=35;reasons.push(`Domaine « ${company.domain} » aligné avec l'étudiant.`)}

    if(companySkills.length){
      const matched=companySkills.filter(cs=>studentSkills.some(ss=>ss===cs||ss.includes(cs)||cs.includes(ss))||[...studentWords].some(w=>cs.includes(w)||w.includes(cs)));
      matched.forEach(cs=>reasons.push(`Compétence commune : « ${cs} ».`));
      companySkills.filter(cs=>!matched.includes(cs)).forEach(cs=>skillGaps.push(cs));
      score+=35*(matched.length/companySkills.length);
    }

    const overlap=[...studentWords].filter(w=>companyWords.has(w));
    const smaller=Math.min(studentWords.size,companyWords.size)||1;
    score+=20*Math.min(1,overlap.length/smaller);

    if(company.verified)score+=5;
    const rel=Number(company.relevanceScore);
    if(Number.isFinite(rel))score+=Math.round((rel<=1?rel:rel/100)*5);

    if(!reasons.length)reasons.push(overlap.length?'Vocabulaire du profil proche de l’activité de l’entreprise.':'Correspondance indicative : aucune compétence ni mot-clé commun détecté.');
    return{score:Math.max(0,Math.min(100,Math.round(score))),reasons:reasons.slice(0,4),skillGaps:skillGaps.slice(0,5)}
  },
  run({student,domain}){
    const all=Store.get('companies').filter(c=>!c.isDemo);
    const inDomain=domain?all.filter(c=>c.domain===domain):all;
    const pool=inDomain.length?inDomain:all;
    // Repli : le domaine choisi n'a aucune entreprise enregistrée. On compare quand même (pour ne jamais renvoyer
    // zéro résultat), mais on le signale clairement : sinon le score, calculé hors domaine, semble arbitrairement bas.
    const domainFallback=!!domain&&!inDomain.length&&all.length>0;
    if(!pool.length){
      Store.add('runs',{id:'R-'+Date.now(),at:new Date().toISOString(),mode:'local_best_company',domain:domain||'',studentIds:[student.ID],companyIds:[],processed:1,resultsCount:0,rejected:0,errors:[]});
      return{ok:true,data:{success:true,studentName:student.Name||student.ID,bestMatch:null,message:'Aucune entreprise enregistrée pour le moment. Lancez une recherche dans « Recherche d’entreprises » ou ajoutez une entreprise manuellement dans « Entreprises ».'}}
    }
    const ranked=pool.map(c=>({company:c,...this.score(student,domain||student.domain||'',c)})).sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    Store.add('matches',{studentId:student.ID,companyId:best.company.id,score:best.score,at:new Date().toISOString()});
    Store.add('runs',{id:'R-'+Date.now(),at:new Date().toISOString(),mode:'local_best_company',domain:domain||best.company.domain||'',studentIds:[student.ID],companyIds:[best.company.id],processed:1,resultsCount:ranked.length,rejected:0,errors:[]});
    return{ok:true,data:{success:true,total:ranked.length,studentName:student.Name||student.ID,domainFallback,
      message:domainFallback?`Aucune entreprise enregistrée dans « ${domain} » : comparaison approximative avec les ${all.length} entreprise(s) enregistrée(s) au total. Lancez une recherche dans « Recherche d’entreprises » pour ce domaine pour un résultat pertinent.`:undefined,
      bestMatch:{name:best.company.name,score:best.score,reasons:best.reasons,skillGaps:best.skillGaps,website:best.company.website,linkedinUrl:best.company.linkedinUrl}}}
  }
};

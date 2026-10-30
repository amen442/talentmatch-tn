// Couche de données (localStorage). Remplaçable plus tard par une vraie base : seule cette couche change.
const Store={
  K:{students:'tm_students',companies:'tm_companies',matches:'tm_matches',searches:'tm_searches',mode:'tm_mode'},
  get(k){try{return JSON.parse(localStorage.getItem(this.K[k]))??[]}catch(e){return []}},
  set(k,v){localStorage.setItem(this.K[k],JSON.stringify(v))},
  add(k,item){const a=this.get(k);a.unshift(item);this.set(k,a)},
  mode(){return localStorage.getItem(this.K.mode)||'demo'},
  setMode(m){localStorage.setItem(this.K.mode,m)},
  // Données FICTIVES, marquées isDemo, supprimables en un clic.
  loadDemo(){
    this.set('students',[
      {ID:'DEMO-1',Name:'Étudiant Fictif A',Email:'a@exemple.invalid',Phone:'',Profil:'Informatique',Organization:'Établissement fictif','Resume link':'',isDemo:true},
      {ID:'DEMO-2',Name:'Étudiante Fictive B',Email:'b@exemple.invalid',Phone:'',Profil:'Data',Organization:'Établissement fictif','Resume link':'',isDemo:true}]);
    this.set('companies',[{id:'DEMO-C1',name:'Entreprise Fictive SA',domain:TM_CONFIG.DOMAINS[0],city:'Tunis',website:'',verified:false,origin:'demo',isDemo:true}]);
  },
  clearDemo(){['students','companies','matches','searches'].forEach(k=>this.set(k,this.get(k).filter(x=>!x.isDemo)))},
  stats(){const s=this.get('students'),c=this.get('companies'),m=this.get('matches');
    const matched=new Set(m.map(x=>x.studentId));
    return{students:s.length,companies:c.length,domains:new Set(c.map(x=>x.domain).filter(Boolean)).size,matches:m.length,unmatched:s.filter(x=>!matched.has(x.ID)).length}}
};
Store.K.runs='tm_runs';Store.K.errors='tm_errors';

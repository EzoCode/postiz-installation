'use strict';
const guide={version:'made-to-stick-unexpected/v1',sourceUrl:'https://www.notion.so/2a2db7a22bdc806580f1ca5d0eccf9fe',chapterUrl:'https://faculty.bard.edu/hhaggard/teaching/sci127Sp20/notes/HeathsMadeToStickCh2.pdf',fields:[
 {id:'core',group:'Attirer et faire comprendre',label:'Idée centrale',prompt:'Quelle idée unique le spectateur doit-il comprendre ?',case:'Enclave : la surprise sert le message de sécurité.'},
 {id:'expectation',group:'Attirer et faire comprendre',label:'Attente du public',prompt:'Quelle croyance ou habitude précise de ton public va être déjouée ?',case:'Karen Wood : une annonce de sécurité différente du discours habituel.'},
 {id:'surprise',group:'Attirer et faire comprendre',label:'Rupture pertinente',prompt:'Quel fait ou quelle scène contredit cette attente sur le fond du message ?',case:'Nordstrom : un service qui dépasse les limites habituelles du magasin.'},
 {id:'insight',group:'Attirer et faire comprendre',label:'Compréhension après la surprise',prompt:'Pourquoi la révélation devient-elle logique après coup ? Quelle règle remplace l’ancienne ?',case:'PHRAUG : une étrangeté qui se résout, contrairement aux mots sans solution.'},
 {id:'prediction',group:'Entretenir la curiosité',label:'Prédiction ou désaccord',prompt:'Quelle réponse faire anticiper ? Quel désaccord réel rend visible un manque de savoir ? Ou pourquoi ce levier ne convient-il pas ici ?',case:'Nora Ephron : faire proposer une accroche avant de révéler le sens des faits.'},
 {id:'gap',group:'Entretenir la curiosité',label:'Question que le public veut résoudre',prompt:'Formule une question précise avant d’en donner la réponse.',case:'Les anneaux de Saturne : le mystère donne envie de suivre l’explication.'},
 {id:'context',group:'Entretenir la curiosité',label:'Contexte accessible',prompt:'Que sait déjà ce public ? Que faut-il montrer pour que la question soit compréhensible et lui importe ?',case:'Roone Arledge : lieux, équipes et rivalités donnent une raison de suivre le match.'},
 {id:'progression',group:'Entretenir la curiosité',label:'Progression des indices',prompt:'Dans quel ordre révèles-tu les indices et relances-tu les questions ? Chaque étape doit faire avancer.',case:'Le mystère de Saturne se résout progressivement.'},
 {id:'payoff',group:'Entretenir la curiosité',label:'Réponse et preuve promises',prompt:'Quelle réponse concrète est donnée, avec quelle preuve et à quel moment ?',case:'Un écart de curiosité appelle une résolution satisfaisante.'},
 {id:'horizon',group:'Prolonger et éprouver',label:'Défi durable, si pertinent',prompt:'Pour une série ou un projet, quel objectif visible donne envie de suivre la suite sans paraître inaccessible ? Sinon, indique non applicable.',case:'Sony et la Lune : une ambition concrète qui appelle des étapes de résolution.'},
 {id:'fit',group:'Prolonger et éprouver',label:'Pertinence de la transposition',prompt:'Pourquoi ce mécanisme sert-il ton message et surprendra-t-il encore ton public ? Quel effet gratuit ou trop familier retires-tu ?',case:'La publicité des loups : être mémorable ne garantit pas de transmettre le message.'},
 {id:'evidence',group:'Prolonger et éprouver',label:'Observations et vérification',prompt:'Note les passages réellement observés dans la référence, les hypothèses pour ton public et comment les vérifier séparément.',case:'Application produit : un score outlier ne valide ni la surprise ni la curiosité.'}
]};
function buildUnexpected(value){
 if(value!==undefined&&(!value||typeof value!=='object'||Array.isArray(value)))throw Object.assign(Error('Grille Unexpected invalide'),{status:400});
 const answers={};for(const f of guide.fields){const v=value?.[f.id];if(v!==undefined&&(typeof v!=='string'||v.length>700))throw Object.assign(Error('Unexpected : 700 caractères maximum par point'),{status:400});answers[f.id]=String(v||'').trim();}
 const filled=Object.values(answers).filter(Boolean).length;
 const brief=['UNEXPECTED · priorité éditoriale de ce test','Source : '+guide.sourceUrl,'Attirer, puis entretenir la curiosité. Une grille renseignée reste à éprouver ; aucun score automatique de qualité.',...guide.fields.map(f=>f.label+' : '+(answers[f.id]||'À préciser. '+f.prompt))].join('\n');
 return {version:guide.version,answers,filled,total:guide.fields.length,status:filled===guide.fields.length?'documented':'draft',brief};
}
module.exports={guide,buildUnexpected};

#!/usr/bin/env node
/** business-models.json の形の点検（画面が前提にする型と合うか）。ビルドの前に走る。崩れていれば終了コード1 */
import fs from 'node:fs';
const M = JSON.parse(fs.readFileSync(new URL('../data/business-models.json', import.meta.url), 'utf8'));
const t = {};
const arr=(x)=>Array.isArray(x);const str=(x)=>typeof x=="string";const sarr=(x)=>arr(x)&&x.every(str);
const chk=(id,k,ok,v)=>{if(!ok)(t[k]??=[]).push(id+":"+JSON.stringify(v).slice(0,140))};
for(const [id,m] of Object.entries(M)){
 chk(id,"entity",m.entity===undefined||str(m.entity),m.entity);
 chk(id,"aiUse",!m.aiUse||str(m.aiUse.value),m.aiUse);
 chk(id,"stage",str(m.stage?.value),m.stage);
 chk(id,"activity",str(m.activity?.value),m.activity);
 chk(id,"signals",!m.activity?.signals||sarr(m.activity.signals),m.activity?.signals);
 chk(id,"guess",!m.activity?.guess||str(m.activity.guess),m.activity?.guess);
 chk(id,"revenue.values",sarr(m.revenue?.values),m.revenue?.values);
 chk(id,"revenue.unknown",!m.revenue?.unknown||str(m.revenue.unknown),m.revenue?.unknown);
 chk(id,"revenue.past",!m.revenue?.past||str(m.revenue.past),m.revenue?.past);
 chk(id,"productSales",!m.revenue?.productSales||str(m.revenue.productSales),m.revenue?.productSales);
 chk(id,"recordKind",!m.recordKind||["product","group","contract"].includes(m.recordKind),m.recordKind);
 chk(id,"members",!m.members||arr(m.members)&&m.members.every(x=>str(x.name)),m.members);
 for(const x of (arr(m.members)?m.members:[]))for(const k of ["status","stage","regulatory","startedAt"])chk(id,"member."+k,x[k]===undefined||str(x[k]),x[k]);
 for(const r of ["developer","mah","seller","operator","operatorUser","outputUser","subject","supplier","recommender","contractor","directPayer","finalBearer","userPaysTo"])chk(id,"roles."+r,!m.roles?.[r]||sarr(m.roles[r]),m.roles?.[r]);
 for(const k of ["offering","regulatory","reimbursement"])chk(id,k,!m[k]||sarr(m[k].values),m[k]?.values);
 chk(id,"channel",sarr(m.channel?.first)&&sarr(m.channel?.deal??[])&&sarr(m.channel?.delivery??[]),m.channel);
 for(const a of m.adoption||[])chk(id,"adoption",str(a.metric)&&str(a.value)&&(!a.definition||str(a.definition))&&(!a.asOf||str(a.asOf)),a);
 chk(id,"lastModel",!m.lastModel||str(m.lastModel.note),m.lastModel);
 chk(id,"plan",!m.plan||str(m.plan),m.plan);
 chk(id,"customerRecovery",!m.revenue?.customerRecovery||sarr(m.revenue.customerRecovery),m.revenue?.customerRecovery);
 chk(id,"problem",!m.problem||(!m.problem.domain||str(m.problem.domain)),m.problem?.domain);
 const walk=(o,p)=>{if(Array.isArray(o))o.forEach((x,i)=>walk(x,p));else if(o&&typeof o=="object"){for(const [k,v] of Object.entries(o)){if(k==="sources"){chk(id,"sources",arr(v)&&v.every(x=>x&&str(x.url)),p+"."+k);}else if(k==="source"&&v!=null){chk(id,"source",str(v.url),p+"."+k);}walk(v,p+"."+k)}}};
 walk(m,"");
 chk(id,"periods",!m.periods||arr(m.periods),m.periods);
 // 時期ごとの姿の各行は、画面が読むキー名（t・what・user・pay・bear・channel・operator）で書く
 for(const p of (arr(m.periods)?m.periods:[]))chk(id,"periods.row",p&&str(p.t)&&Object.keys(p).every(k=>["t","what","user","pay","bear","channel","operator"].includes(k)),p);
 // 画面に出る文に、作業用の内部の言葉（英語のキー名・DB の内部 ID・定義の版番号）を残さない
 const words=(o,p)=>{if(str(o)){if(!/^https?:/.test(o)&&/\b(signals|members|offering|lastModel|periods|productSales|recordKind|existingId)\b|DB の [a-z][a-z0-9-]*|第\d+\.\d+版/.test(o))chk(id,"internal-words",false,p+": "+o.slice(0,80));}else if(arr(o))o.forEach((x,i)=>words(x,p+"."+i));else if(o&&typeof o=="object")for(const [k,v] of Object.entries(o)){if(!["url","hp","existingId","existingIds","productSalesDetail"].includes(k))words(v,p+"."+k)}};
 words(m,id);
}
for(const [k,v] of Object.entries(t))console.log(k,v.length,"\n  "+v.slice(0,5).join("\n  "));
if (Object.keys(t).length) { console.error("business-models.json の形が崩れています"); process.exit(1); } else console.log("business-models.json：形の点検 OK（" + Object.keys(M).length + "件）");

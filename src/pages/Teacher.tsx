import {useEffect,useState} from 'react';import {supabase} from '../lib/supabase';
export default function Teacher(){const[as,setAs]=useState<any[]>([]);const[sel,setSel]=useState<any>(null);const[term,setTerm]=useState<any>(null);const[rows,setRows]=useState<any[]>([]);const[q,setQ]=useState('');const[msg,setMsg]=useState('');
useEffect(()=>{supabase.from('terms').select('*').eq('is_current',true).single().then(r=>setTerm(r.data));
supabase.from('teacher_assignments').select('class_id,subject_id,classes(name),subjects(name)').then(r=>setAs(r.data||[]))},[]);
async function open(x:any){setSel(x);const{data:st}=await supabase.from('students').select('id,full_name,admission_no').eq('class_id',x.class_id).order('full_name');
const{data:sc}=await supabase.from('scores').select('*').eq('subject_id',x.subject_id).eq('term_id',term.id);
const{data:cm}=await supabase.from('comments').select('*').eq('term_id',term.id);
setRows((st||[]).map(s=>{const o=sc?.find(c=>c.student_id===s.id);return{...s,ca1:o?.ca1??0,ca2:o?.ca2??0,exam:o?.exam??0,cm:cm?.find(c=>c.student_id===s.id)?.text??''}}))}
const set=(i:number,k:string,max:number,v:string)=>setRows(r=>r.map((x,j)=>j===i?{...x,[k]:Math.min(max,Math.max(0,+v||0))}:x));
async function save(){const{error}=await supabase.from('scores').upsert(rows.map(r=>({student_id:r.id,subject_id:sel.subject_id,term_id:term.id,ca1:r.ca1,ca2:r.ca2,exam:r.exam})),{onConflict:'student_id,subject_id,term_id'});
const cs=rows.filter(r=>r.cm&&r.cm.trim());let e2=null;if(cs.length)e2=(await supabase.from('comments').upsert(cs.map(r=>({student_id:r.id,term_id:term.id,text:r.cm.trim()})),{onConflict:'student_id,term_id'})).error;
setMsg(error||e2?'Cannot save. Results may be locked by Admin.':'✅ Saved Successfully')}
setMsg(error?'Cannot save. Results may be locked by Admin.':'✅ Saved Successfully')}
return<div className="p-4 max-w-4xl mx-auto"><h1 className="text-3xl font-bold text-navy mb-3">My Classes {term&&`— ${term.name}`}</h1>
<div className="flex flex-wrap gap-2 mb-4">{as.map((x,i)=><button key={i} className="btn" onClick={()=>open(x)}>{x.classes.name} — {x.subjects.name}</button>)}</div>
{sel&&<><input className="inp mb-3" placeholder="🔍 Search student name..." value={q} onChange={e=>setQ(e.target.value)}/>
<table className="w-full"><thead className="bg-navy text-white"><tr><th className="text-left p-2">Student</th><th>CA1 /20</th><th>CA2 /20</th><th>Exam /60</th><th>Total</th><th>Comment (optional)</th></tr></thead><tbody>
{rows.map((r,i)=>r.full_name.toLowerCase().includes(q.toLowerCase())&&<tr key={r.id} className="border-t"><td className="p-2">{r.full_name}</td>
{(['ca1','ca2','exam'] as const).map(k=><td key={k}><input type="number" className="inp !w-20 text-center" value={r[k]} onChange={e=>set(i,k,k==='exam'?60:20,e.target.value)}/></td>)}<td className="text-center font-bold">{r.ca1+r.ca2+r.exam}</td></tr>)}</tbody></table>
<button className="btn mt-4 w-full" onClick={save}>💾 Save All Scores</button>{msg&&<p className="text-xl mt-3 font-bold">{msg}</p>}</>}</div>
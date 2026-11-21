import {useEffect,useState} from 'react';import {supabase} from '../lib/supabase';
export default function Admin(){const[term,setTerm]=useState<any>(null);const[classes,setClasses]=useState<any[]>([]);const[msg,setMsg]=useState('');const[pins,setPins]=useState<any[]>([]);const[f,setF]=useState({full_name:'',admission_no:'',gender:'Male',class_id:'',parent_phone:''});
const load=async()=>{const t=(await supabase.from('terms').select('*').eq('is_current',true).single()).data;setTerm(t);setClasses((await supabase.from('classes').select('*').order('sort')).data||[]);
if(t)setPins((await supabase.from('pins').select('code,used,students(full_name,admission_no)').eq('term_id',t.id)).data||[])};
useEffect(()=>{load()},[]);const ok=(e:any,m:string)=>{setMsg(e?'Error: '+e.message:'✅ '+m);load()};
const rpc=async(n:string,m:string)=>ok((await supabase.rpc(n,{term:term.id})).error,m);
const upd=async(p:any,m:string)=>ok((await supabase.from('terms').update(p).eq('id',term.id)).error,m);
return<div className="p-4 max-w-4xl mx-auto"><h1 className="text-3xl font-bold text-navy mb-3">Admin Dashboard {term&&`— ${term.name}`}</h1>
{msg&&<p className="text-xl font-bold mb-3">{msg}</p>}
<Link className="btn text-center" to="/manage">⚙️ Manage Setup, Gallery, News, Tracker & Broadsheet</Link>
<div className="grid sm:grid-cols-2 gap-3 mb-6"><button className="btn" onClick={()=>rpc('compute_results','Results calculated')}>🧮 Calculate Results</button>
<button className="btn" onClick={()=>rpc('generate_pins','PINs generated')}>🔑 Generate PINs</button>
<button className="btn" onClick={()=>upd({published:!term.published},term.published?'Unpublished':'Published')}>{term?.published?'📢 Unpublish':'📢 Publish Results'}</button>
<button className="btn" onClick={()=>upd({locked:!term.locked},term.locked?'Unlocked':'Locked')}>{term?.locked?'🔓 Unlock Scores':'🔒 Lock Scores'}</button>
<button className="btn" onClick={()=>confirm('Promote all passed students to next class?')&&rpc('promote_students','Students promoted')}>⬆️ Promote Students</button></div>
<input type="file" accept="image/*" id="ph" className="inp"/>
<button className="btn" onClick={async()=>{const fl=(document.getElementById('ph') as HTMLInputElement).files?.[0];let photo_url=null;
if(fl){const p=Date.now()+'-'+fl.name.replace(/\s/g,'_');const u=await supabase.storage.from('photos').upload(p,fl);if(u.error)return ok(u.error,'');photo_url=supabase.storage.from('photos').getPublicUrl(p).data.publicUrl}
ok((await supabase.from('students').insert({...f,photo_url})).error,'Student added')}}>➕ Add Student</button>
<input className="inp" placeholder="Full name" value={f.full_name} onChange={e=>setF({...f,full_name:e.target.value})}/><input className="inp" placeholder="Admission number" value={f.admission_no} onChange={e=>setF({...f,admission_no:e.target.value})}/>
<input className="inp" placeholder="Parent phone" value={f.parent_phone} onChange={e=>setF({...f,parent_phone:e.target.value})}/>
<select className="inp" value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Male</option><option>Female</option></select>
<select className="inp" value={f.class_id} onChange={e=>setF({...f,class_id:e.target.value})}><option value="">Select class (JSS1–SS3)</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
<button className="btn" onClick={async()=>ok((await supabase.from('students').insert(f)).error,'Student added')}>➕ Add Student</button></div>
<h2 className="text-2xl font-bold mb-2">PINs ({pins.filter(p=>p.used).length} used / {pins.length})</h2>
{pins.map((p,i)=><div key={i} className="flex justify-between border-b py-1"><span>{p.students.full_name} ({p.students.admission_no})</span><b>{p.code}</b><span>{p.used?'Used':'Unused'}</span></div>)}</div>}
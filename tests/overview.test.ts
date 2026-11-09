import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SessionOverview} from '../src/components/SessionOverview';
import {ClassForm} from '../src/components/ClassForm';
import {canWrite,classGrade,sessionRoster,validateClass,type Session,type Student,type Attendance,type ClassGroup} from '../src/model';
const group:ClassGroup={id:'maths',name:'Evening mathematics',grade:'8',fee:1250.50,subject:'Maths',room:'Room A',color:'teal'};
const session:Session={id:'weekly@2026-11-09',scheduleId:'weekly',classId:'maths',date:'2026-11-09',start:'14:00',end:'16:00',cancelled:false,extra:false};
const students:Student[]=['One','Two','Transferred'].map((name,i)=>({id:'S-'+i,name,phone:'',parentPhone:'',whatsapp:'',address:'',grade:'8',classId:i===2?'other':'maths',roll:String(i),color:'teal'}));
const mark=(id:string,sessionId=session.id):Attendance=>({id:id+'@'+sessionId,studentId:id,sessionId,date:session.date,classId:session.classId,at:'2026-11-09T09:00:00Z'});

test('overview isolates the selected session and retains students already marked after a class transfer',()=>{
 const attendance=[mark('S-0'),mark('S-0'),mark('S-1','another-session'),mark('S-2')];
 const result=sessionRoster(session,students,attendance);
 assert.equal(result.total,3);assert.equal(result.present,2);assert.equal(result.notMarked,1);
 const html=renderToStaticMarkup(createElement(SessionOverview,{session,group,students,attendance,role:'staff',onStart:()=>{}}));
 for(const label of ['Evening mathematics','Room A','Grade 8','Attendance list','Not marked','Transferred','Start scanning'])assert.ok(html.includes(label));
});
test('overview scanning is an explicit action and unavailable for viewers or cancelled sessions',()=>{
 let starts=0;const props={session,group,students,attendance:[],role:'staff' as const,onStart:()=>{starts++;}};
 const tree=SessionOverview(props);assert.equal(starts,0);
 const button=(tree.props as any).children.at(-1);button.props.onClick();assert.equal(starts,1);
 assert.equal(renderToStaticMarkup(createElement(SessionOverview,{...props,role:'viewer'})).includes('Start scanning'),false);
 assert.match(renderToStaticMarkup(createElement(SessionOverview,{...props,session:{...session,cancelled:true}})),/disabled=""/);
 assert.equal(sessionRoster(session,[],[]).total,0);
});
test('class validation handles names, grades, finite fees, and currency precision',()=>{
 assert.equal(validateClass(group),null);assert.equal(validateClass({...group,fee:0.01}),null);
 for(const bad of [{grade:'0'},{grade:'14'},{grade:''},{name:'   '},{name:'x'.repeat(101)},{fee:Infinity},{fee:NaN},{fee:-5},{fee:0},{fee:1.001},{fee:1000001}])assert.ok(validateClass({...group,...bad}));
 assert.equal(classGrade({...group,grade:undefined,name:'Grade 9'}),'9');
 assert.equal(classGrade(group),'8');
});
test('class form supports old records and presents required fields with fee constraints',()=>{
 const html=renderToStaticMarkup(createElement(ClassForm,{existing:{...group,grade:undefined,name:'Grade 9'},onSave:async()=>{}}));
 assert.match(html,/Grade/);assert.match(html,/Class name/);assert.match(html,/Monthly fee/);assert.match(html,/min="0.01"/);assert.match(html,/max="1000000"/);assert.match(html,/step="0.01"/);assert.match(html,/value="9" selected=""/);
});
test('staff permissions include setup operations but existing pupil edits stay admin-only',()=>{
 for(const entity of ['classes','schedules','overrides','tutes'] as const){assert.equal(canWrite('staff',entity,true),true);assert.equal(canWrite('viewer',entity),false);}
 assert.equal(canWrite('staff','students'),true);assert.equal(canWrite('staff','students',true),false);assert.equal(canWrite('admin','students',true),true);
});

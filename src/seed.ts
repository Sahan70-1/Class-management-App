import { todayISO,monthOf,weekday,type StoredRecord,type Student } from './model';
export function seedRecords():StoredRecord[]{
 const today=todayISO(),month=monthOf(today),from='2026-01-01';
 const classes=[{id:'grade-9',name:'Grade 9',subject:'Mathematics',room:'Main classroom',fee:2000,color:'teal'},{id:'grade-11',name:'Grade 11',subject:'Mathematics',room:'Main classroom',fee:2500,color:'violet'},{id:'grade-10',name:'Grade 10',subject:'Mathematics',room:'Main classroom',fee:2000,color:'blue'}];
 const names=['Saman Kumara','Kavindi Silva','Dasun Fernando','Nethmi Perera','Chamath Dissanayake','Tharushi Jayasinghe','Ravindu Senanayake','Dinithi Bandara','Janith Wijesinghe','Amaya Rathnayake','Pasindu Herath','Senuli De Silva'];
 const students:Student[]=names.map((name,i)=>({id:'S-'+String(i+1).padStart(5,'0'),name,phone:'',parentPhone:'',whatsapp:'',address:'',grade:i<8?'9':i<10?'11':'10',classId:i<8?'grade-9':i<10?'grade-11':'grade-10',roll:(i<8?'09':i<10?'11':'10')+'-'+String(i<8?i+1:i<10?i-7:i-9).padStart(3,'0'),color:['mint','peach','lilac','blue'][i%4]}));
 const schedules=[{id:'weekly-9',classId:'grade-9',versions:[{from,weekday:weekday(today),start:'14:00',end:'16:00'}]},{id:'weekly-11',classId:'grade-11',versions:[{from,weekday:weekday(today),start:'16:30',end:'18:30'}]},{id:'weekly-10',classId:'grade-10',versions:[{from,weekday:(weekday(today)+6)%7,start:'09:00',end:'11:00'}]}];
 const tutes=classes.map(c=>({id:c.id+'@'+month,classId:c.id,month,title:c.id==='grade-9'?'Perimeter & area':c.id==='grade-11'?'Quadratic equations':'Trigonometry'}));
 const attendance=students.slice(1,6).map(s=>({id:s.id+'@weekly-9@'+today,studentId:s.id,sessionId:'weekly-9@'+today,date:today,classId:s.classId,at:today+'T08:35:00Z'}));
 const fees=students.slice(1,7).map(s=>({id:s.id+'@'+s.classId+'@'+month,studentId:s.id,classId:s.classId,month,amount:2000,method:'Cash',at:today+'T08:40:00Z'}));
 const issues=students.slice(1,5).map(s=>({id:s.id+'@grade-9@'+month,studentId:s.id,tuteId:'grade-9@'+month,at:today+'T08:40:00Z'}));
 const collections={students,classes,schedules,tutes,attendance,fees,issues};
 return Object.entries(collections).flatMap(([entity,rows])=>rows.map(value=>({entity,key:value.id,value,revision:1}))) as StoredRecord[];
}

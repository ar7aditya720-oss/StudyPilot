const weight={High:3,Medium:2,Low:1};
function daysLeft(date){if(!date)return 999;let a=new Date();a.setHours(0,0,0,0);return Math.ceil((new Date(date+"T00:00:00")-a)/86400000);}
export function analyzeWeek(tasks,capacity){
 const pending=tasks.filter(t=>t.completedUnits<t.totalUnits).map(t=>{const fraction=(t.totalUnits-t.completedUnits)/t.totalUnits;const hours=Math.max(.25,t.estimatedHours*fraction);const days=daysLeft(t.dueDate);const urgency=t.dueDate?Math.max(0,7-Math.max(0,days)):0;return {...t,remainingHours:hours,days,score:weight[t.priority]*2+urgency+(t.recurring?2:0)+Math.min(hours,8)/4};}).sort((a,b)=>b.score-a.score);
 let remaining=Math.max(0,Number(capacity)||0),allocations=[];
 for(const t of pending){if(remaining<=0)break;const hours=Math.min(t.remainingHours,remaining);allocations.push({taskId:t.id,title:t.title,type:t.type,priority:t.priority,dueDate:t.dueDate,recurring:t.recurring,hours:Math.round(hours*4)/4,remainingHours:Math.round(t.remainingHours*4)/4});remaining=Math.round((remaining-hours)*4)/4;}
 const requested=pending.reduce((s,t)=>s+t.remainingHours,0);
 return {capacityHours:Number(capacity)||0,requestedHours:Math.round(requested*4)/4,allocatedHours:allocations.reduce((s,a)=>s+a.hours,0),overloadHours:Math.max(0,Math.round((requested-capacity)*4)/4),allocations,warnings:[...(requested>capacity?[`Your estimated workload exceeds your available time by ${Math.round((requested-capacity)*4)/4} hours.`]:[]),...pending.filter(t=>t.days<0).map(t=>`${t.title} is past its deadline.`)]};
}

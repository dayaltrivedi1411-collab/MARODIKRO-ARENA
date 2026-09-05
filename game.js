const $=x=>document.getElementById(x),c=$("c"),ctx=c.getContext("2d");
let ws,my=0,room="",connected=false,started=false,winner=0,last=performance.now(),sendAt=0,cool=0;
const P={1:{id:1,name:"DAYAL",x:160,y:470,hp:1,maxHp:1,f:1},2:{id:2,name:"MARODIKRO",x:960,y:470,hp:5,maxHp:5,f:-1}};
const keys=new Set(),shots=[];
$("start").onclick=()=>{
 const name=($("name").value||"PLAYER").trim().slice(0,16);
 room=($("room").value||Math.random().toString(36).slice(2,8)).toUpperCase().replace(/[^A-Z0-9]/g,"");
 if(!name||!room){$("msg").textContent="Enter a name and room code.";return}
 const proto=location.protocol==="https:"?"wss":"ws";
 ws=new WebSocket(`${proto}://${location.host}`);
 $("msg").textContent="Connecting...";
 ws.onopen=()=>ws.send(JSON.stringify({type:"join",name,room}));
 ws.onmessage=e=>handle(JSON.parse(e.data));
 ws.onerror=()=>{$("msg").textContent="Connection failed. Try again."};
 ws.onclose=()=>{connected=false;if(!$("game").classList.contains("hide"))$("status").textContent="CONNECTION LOST"};
};
function handle(m){
 if(m.type==="error"){ $("msg").textContent=m.message; ws.close(); return }
 if(m.type==="joined"){my=m.id;connected=true;$("roomLabel").textContent=`ROOM ${m.room}`;$("lobby").style.display="none";$("game").classList.remove("hide");}
 if(m.type==="players"){m.players.forEach(p=>Object.assign(P[p.id],p));$("n1").textContent=P[1].name;$("n2").textContent=P[2].name;hp()}
 if(m.type==="match_start"){started=true;$("status").textContent="FIGHT!"}
 if(m.type==="state"&&m.id!==my)Object.assign(P[m.id],{x:m.x,y:m.y,f:m.facing});
 if(m.type==="shot")shots.push({x:m.x,y:m.y,tx:m.tx,ty:m.ty,t:0,owner:m.id});
 if(m.type==="hit_confirmed"){P[m.target].hp=m.hp;hp();$("status").textContent=m.attacker===my?"HIT!":"INCOMING!"}
 if(m.type==="round_over"){winner=m.winner;$("status").textContent=winner===my?"YOU WIN":"YOU LOST"}
 if(m.type==="round_reset"){winner=0;started=true;m.players.forEach(p=>Object.assign(P[p.id],p));hp();$("status").textContent="FIGHT!"}
 if(m.type==="opponent_left"){started=false;$("status").textContent="OPPONENT LEFT"}
}
function hp(){$("hp").textContent="♥".repeat(P[2].hp)+"♡".repeat(5-P[2].hp)}
addEventListener("keydown",e=>{keys.add(e.key.toLowerCase());if(e.key.startsWith("Arrow")||e.key===" ")e.preventDefault()});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
c.addEventListener("pointerdown",e=>{
 if(!started||!connected||winner||cool>0)return;
 const r=c.getBoundingClientRect(),me=P[my],tx=(e.clientX-r.left)*c.width/r.width,ty=(e.clientY-r.top)*c.height/r.height;
 cool=180;shots.push({x:me.x,y:me.y,tx,ty,t:0,owner:my});ws.send(JSON.stringify({type:"shot",tx,ty}));
 const enemy=P[my===1?2:1], dx=tx-enemy.x,dy=ty-enemy.y;
 if(Math.hypot(dx,dy)<34)ws.send(JSON.stringify({type:"hit"}));
});
function update(dt){
 cool=Math.max(0,cool-dt);if(!my||!started||winner)return;const me=P[my];let x=0,y=0;
 if(keys.has("a")||keys.has("arrowleft"))x--;if(keys.has("d")||keys.has("arrowright"))x++;
 if(keys.has("w")||keys.has("arrowup"))y--;if(keys.has("s")||keys.has("arrowdown"))y++;
 if(x||y){let l=Math.hypot(x,y);x/=l;y/=l;me.x+=x*.28*dt;me.y+=y*.28*dt;me.f=x<0?-1:1}
 me.x=Math.max(55,Math.min(1065,me.x));me.y=Math.max(100,Math.min(545,me.y));
 if(performance.now()-sendAt>35){ws.send(JSON.stringify({type:"state",x:me.x,y:me.y,facing:me.f}));sendAt=performance.now()}
}
function text(t,y,s){ctx.textAlign="center";ctx.font=`900 ${s}px system-ui`;ctx.fillStyle="#eef2ff";ctx.fillText(t,560,y)}
function drawPlayer(p,id){
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.f,1);ctx.fillStyle=id===1?"#8097ff":"#ff6073";ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;
 ctx.beginPath();ctx.arc(0,-22,15,0,7);ctx.fill();ctx.fillRect(-14,-7,28,40);ctx.fillRect(12,-2,29,7);ctx.shadowBlur=0;ctx.fillStyle="#10141e";ctx.fillRect(-12,8,7,21);ctx.fillRect(5,8,7,21);ctx.restore();
 ctx.textAlign="center";ctx.font="800 11px system-ui";ctx.fillStyle=id===1?"#aebdff":"#ff9aaa";ctx.fillText(p.name,p.x,p.y-51);
}
function draw(){
 const g=ctx.createLinearGradient(0,0,0,620);g.addColorStop(0,"#0b111d");g.addColorStop(1,"#05070c");ctx.fillStyle=g;ctx.fillRect(0,0,1120,620);
 ctx.strokeStyle="rgba(130,150,190,.07)";for(let x=0;x<1120;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,620);ctx.stroke()}for(let y=0;y<620;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1120,y);ctx.stroke()}
 ctx.strokeStyle="#26344c";ctx.lineWidth=2;ctx.strokeRect(28,28,1064,564);
 for(const x of [260,520,800]){ctx.fillStyle="#101a29";ctx.fillRect(x,300,70,18)}
 drawPlayer(P[1],1);drawPlayer(P[2],2);
 for(const b of shots){b.t+=.08;const x=b.x+(b.tx-b.x)*b.t,y=b.y+(b.ty-b.y)*b.t;ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fillStyle=b.owner===1?"#b6c4ff":"#ff7586";ctx.fill()}
 for(let i=shots.length-1;i>=0;i--)if(shots[i].t>=1)shots.splice(i,1);
 if(!started){ctx.fillStyle="#0009";ctx.fillRect(28,28,1064,564);text("WAITING FOR MARODIKRO",300,27);text("SEND THE ROOM CODE TO YOUR FRIEND",338,12)}
 if(winner){ctx.fillStyle="#000a";ctx.fillRect(28,28,1064,564);text(winner===my?"VICTORY":"DEFEATED",300,52);text(winner===my?"MARODIKRO HAS BEEN DELETED":"REMATCH?",342,13)}
}
function loop(t){let dt=Math.min(40,t-last);last=t;update(dt);draw();$("time").textContent=new Date().toLocaleTimeString([], {hour12:false});requestAnimationFrame(loop)}requestAnimationFrame(loop);
$("leave").onclick=()=>location.reload();

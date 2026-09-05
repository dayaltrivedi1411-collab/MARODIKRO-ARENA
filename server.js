const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8765;
const publicDir = path.join(__dirname, "public");
const rooms = new Map();

const send = (ws, data) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data));
const broadcast = (room, data) => room.players.forEach(p => send(p.ws, data));

function cleanName(s) {
  return String(s || "PLAYER").trim().slice(0, 16).replace(/[<>]/g, "") || "PLAYER";
}
function cleanRoom(s) {
  return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
function newRoom() {
  return { players: new Map(), started: false };
}
function snapshot(room) {
  return [...room.players.values()].map(p => ({
    id:p.id, name:p.name, x:p.x, y:p.y, hp:p.hp, maxHp:p.maxHp
  }));
}
function reset(room) {
  for (const p of room.players.values()) {
    p.x = p.id === 1 ? 160 : 960;
    p.y = 470;
    p.hp = p.maxHp;
  }
}

const server = http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/") u = "/index.html";
  const file = path.normalize(path.join(publicDir,u));
  if (!file.startsWith(publicDir)) return res.writeHead(403).end("Forbidden");
  fs.readFile(file,(err,data)=>{
    if(err) return res.writeHead(404).end("Not found");
    const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
    res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
    res.end(data);
  });
});

const wss = new WebSocket.Server({server});
wss.on("connection", ws=>{
  let code=null, id=null;

  ws.on("message", raw=>{
    let m; try { m=JSON.parse(raw); } catch { return; }

    if(m.type==="join"){
      code=cleanRoom(m.room);
      if(!code) return send(ws,{type:"error",message:"Please enter a room code."});
      let room=rooms.get(code);
      if(!room){room=newRoom();rooms.set(code,room);}
      if(room.players.size>=2) return send(ws,{type:"error",message:"That arena already has two players."});

      id=room.players.size+1;
      const maxHp=id===1?1:5;
      room.players.set(id,{ws,id,name:cleanName(m.name),x:id===1?160:960,y:470,hp:maxHp,maxHp});
      send(ws,{type:"joined",id,room:code});
      broadcast(room,{type:"players",players:snapshot(room)});
      if(room.players.size===2){
        room.started=true;
        broadcast(room,{type:"match_start",serverTime:Date.now()});
      }
      return;
    }

    if(!code||!id) return;
    const room=rooms.get(code), me=room?.players.get(id);
    if(!room||!me) return;

    if(m.type==="state"){
      me.x=Math.max(55,Math.min(1065,Number(m.x)||me.x));
      me.y=Math.max(100,Math.min(545,Number(m.y)||me.y));
      broadcast(room,{type:"state",id,x:me.x,y:me.y,facing:m.facing===-1?-1:1,time:Date.now()});
    }

    if(m.type==="shot"){
      broadcast(room,{type:"shot",id,x:me.x,y:me.y,tx:Number(m.tx)||me.x,ty:Number(m.ty)||me.y,time:Date.now()});
    }

    if(m.type==="hit"){
      const targetId=id===1?2:1, target=room.players.get(targetId);
      if(!target || target.hp<=0) return;
      const distance=Math.hypot(me.x-target.x,me.y-target.y);
      if(distance>720) return;
      target.hp=Math.max(0,target.hp-(id===1?5:1));
      broadcast(room,{type:"hit_confirmed",attacker:id,target:targetId,hp:target.hp,maxHp:target.maxHp});
      if(target.hp===0){
        broadcast(room,{type:"round_over",winner:id,loser:targetId});
        setTimeout(()=>{
          if(!rooms.has(code)) return;
          reset(room);
          broadcast(room,{type:"round_reset",players:snapshot(room)});
        },1800);
      }
    }
  });

  ws.on("close",()=>{
    if(!code) return;
    const room=rooms.get(code);
    if(!room) return;
    room.players.delete(id);
    if(room.players.size===0) rooms.delete(code);
    else {
      room.started=false;
      broadcast(room,{type:"opponent_left"});
    }
  });
});

server.listen(PORT,"0.0.0.0",()=>console.log(`MARODIKRO ARENA running on port ${PORT}`));
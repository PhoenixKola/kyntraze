const { chromium } = require('@playwright/test'); const fs=require('fs');
const out=process.argv[2]; fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await (await b.newContext({viewport:{width:960,height:540}})).newPage();const errs=[];p.on('console',m=>m.type()==='error'&&errs.push(m.text()));p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://127.0.0.1:5191/?seed=31&qa=1');await p.getByTestId('play-button').click();await p.getByTestId('start-run').click();await p.waitForFunction(()=>window.__KYNT_QA__);await p.waitForTimeout(600);
await p.evaluate(()=>{const s=window.__KYNT_QA__.sim(),q=s.player;q.hp=1e6;q.maxHp=1e6;q.nextXp=1e9;q.attackClock=1e9;s.spawnTimer=1e9;s.nextFlanker=1e9;s.enemies.length=0;q.x=1100;q.y=800;});
const pos=()=>p.evaluate(()=>{const q=window.__KYNT_QA__,h=q.heroPose(),c=document.querySelector('canvas').getBoundingClientRect(),s=q.sim().player;const sx=Math.max(0,Math.min(2200-960,s.x-480)),sy=Math.max(0,Math.min(1600-540,s.y-270));return {x:c.x+(h.x-sx)*c.width/960,y:c.y+(h.y-sy)*c.height/540}});
const shot=async(name)=>{const h=await pos();await p.screenshot({path:`${out}/${name}.png`,clip:{x:Math.max(0,h.x-60),y:Math.max(0,h.y-110),width:120,height:130}});};
for(const [k,n] of [['w','run-north'],['s','run-south']]){await p.keyboard.down(k);await p.waitForTimeout(350);for(let i=0;i<3;i++){await shot(`${n}-${i}`);await p.waitForTimeout(70);}await p.keyboard.up(k);await p.waitForTimeout(200);await p.evaluate(()=>{const q=window.__KYNT_QA__.sim().player;q.x=1100;q.y=800;});}
await p.evaluate(()=>{const q=window.__KYNT_QA__.sim().player;q.drive=100;});await p.keyboard.press('f');await p.waitForTimeout(1800);
await p.keyboard.down('w');await p.waitForTimeout(350);for(let i=0;i<3;i++){await shot(`f1-run-north-${i}`);await p.waitForTimeout(70);}await p.keyboard.up('w');
await p.waitForTimeout(300);await shot('f1-idle');
console.log('errs',errs.length,errs.slice(0,2));await b.close();})();

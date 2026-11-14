const { chromium } = require('@playwright/test'); const path=require('path'); const out=process.argv[2];
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const c=await b.newContext({viewport:{width:960,height:540}}); const page=await c.newPage();
await page.goto('http://127.0.0.1:5173/?seed=11&qa=1'); await page.getByTestId('play-button').click(); await page.getByTestId('start-run').click(); await page.waitForFunction(()=>Boolean(window.__KYNT_QA__)); await new Promise(r=>setTimeout(r,500));
await page.evaluate(()=>{const s=window.__KYNT_QA__.sim(); s.player.hp=1e5; s.player.maxHp=1e5; s.player.nextXp=1e9; s.player.attackClock=1e9; s.player.drive=100;});
await page.keyboard.down('f'); await new Promise(r=>setTimeout(r,80)); await page.keyboard.up('f'); await new Promise(r=>setTimeout(r,1200));
await page.keyboard.down('d'); await new Promise(r=>setTimeout(r,200)); await page.keyboard.up('d');
await page.evaluate(()=>{const s=window.__KYNT_QA__.sim(); s.spawnTimer=1e9; s.nextFlanker=1e9; s.enemies.length=0; const p=s.player; for(let i=0;i<16;i++){s.enemies.push({id:7000+i,kind:i%3?'pursuer':'flanker',x:p.x+180+Math.random()*120,y:p.y-60+Math.random()*120,hp:25,maxHp:25,radius:17,speed:0,damage:0,touchCooldown:0});}});
await page.keyboard.down('r'); await new Promise(r=>setTimeout(r,60)); await page.keyboard.up('r');
const t=[500,1000,1300,1380,1500,1700]; let prev=0; for(const m of t){ await new Promise(r=>setTimeout(r,m-prev)); prev=m; await page.screenshot({path:path.join(out,`f1-sph-${m}.png`)}); }
await b.close(); })();

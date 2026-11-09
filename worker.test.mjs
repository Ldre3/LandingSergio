import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env={ASSETS:{fetch:async r=>new Response(new URL(r.url).pathname)}};
test('cloud facade preserves website and public page during outage',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};
 try{
 let r=await worker.fetch(new Request('https://abrodesmedia.com/'),env);assert.equal(await r.text(),'/');
 r=await worker.fetch(new Request('https://subidas.abrodesmedia.com/'),env);assert.equal(r.status,200);assert.equal(r.headers.get('X-Abrodes-Portal'),'cloudflare');assert.equal(await r.text(),'/_portal/index.html');
 r=await worker.fetch(new Request('https://subidas.abrodesmedia.com/__status'),env);assert.deepEqual(await r.json(),{ready:false,wakeConfigured:false});
 r=await worker.fetch(new Request('https://subidas.abrodesmedia.com/api/deliveries'),env);assert.equal(r.status,503);assert.equal((await r.json()).code,'SERVER_UNAVAILABLE');assert.equal(r.headers.get('cache-control'),'no-store');
 r=await worker.fetch(new Request('https://subidas.abrodesmedia.com/admin'),env);assert.equal(r.status,503);assert.match(await r.text(),/Conectando/);
 }finally{globalThis.fetch=original;}
});
test('healthy proxy preserves credentials, body and authorization responses',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async r=>{assert.equal(r.headers.get('authorization'),'Bearer test');assert.equal(await r.text(),'payload');return new Response('denied',{status:403})};
 try{const r=await worker.fetch(new Request('https://subidas.abrodesmedia.com/api/deliveries',{method:'POST',headers:{authorization:'Bearer test'},body:'payload'}),env);assert.equal(r.status,403);assert.equal(await r.text(),'denied');}finally{globalThis.fetch=original;}
});

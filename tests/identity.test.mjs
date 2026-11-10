import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers.mjs';
import { openDatabase } from '../server/db.mjs';
test('persistent profiles, authenticated ownership and filtered discovery',async t=>{
 const f=await fixture(t);
 assert.equal((await f.a('/profile',f.profile)).status,403);
 assert.equal((await f.client()('/profile')).status,401);
 assert.equal((await f.a('/workers?area=G-9&trade=Electrician&available=now')).data.length,1);
 assert.equal((await f.a('/workers?area=F-10')).data.length,0);
 const db=openDatabase(f.databasePath);assert.equal(db.prepare('SELECT name FROM workers').get().name,'Aslam');db.close();
 await f.worker('/profile',{...f.profile,manual_available:false});assert.equal((await f.a('/workers?available=now')).data.length,0);
 const second=f.client();assert.equal((await second('/auth/login',{username:'aslam',password:'wrong-password'})).status,401);
 assert.equal((await second('/auth/login',{username:'aslam',password:'test-password-123'})).status,200);
 assert.equal((await second('/profile')).data.manual_available,false);
 await second('/auth/logout',{});assert.equal((await second('/profile')).status,401);
});

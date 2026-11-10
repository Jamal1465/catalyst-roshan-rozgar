export function bookingRoutes(ctx, {id,requireThat}) {
 const {path,method,input,user,db,one,run,send,participant,detail}=ctx;
 if(method!=='POST')return false;
 const accept=path.match(/^\/api\/requests\/([^/]+)\/accept$/);
 if(accept){
  const requestId=accept[1];
  requireThat(Number.isInteger(input.version)&&typeof input.idempotency_key==='string'&&input.idempotency_key.length>=16&&input.idempotency_key.length<=100);
  db.exec('BEGIN IMMEDIATE');
  try {
   const request=participant(requestId,user);requireThat(request.customer_id===user.id,'FORBIDDEN',403);
   const existing=one('SELECT * FROM bookings WHERE idempotency_key=?',input.idempotency_key);
   if(existing){requireThat(existing.customer_id===user.id&&existing.request_id===requestId,'IDEMPOTENCY_KEY_REUSED',409);db.exec('COMMIT');send(200,detail(requestId,user));return true;}
   requireThat(['requested','discussing'].includes(request.status),'REQUEST_CLOSED',409);
   const proposal=one('SELECT * FROM proposals WHERE request_id=? ORDER BY version DESC LIMIT 1',requestId);
   requireThat(proposal&&proposal.version===input.version,'STALE_PROPOSAL',409);
   requireThat(one('SELECT manual_available FROM workers WHERE user_id=?',request.worker_id).manual_available,'WORKER_UNAVAILABLE',409);
   requireThat(!one("SELECT id FROM bookings WHERE worker_id=? AND status IN ('confirmed','in_progress')",request.worker_id),'WORKER_BUSY',409);
   run('INSERT INTO bookings(id,request_id,proposal_id,customer_id,worker_id,idempotency_key) VALUES(?,?,?,?,?,?)',id(),requestId,proposal.id,user.id,request.worker_id,input.idempotency_key);
   run("UPDATE requests SET status='converted' WHERE id=?",requestId);db.exec('COMMIT');send(200,detail(requestId,user));return true;
  }catch(e){db.exec('ROLLBACK');if(e.message.includes('UNIQUE constraint failed: bookings.worker_id')){e.status=409;e.message='WORKER_BUSY';}throw e;}
 }
 const match=path.match(/^\/api\/bookings\/([^/]+)\/(start|worker-finished|complete|cancel|reviews)$/);
 if(!match)return false;
 const [,bookingId,action]=match;
 db.exec('BEGIN IMMEDIATE');
 try {
  const b=one('SELECT * FROM bookings WHERE id=?',bookingId);requireThat(b&&[b.worker_id,b.customer_id].includes(user.id),'NOT_FOUND',404);
  if(action==='start'||action==='worker-finished'){
   requireThat(user.id===b.worker_id,'FORBIDDEN',403);
   requireThat(b.status===(action==='start'?'confirmed':'in_progress'),'INVALID_TRANSITION',409);
   if(action==='start')run("UPDATE bookings SET status='in_progress' WHERE id=?",bookingId);
   else run('UPDATE bookings SET worker_marked_done_at=COALESCE(worker_marked_done_at,CURRENT_TIMESTAMP) WHERE id=?',bookingId);
  }else if(action==='complete'){
   requireThat(user.id===b.customer_id,'FORBIDDEN',403);requireThat(b.status==='in_progress'&&b.worker_marked_done_at,'WORKER_MUST_FINISH_FIRST',409);run("UPDATE bookings SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE id=?",bookingId);
  }else if(action==='cancel'){
   requireThat(b.status==='confirmed','ONLY_UNSTARTED_BOOKINGS_CAN_BE_CANCELLED',409);run("UPDATE bookings SET status='cancelled' WHERE id=?",bookingId);run("UPDATE requests SET status='cancelled' WHERE id=?",b.request_id);
  }else{
   requireThat(user.id===b.customer_id,'FORBIDDEN',403);requireThat(b.status==='completed','COMPLETE_BEFORE_REVIEW',409);requireThat(!one('SELECT id FROM reviews WHERE booking_id=?',bookingId),'ALREADY_REVIEWED',409);
   requireThat(Number.isInteger(input.rating)&&input.rating>=1&&input.rating<=5&&typeof input.feedback==='string'&&input.feedback.length<=2000);
   run('INSERT INTO reviews(id,booking_id,customer_id,worker_id,rating,feedback) VALUES(?,?,?,?,?,?)',id(),bookingId,user.id,b.worker_id,input.rating,input.feedback.trim());
  }
  db.exec('COMMIT');send(200,detail(b.request_id,user));return true;
 }catch(e){db.exec('ROLLBACK');throw e;}
}

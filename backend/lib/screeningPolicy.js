const crypto = require('crypto');
class PolicyError extends Error { constructor(message,status=400){ super(message); this.status=status; } }
const clean=(v,n,max=1000)=>{ if(typeof v!=='string'||!v.trim()) throw new PolicyError(`${n} is required`); const x=v.trim(); if(x.length>max) throw new PolicyError(`${n} is too long`); return x; };
const unit=(v,n)=>{ const x=Number(v); if(!Number.isFinite(x)||x<0||x>1) throw new PolicyError(`${n} must be between 0 and 1`); return x; };
function pseudonym(value,key){ return crypto.createHmac('sha256',key).update(clean(value,'document identifier',200)).digest('hex'); }
function matchScore({nameSimilarity,dobMatch,documentMatch}){ const score=unit(nameSimilarity,'nameSimilarity')*.45+(dobMatch?0.2:0)+(documentMatch?0.35:0); return Math.round(score*1000)/1000; }
function requireRole(role,allowed){ if(!allowed.includes(role)) throw new PolicyError('Human adjudicator role required',403); }
function requireIdempotency(req){ const k=req.get('Idempotency-Key'); if(!k||!/^[\w.:-]{8,128}$/.test(k)) throw new PolicyError('Valid Idempotency-Key required'); return k; }
module.exports={PolicyError,clean,pseudonym,matchScore,requireRole,requireIdempotency};

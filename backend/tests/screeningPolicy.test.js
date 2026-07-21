const test=require('node:test'),assert=require('node:assert/strict');const {pseudonym,matchScore,requireRole,PolicyError}=require('../lib/screeningPolicy');
test('pseudonymizes document identifiers deterministically without retaining them',()=>{const a=pseudonym('P123456789','k'.repeat(32));assert.equal(a,pseudonym('P123456789','k'.repeat(32)));assert.ok(!a.includes('P123'));});
test('matching weights explicit signals and never returns a decision',()=>{assert.equal(matchScore({nameSimilarity:1,dobMatch:true,documentMatch:true}),1);assert.equal(matchScore({nameSimilarity:0,dobMatch:false,documentMatch:false}),0);});
test('invalid similarity is rejected',()=>assert.throws(()=>matchScore({nameSimilarity:2}),PolicyError));
test('only supervisors adjudicate',()=>assert.throws(()=>requireRole('analyst',['supervisor']),/adjudicator/));

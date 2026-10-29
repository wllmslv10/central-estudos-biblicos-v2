// Recovery-path check only. Synthetic local data; never connects to Neon.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../api-worker/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
try {
 await db.exec(`CREATE TABLE public.ceb_materials(id integer PRIMARY KEY,kind text,extracted_text text,sha256 text);
 CREATE TABLE public.ceb_quiz_attempts(id integer PRIMARY KEY,answers jsonb,score numeric);
 INSERT INTO public.ceb_materials VALUES(1,'estudo','Texto original preservado','synthetic-checksum');
 INSERT INTO public.ceb_quiz_attempts VALUES(1,'[0,1,2,3]',4);`);
 const rows = async table => (await db.query('SELECT * FROM public.' + table + ' ORDER BY id')).rows;
 const before = {materials:await rows('ceb_materials'),attempts:await rows('ceb_quiz_attempts')};
 const timeout = (await db.query("SELECT current_setting('lock_timeout') AS value")).rows[0].value;
 const migration = await readFile('api-worker/migrations/006_material_classification.sql','utf8');
 const beforeCommit = migration.replace(/COMMIT;\s*$/, '');
 await db.exec(beforeCommit);
 assert.equal((await db.query("SELECT current_setting('lock_timeout') AS value")).rows[0].value,'3s');
 assert.equal((await db.query("SELECT current_setting('statement_timeout') AS value")).rows[0].value,'15s');
 await assert.rejects(db.exec('SELECT ceb_deliberately_missing_recovery_probe();'));
 await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='ceb_materials' AND column_name='category'")).rows[0].n,0);
 assert.deepEqual(await rows('ceb_materials'),before.materials);
 assert.deepEqual(await rows('ceb_quiz_attempts'),before.attempts);
 assert.equal((await db.query("SELECT current_setting('lock_timeout') AS value")).rows[0].value,timeout);
 console.log(JSON.stringify({failedMigrationRolledBack:true,originalDataIntact:true,quizAttemptsIntact:true,transactionLocalTimeouts:true,productionWrites:0,cloudRestorePerformed:false}));
} finally {await db.close();}

import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { originalRoute, validateBundle } from "../originals.js";
const owner = "10000000-0000-4000-8000-000000000001",
  student = "10000000-0000-4000-8000-000000000002",
  other = "10000000-0000-4000-8000-000000000003",
  sid = "20000000-0000-4000-8000-000000000001",
  fid = "30000000-0000-4000-8000-000000000001";
test("originais: bytes, seleção, revogação, privacidade, lixeira e projeção leve", async () => {
  const db = new PGlite();
  const queries = [];
  const client = {
    query: async (sql, args) => {
      queries.push(sql);
      const r = await db.query(sql, args);
      return { ...r, rowCount: r.affectedRows ?? r.rows.length };
    },
  };
  try {
    await db.exec(
      `CREATE TABLE ceb_studies(id uuid,owner_user_id uuid,title text,content jsonb,visibility text,status text,deleted_at timestamptz,updated_at timestamptz DEFAULT now());CREATE TABLE ceb_materials(id uuid,owner_user_id uuid,title text,filename text,mime_type text,object_key text,scope text,applied boolean DEFAULT false,applied_date date,deleted_at timestamptz,updated_at timestamptz DEFAULT now());`,
    );
    const content = {
      originalBundle: {
        version: 1,
        files: [{ id: fid, filename: "aula.html", mime: "text/html" }],
      },
      applied: true,
      appliedDate: "2026-10-31",
      libraryScope: "private",
      sharing: {
        enabled: true,
        audience: "selected",
        userIds: [student],
        allowDownload: false,
      },
    };
    await client.query(
      "INSERT INTO ceb_studies(id,owner_user_id,title,content,visibility,status) VALUES($1,$2,'Aula',$3,'shared','published')",
      [sid, owner, JSON.stringify(content)],
    );
    await client.query(
      "INSERT INTO ceb_materials(id,owner_user_id,title,filename,mime_type,object_key,scope) VALUES($1,$2,'Original','aula.html','text/html','key','private')",
      [fid, owner],
    );
    const bytes = new TextEncoder().encode(
      '<html><style>body{background:#123456}</style><button onclick="this.textContent=42">Dinâmica</button></html>',
    );
    let reads = 0;
    const route = (uid, role = "user", action = "view", file = fid) => {
      const url = new URL(
        `https://api.test/library/originals/${sid}/files/${file}/${action}`,
      );
      return originalRoute(
        new Request(url),
        {},
        url,
        client,
        { id: uid, app_role: role },
        (v, status) => Response.json(v, { status }),
        "https://wllmslv10.github.io",
        () => ({
          get: async () => {
            reads++;
            return { body: bytes };
          },
        }),
      );
    };
    const response = await route(student);
    assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
    assert.match(response.headers.get("Content-Security-Policy"), /sandbox/);
    assert.equal((await route(other)).status, 404);
    assert.equal((await route(student, "user", "download")).status, 404);
    assert.equal((await route(other, "admin")).status, 404);
    assert.equal((await route(owner, "admin", "download")).status, 200);
    content.sharing.allowDownload = true;
    await client.query("UPDATE ceb_studies SET content=$1", [
      JSON.stringify(content),
    ]);
    assert.equal((await route(student, "user", "download")).status, 200);
    content.sharing.enabled = false;
    await client.query("UPDATE ceb_studies SET content=$1", [
      JSON.stringify(content),
    ]);
    assert.equal((await route(student)).status, 404);
    content.sharing.enabled = true;
    content.sharing.audience = "all";
    await client.query("UPDATE ceb_studies SET content=$1", [
      JSON.stringify(content),
    ]);
    assert.equal((await route(other)).status, 200);
    assert.equal((await route(student, "user", "view", other)).status, 404);
    await client.query("UPDATE ceb_studies SET deleted_at=now()");
    assert.equal((await route(student)).status, 404);
    await client.query("UPDATE ceb_studies SET deleted_at=NULL");
    await client.query("UPDATE ceb_materials SET deleted_at=now()");
    assert.equal((await route(student)).status, 404);
    await client.query("UPDATE ceb_materials SET deleted_at=NULL");
    await validateBundle(client, content, { id: owner, app_role: "admin" });
    await assert.rejects(
      validateBundle(client, content, { id: other, app_role: "admin" }),
      /sem permissão/,
    );
    await assert.rejects(
      validateBundle(
        client,
        {
          originalBundle: {
            version: 1,
            files: [
              content.originalBundle.files[0],
              content.originalBundle.files[0],
            ],
          },
        },
        { id: owner },
      ),
      /repetido/,
    );
    const before = reads;
    const url = new URL("https://api.test/library/applied");
    queries.length = 0;
    const applied = await originalRoute(
      new Request(url),
      {},
      url,
      client,
      { id: owner, app_role: "admin" },
      (v, status) => Response.json(v, { status }),
      "",
    );
    const body = await applied.json();
    assert.deepEqual(
      Object.keys(body.materials[0]).sort(),
      ["id", "title", "identification", "applied_date", "source"].sort(),
    );
    assert.equal(body.materials[0].applied_date, "2026-10-31");
    assert.equal(reads, before);
    assert.equal(
      queries.some((q) => /SELECT \*|extracted_text|title,content[, ]/.test(q)),
      false,
    );
  } finally {
    await db.close();
  }
});

test("cartão original integra questionário e preserva entrega após editar informações", async () => {
  const { default: pg } = await import("pg");
  const { default: worker } = await import("../worker.js");
  const { hashSessionToken } = await import("../auth.js");
  const { readFile } = await import("node:fs/promises");
  const db = new PGlite();
  const previous = {
    connect: pg.Client.prototype.connect,
    query: pg.Client.prototype.query,
    end: pg.Client.prototype.end,
  };
  const query = async (sql, args) => {
    const r = await db.query(sql, args);
    return {
      ...r,
      rowCount: /^\s*SELECT/i.test(sql)
        ? r.rows.length
        : (r.affectedRows ?? r.rows.length),
    };
  };
  try {
    await db.exec(
      `CREATE ROLE ceb_api_user;CREATE TABLE ceb_users(id uuid PRIMARY KEY,username text,display_name text,password_hash text,app_role text,is_active boolean DEFAULT true,must_change_password boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE ceb_studies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_user_id uuid,title text,content jsonb,visibility text,status text,deleted_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE ceb_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,token_hash text,expires_at timestamptz,revoked_at timestamptz);`,
    );
    for (const name of [
      "003_cloud_materials.sql",
      "004_quizzes.sql",
      "005_students_ai.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../migrations/" + name, import.meta.url),
          "utf8",
        ),
      );
    for (const [uid, role] of [
      [owner, "admin"],
      [student, "user"],
    ]) {
      await query(
        "INSERT INTO ceb_users(id,username,display_name,password_hash,app_role) VALUES($1,$2,$2,'unused',$2)",
        [uid, role],
      );
      await query(
        "INSERT INTO ceb_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [uid, await hashSessionToken(role + "-original-test")],
      );
    }
    await query(
      "INSERT INTO ceb_materials(id,owner_user_id,title,filename,mime_type,byte_size,object_key,sha256,kind,scope) VALUES($1,$2,'Aula','aula.html','text/html',1,'key','digest','estudo','general')",
      [fid, owner],
    );
    pg.Client.prototype.connect = async () => {};
    pg.Client.prototype.end = async () => {};
    pg.Client.prototype.query = query;
    const api = async (path, role = "admin", method = "GET", body) => {
      const r = await worker.fetch(
        new Request("https://api.test" + path, {
          method,
          headers: {
            Authorization: "Bearer " + role + "-original-test",
            Origin: "https://wllmslv10.github.io",
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
        {
          HYPERDRIVE: { connectionString: "postgresql://never.invalid/local" },
        },
      );
      return { status: r.status, body: await r.json() };
    };
    const bundle = {
      version: 1,
      description: "Aula original",
      files: [{ id: fid, filename: "aula.html" }],
    };
    const created = await api("/studies", "admin", "POST", {
      title: "Originais",
      content: {
        collection: "originals",
        libraryScope: "general",
        originalBundle: bundle,
      },
    });
    assert.equal(created.status, 201);
    const study = created.body.study;
    const path = "/studies/" + study.id + "/quiz";
    const saved = await api(path, "admin", "PUT", {
      revision: 0,
      policy: "single",
      mode: "manual",
      reviewed: true,
      showAnswers: true,
      questions: [
        {
          id: crypto.randomUUID(),
          question: "A quem Jesus mandou adorar?",
          options: ["Ao Senhor", "Ao dinheiro", "Ao poder", "Ao tentador"],
          answer: 0,
          reference: "Mateus 4:10",
          points: 1,
          explanation: "Somente ao Senhor.",
        },
      ],
    });
    assert.equal(saved.status, 200);
    const sharing = await api(
      "/studies/" + study.id + "/sharing",
      "admin",
      "PUT",
      {
        enabled: true,
        audience: "selected",
        userIds: [student],
        allowDownload: true,
        quizEnabled: true,
      },
    );
    assert.equal(sharing.status, 200, JSON.stringify(sharing.body));
    const attempt = (await api(path + "/start", "user", "POST", {})).body
      .attempt;
    assert.ok(attempt.id);
    const delivery = await api(path + "/attempt", "user", "POST", {
      id: attempt.id,
      answers: [0],
      draftRevision: attempt.draft_revision,
      submit: true,
    });
    assert.equal(delivery.status, 200);
    assert.equal(delivery.body.attempt.percent, 100);
    const receipt = (await query("SELECT * FROM ceb_quiz_attempts")).rows[0];
    assert.equal(
      (
        await api("/studies/" + study.id, "admin", "PUT", {
          title: "Título corrigido",
          content: {
            ...study.content,
            originalBundle: {
              ...bundle,
              description: "Identificação corrigida",
            },
          },
          status: "published",
        })
      ).status,
      200,
    );
    assert.deepEqual(
      (await query("SELECT * FROM ceb_quiz_attempts")).rows[0],
      receipt,
    );
    const preserved = (
      await query("SELECT content FROM ceb_studies WHERE id=$1", [study.id])
    ).rows[0].content;
    assert.equal(preserved.sharing.quizEnabled, true);
    assert.deepEqual(preserved.sharing.userIds, [student]);
  } finally {
    Object.assign(pg.Client.prototype, previous);
    await db.close();
  }
});

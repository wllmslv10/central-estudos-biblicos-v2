import { objectStore } from "./storage.js";
const UUID = /^[0-9a-f-]{36}$/i;
export async function validateBundle(client, content, user) {
  if (!content.originalBundle) return;
  const files = content.originalBundle.files;
  if (
    content.originalBundle.version !== 1 ||
    (content.originalBundle.description !== undefined &&
      (typeof content.originalBundle.description !== "string" ||
        content.originalBundle.description.length > 2000)) ||
    !Array.isArray(files) ||
    files.length < 1 ||
    files.length > 12 ||
    files.some(
      (f) =>
        !f ||
        !UUID.test(f.id) ||
        typeof f.filename !== "string" ||
        f.filename.length > 240,
    )
  )
    throw new Error("Anexos originais inválidos.");
  const ids = [...new Set(files.map((f) => f.id))];
  if (ids.length !== files.length)
    throw new Error("Arquivo repetido no cartão.");
  if (ids.length) {
    const result = await client.query(
      `SELECT id,filename,mime_type FROM public.ceb_materials WHERE id::text=ANY($1::text[]) AND deleted_at IS NULL AND (owner_user_id=$2 OR ($3::boolean AND scope='general'))`,
      [ids, user.id, user.app_role === "admin"],
    );
    if (result.rows.length !== ids.length)
      throw new Error("Há anexos indisponíveis ou sem permissão.");
    content.originalBundle.files = files.map((f) => {
      const row = result.rows.find((row) => row.id === f.id);
      return { id: row.id, filename: row.filename, mime: row.mime_type };
    });
  }
}
export async function originalRoute(
  request,
  env,
  url,
  client,
  user,
  json,
  origin,
  store = objectStore,
) {
  const reply = (data, status = 200) => json(data, status, origin);
  const admin = user.app_role === "admin";
  if (url.pathname === "/library/applied" && request.method === "GET") {
    // Project metadata in SQL: no full study, extracted text or original bytes.
    const studies = await client.query(
      `SELECT id,title,CASE WHEN content ? 'originalBundle' THEN 'Material original' ELSE COALESCE(content->>'collection',content->>'kind','Estudo CEB') END AS identification, content->>'appliedDate' AS applied_date, 'study' AS source FROM public.ceb_studies WHERE deleted_at IS NULL AND content->>'applied'='true' AND (owner_user_id=$1 OR ($2::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular'))) ORDER BY updated_at DESC`,
      [user.id, admin],
    );
    const materials = await client.query(
      `SELECT m.id,m.title,m.filename AS identification,m.applied_date::text AS applied_date,'material' AS source FROM public.ceb_materials m WHERE m.deleted_at IS NULL AND m.applied=TRUE AND (m.owner_user_id=$1 OR ($2::boolean AND m.scope='general')) ORDER BY m.updated_at DESC`,
      [user.id, admin],
    );
    return reply({ materials: [...studies.rows, ...materials.rows] });
  }
  const match = url.pathname.match(
    /^\/library\/originals\/([0-9a-f-]{36})\/files\/([0-9a-f-]{36})\/(view|download)$/i,
  );
  if (!match || request.method !== "GET")
    return reply({ error: "Rota não encontrada." }, 404);
  const [, studyId, fileId, action] = match;
  const result = await client.query(
    `SELECT m.* FROM public.ceb_studies s JOIN public.ceb_materials m ON m.id=$2 WHERE s.id=$1 AND s.deleted_at IS NULL AND m.deleted_at IS NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.content->'originalBundle'->'files') f WHERE f->>'id'=m.id::text) AND (s.owner_user_id=$3 OR ($4::boolean AND COALESCE(s.content->>'libraryScope','general') NOT IN ('private','particular')) OR (s.visibility='shared' AND s.status='published' AND s.content->'sharing'->>'enabled'='true' AND (($5::boolean AND m.mime_type IN ('text/html','application/pdf')) OR s.content->'sharing'->>'allowDownload'='true') AND (s.content->'sharing'->>'audience'='all' OR (s.content->'sharing'->>'audience'='selected' AND s.content->'sharing'->'userIds' ? ($3::text)))))`,
    [studyId, fileId, user.id, admin, action === "view"],
  );
  const row = result.rows[0];
  if (!row)
    return reply(
      { error: "Arquivo indisponível ou acesso não autorizado." },
      404,
    );
  const original = await store(env).get(row.object_key);
  if (!original) return reply({ error: "Original indisponível." }, 404);
  return new Response(original.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/'/g, "%27")}`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      ...(origin === "https://wllmslv10.github.io"
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
    },
  });
}

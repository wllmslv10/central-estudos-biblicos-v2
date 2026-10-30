import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
const sid = "20000000-0000-4000-8000-000000000001",
  fid = "30000000-0000-4000-8000-000000000001";
const html =
  "<!doctype html><html><style>body{background:rgb(12, 34, 56);color:white}</style><button onclick=\"this.textContent='Concluído'\">Dinâmica</button></html>";
const file = {
  id: fid,
  filename: "aula-original.html",
  mime_type: "text/html",
  title: "Aula",
  byte_size: html.length,
};
let studies = [],
  requests = [],
  shared,
  downloads = [];
const entry = "ceb-originals-validation.tsx",
  pageFile = "ceb-originals-validation.html";
let browser, vite;
try {
  await writeFile(
    pageFile,
    `<!doctype html><html><meta charset="UTF-8"><div id="root"></div><script type="module" src="/${entry}"></script></html>`,
  );
  await writeFile(
    entry,
    `import React,{useState}from'react';import{createRoot}from'react-dom/client';import OriginalMaterials,{AppliedMaterials}from'./src/OriginalMaterials';import './src/styles.css';function Test(){const[a,b]=useState(false);return <><button onClick={()=>b(!a)}>Alternar aplicados</button>{a?<AppliedMaterials token="technical" onChanged={()=>{}}/>:<OriginalMaterials token="technical" onChanged={()=>{}} onShare={()=>{}}/>}</>}createRoot(document.getElementById('root')!).render(<Test/>);`,
  );
  vite = await createServer({ server: { host: "127.0.0.1", port: 0 } });
  await vite.listen();
  browser = await chromium.launch({
    ...(process.env.CEB_TEST_CHROMIUM
      ? { executablePath: process.env.CEB_TEST_CHROMIUM }
      : {}),
    args: [
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    headless: true,
  });
  const context = await browser.newContext({ acceptDownloads: true }),
    page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("download", async (d) => downloads.push(d.suggestedFilename()));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      value: () => true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: async (args) => {
        window.__shared = args.files.map((f) => ({
          name: f.name,
          size: f.size,
        }));
      },
      configurable: true,
    });
  });
  await context.route(
    "https://ceb-biblioteca-api.wllmslv10.workers.dev/**",
    async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      requests.push({ path, method: req.method() });
      if (path.endsWith("/view") || path.endsWith("/download"))
        return route.fulfill({
          status: 200,
          body: html,
          contentType: "application/octet-stream",
        });
      if (path === "/library/materials")
        return route.fulfill({ json: { materials: [file] } });
      if (path === "/library/applied")
        return route.fulfill({
          json: {
            materials: [
              {
                id: sid,
                title: "Minha aula original",
                identification: "Material original",
                applied_date: "2026-10-31",
                source: "study",
              },
            ],
          },
        });
      if (path === "/studies" && req.method() === "POST") {
        const body = req.postDataJSON();
        studies = [
          {
            ...body,
            id: sid,
            status: "draft",
            owner_user_id: "admin",
            created_at: "2026-10-30",
            updated_at: "2026-10-30",
          },
        ];
        return route.fulfill({ status: 201, json: { study: studies[0] } });
      }
      if (path === "/studies") return route.fulfill({ json: { studies } });
      return route.fulfill({ json: { ok: true } });
    },
  );
  await page.goto(vite.resolvedUrls.local[0] + pageFile);
  await page.getByLabel("Título", { exact: true }).fill("Minha aula original");
  await page.getByLabel("Breve identificação").fill("Aula de sábado");
  await page.getByLabel("aula-original.html", { exact: false }).check();
  await page.getByRole("button", { name: "Salvar cartão" }).click();
  await page
    .getByRole("heading", { name: "Minha aula original", exact: true })
    .waitFor();
  assert.equal(studies[0].content.originalBundle.files[0].id, fid);
  await page.getByRole("button", { name: "Visualizar original" }).click();
  const frame = page.frameLocator("#original-frame");
  await frame.getByRole("button", { name: "Dinâmica" }).click();
  await frame.getByRole("button", { name: "Concluído" }).waitFor();
  assert.equal(
    await frame
      .locator("body")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(12, 34, 56)",
  );
  await page.getByRole("button", { name: "Fechar visualização" }).click();
  await page
    .getByRole("button", { name: "Preparar arquivo para WhatsApp" })
    .click();
  await page
    .getByRole("button", { name: "Compartilhar arquivo / escolher WhatsApp" })
    .click();
  shared = await page.evaluate(() => window.__shared);
  assert.equal(shared[0].name, "aula-original.html");
  assert.equal(shared[0].size, Buffer.byteLength(html));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      value: () => false,
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "Compartilhar arquivo / escolher WhatsApp" })
    .click();
  await page
    .getByText("Arquivo baixado. Abra o WhatsApp e anexe-o como documento.")
    .waitFor();
  requests = [];
  await page.getByRole("button", { name: "Alternar aplicados" }).click();
  await page.getByRole("heading", { name: "Materiais Aplicados" }).waitFor();
  await page.getByLabel("Data de aplicação").fill("2026-11-01");
  await page.getByRole("button", { name: "Desmarcar aplicação" }).click();
  assert.equal(
    requests.some(
      (r) =>
        r.path === "/studies" ||
        r.path === "/library/materials" ||
        r.path.includes("/files/"),
    ),
    false,
  );
  assert.deepEqual(errors, []);
  assert.ok(downloads.includes("aula-original.html"));
  console.log(
    JSON.stringify({
      cardCreated: true,
      htmlStylePreserved: true,
      htmlInteraction: true,
      nativeShareFileOnly: shared,
      downloadFallback: true,
      appliedMetadataOnly: true,
      pageErrors: errors,
      productionWrites: 0,
    }),
  );
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await rm(entry, { force: true });
  await rm(pageFile, { force: true });
}

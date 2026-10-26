// Protecao automatica da identidade visual aprovada da CEB V2.
// Para alterar estes elementos no futuro, e necessaria aprovacao explicita.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const manifest = JSON.parse(read('public/manifest.webmanifest'));
const installer = read('public/instalar.html');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const count = (s, pattern) => [...s.matchAll(pattern)].length;

const book = String.raw`<img\s+src=["']/central-estudos-biblicos-v2/ceb-book\.png["']`;
expect(count(app, /className="brand-mark" aria-hidden="true">\s*<img\s+src="\/central-estudos-biblicos-v2\/ceb-book\.png"/g) === 1,
  'Cabecalho deve usar a Biblia CEB (public/ceb-book.png).');
expect(count(app, /className="ceb-auth-mark">\s*<img\s+src="\/central-estudos-biblicos-v2\/ceb-book\.png"/g) === 2,
  'Login e primeira troca de senha devem usar a Biblia CEB.');
expect(count(app, /className="brand-mark small">\s*<img\s+src="\/central-estudos-biblicos-v2\/ceb-book\.png"/g) === 1,
  'Rodape deve manter a Biblia CEB.');
expect(!/className="(?:brand-mark(?: small)?|ceb-auth-mark)"[^>]*>\s*✝/.test(app),
  'Cruz nao permitida nos locais de identidade visual da CEB.');
const icons = manifest.icons ?? [];
expect(icons.some((i) => i.src === './icon-192.png' && i.sizes === '192x192'),
  'Manifesto deve apontar para o icone IBNE 192x192.');
expect(icons.some((i) => i.src === './icon-512.png' && i.sizes === '512x512'),
  'Manifesto deve apontar para o icone IBNE 512x512.');
expect(/<img\s+src="\.\/icon-512\.png"/.test(installer),
  'Pagina de instalacao deve exibir o icone IBNE.');

const protectedAssets = {
  'public/ceb-book.png': '7ecb7b6ebbcd508382d0db5f926aaf0a9fdf0c5c',
  'public/icon-192.png': 'd5f7c652a6e542e62a475a38de646c01088e7f72',
  'public/icon-512.png': '6e1e4160f3f056ff10154660811f4fa88eb9038d',
  'identidade-visual/composicoes-nome-igreja.png': 'c59a1bc1f764e870bd8ac0cbbc8b60e23b61b5ba',
  'identidade-visual/icone-azul-arredondado-original.png': 'c7c7a6ee7cbf363ca61def1c7de2c252ed6242e4',
  'identidade-visual/logo-circular-azul-1.png': '953c4055f51f6e591e62de0f9ae349cef587cebc',
  'identidade-visual/logo-circular-azul-2.png': 'edcbdb290ad29b65f69dc894da7a07ad2ca17889',
  'identidade-visual/pomba-preta-ibne-1.png': 'd5a4bb342a4b9ae28bb86e335cc6e212ae790512',
  'identidade-visual/pomba-preta-ibne-2.png': '6fc63e859b9081cda6b2d277596e65504a04fd5e',
};
for (const [path, approvedHash] of Object.entries(protectedAssets)) {
  try {
    const actual = execFileSync('git', ['hash-object', path], { encoding: 'utf8' }).trim();
    expect(actual === approvedHash, `Imagem protegida alterada: ${path}`);
  } catch {
    errors.push(`Imagem protegida ausente: ${path}`);
  }
}
if (errors.length) {
  console.error('IDENTIDADE VISUAL: VERIFICACAO FALHOU');
  errors.forEach((error) => console.error(' - ' + error));
  process.exit(1);
}
console.log('Identidade visual CEB V2 aprovada: verificacao OK.');

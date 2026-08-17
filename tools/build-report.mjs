#!/usr/bin/env node
/**
 * build-report.mjs — Gera o relatório visual do catálogo a partir de docs/catalogo.json.
 *
 * O relatório é para escolher trabalho, não para executá-lo: mostra código, título e um
 * resumo legível. O plano técnico fica em docs/planos/.
 *
 *   node tools/build-report.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const cat = JSON.parse(readFileSync(join(REPO, 'docs', 'catalogo.json'), 'utf8'));

/** Tira o prefixo redundante e a pontuação de abertura dos títulos. */
function cleanTitle(t) {
  return t
    .replace(/^EPIC\s*[—:–-]\s*/i, '')
    .replace(/^EPIC\s+/i, '')
    .replace(/^\s*[—:–-]\s*/, '')
    .trim();
}

/** Primeira frase do racional, sem referências de código, para leitura corrida. */
function summarise(item) {
  let s = item.rationale || '';
  // Manter o texto entre crases — só a marcação sai. Apagar o conteúdo destruía frases
  // como "grep por `AudioRecord`, `MediaRecorder` e `MIC`".
  s = s.replace(/`([^`]*)`/g, '$1');
  // Referências de código não ajudam quem está só escolhendo o que fazer.
  s = s.replace(/\([^)]*\.(java|c|h|xml|mk)[^)]*\)/gi, '');
  s = s.replace(/\b[A-Za-z0-9_/.]+\.(java|c|h|xml|mk):\d+(-\d+)?/g, '');
  s = s.replace(/[,;]?\s*:\d+(-\d+)?/g, ''); // âncoras de linha órfãs
  // As remoções deixam pontuação pendurada e parênteses vazios.
  s = s.replace(/\s+([,.;:!?)])/g, '$1').replace(/\(\s*\)/g, '');
  s = s.replace(/\(\s*,/g, '(').replace(/,\s*\)/g, ')');
  s = s.replace(/\s{2,}/g, ' ').trim();

  const sentences = s.split(/(?<=[.!?])\s+/);
  let out = sentences[0] || s;
  if (out.length < 90 && sentences[1]) out += ' ' + sentences[1];
  if (out.length > 300) out = out.slice(0, 299).replace(/\s+\S*$/, '') + '…';
  return out.trim();
}

const CATS = {
  E: { label: 'EPIC', file: 'EPICS.md', hint: 'Várias frentes, várias sessões' },
  M: { label: 'Melhoria', file: 'MELHORIAS.md', hint: 'Escopo definido' },
  Q: { label: 'Rápido', file: 'QUICK-WINS.md', hint: 'Horas, não dias' },
  B: { label: 'Bug', file: 'BUGS.md', hint: 'Defeito encontrado no código' },
};

const items = [];
const push = (arr, letter) => {
  for (const it of arr) {
    items.push({
      code: it.code,
      cat: letter,
      title: cleanTitle(it.title),
      summary: summarise(it),
      area: (it.subsystems && it.subsystems[0]) || '',
      size: it.size,
      severity: it.severity || null,
      confirmed: it.confirmations > 1 ? it.confirmations : 0,
    });
  }
};
push(cat.epics, 'E');
push(cat.improvements, 'M');
push(cat.quick, 'Q');
push(cat.bugs, 'B');

// Áreas com nome curto o bastante para virar filtro.
const areaShort = (a) => a
  .replace('Entrada de Toque, Trackpad, Mouse e Caneta', 'Toque e mouse')
  .replace('Entrada de Controle/Gamepad', 'Gamepad')
  .replace('Entrada de Teclado', 'Teclado')
  .replace('Pipeline de Vídeo e Decodificação', 'Vídeo')
  .replace('Pipeline de Audio', 'Áudio')
  .replace('Rede, Protocolo e Descoberta de Hosts', 'Rede')
  .replace('Camada Nativa', 'Nativo/JNI')
  .replace('Preferências, Configuração e Perfis', 'Preferências')
  .replace('UI, Recursos e Internacionalização', 'Interface')
  .replace('Segurança, Privacidade e Robustez', 'Segurança')
  .replace('Arquitetura Geral e Ciclo', 'Arquitetura')
  .replace('Build, CI, Testes e', 'Build e CI')
  .replace('Delta Artemis vs Moonlight', 'Fork')
  .replace('Comparação Artemis', 'Fork')
  .trim();

for (const it of items) it.area = areaShort(it.area);

const counts = { E: 0, M: 0, Q: 0, B: 0 };
for (const it of items) counts[it.cat]++;

const areas = [...new Set(items.map((i) => i.area))].filter(Boolean).sort();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<title>Catálogo VibeArtemis</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* Paleta derivada das barras de teste SMPTE — as cores codificam categoria,
     que é informação real, não decoração. Neutros levemente frios para acompanhar. */
  :root {
    --ground: #F7F8FA;
    --surface: #FFFFFF;
    --sunken: #EDF0F4;
    --line: #DCE1E8;
    --line-strong: #C3CBD6;
    --ink: #171C23;
    --ink-soft: #4C5765;
    --ink-faint: #78838F;
    --accent: #0E7F9B;
    --accent-soft: #E2F1F6;
    --cat-e: #A8377A;
    --cat-m: #0E7F9B;
    --cat-q: #2F7D4F;
    --cat-b: #B8442A;
    --focus: #0E7F9B;
    --shadow: 0 1px 2px rgba(20,28,38,.06);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0E1116;
      --surface: #151A21;
      --sunken: #1B222B;
      --line: #262F3A;
      --line-strong: #38434F;
      --ink: #E7ECF2;
      --ink-soft: #A3AEBC;
      --ink-faint: #78838F;
      --accent: #3FBEDC;
      --accent-soft: #10333D;
      --cat-e: #E27BB6;
      --cat-m: #3FBEDC;
      --cat-q: #6CC98C;
      --cat-b: #F0846A;
      --focus: #3FBEDC;
      --shadow: 0 1px 2px rgba(0,0,0,.4);
    }
  }
  :root[data-theme="dark"] {
    --ground: #0E1116;
    --surface: #151A21;
    --sunken: #1B222B;
    --line: #262F3A;
    --line-strong: #38434F;
    --ink: #E7ECF2;
    --ink-soft: #A3AEBC;
    --ink-faint: #78838F;
    --accent: #3FBEDC;
    --accent-soft: #10333D;
    --cat-e: #E27BB6;
    --cat-m: #3FBEDC;
    --cat-q: #6CC98C;
    --cat-b: #F0846A;
    --focus: #3FBEDC;
    --shadow: 0 1px 2px rgba(0,0,0,.4);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    font-size: 15px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  .mono {
    font-family: ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
  }

  .wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

  /* ---------------------------------------------------------------- header */
  header { border-bottom: 1px solid var(--line); background: var(--surface); }
  .head-inner { padding: 44px 0 28px; display: flex; flex-direction: column; gap: 18px; }
  .eyebrow {
    font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-faint); font-weight: 600;
  }
  h1 {
    margin: 0; font-size: clamp(28px, 4.2vw, 40px); line-height: 1.1;
    letter-spacing: -.025em; font-weight: 680; text-wrap: balance;
  }
  .lede { margin: 0; max-width: 62ch; color: var(--ink-soft); font-size: 16px; }

  /* Faixa de contagem: as quatro categorias, nas cores que as identificam. */
  .tally { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--line); border-radius: 2px; overflow: hidden; }
  .tally div { flex: 1 1 130px; padding: 12px 14px; border-right: 1px solid var(--line); background: var(--surface); }
  .tally div:last-child { border-right: 0; }
  .tally .n { font-size: 24px; font-weight: 660; letter-spacing: -.02em; display: block; }
  .tally .k { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); font-weight: 600; }
  .tally .h { font-size: 12px; color: var(--ink-faint); }
  .t-E .n { color: var(--cat-e); } .t-M .n { color: var(--cat-m); }
  .t-Q .n { color: var(--cat-q); } .t-B .n { color: var(--cat-b); }

  /* ---------------------------------------------------------------- toolbar */
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    background: var(--ground); border-bottom: 1px solid var(--line);
    padding: 12px 0;
  }
  .toolbar-inner { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    font: inherit; font-size: 13px; font-weight: 550;
    padding: 5px 11px; border: 1px solid var(--line-strong); border-radius: 2px;
    background: var(--surface); color: var(--ink-soft); cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .chip:hover { border-color: var(--ink-faint); }
  .chip[aria-pressed="true"] { background: var(--ink); color: var(--ground); border-color: var(--ink); }
  .chip.c-E[aria-pressed="true"] { background: var(--cat-e); border-color: var(--cat-e); color: #fff; }
  .chip.c-M[aria-pressed="true"] { background: var(--cat-m); border-color: var(--cat-m); color: #fff; }
  .chip.c-Q[aria-pressed="true"] { background: var(--cat-q); border-color: var(--cat-q); color: #fff; }
  .chip.c-B[aria-pressed="true"] { background: var(--cat-b); border-color: var(--cat-b); color: #fff; }

  .search {
    flex: 1 1 200px; min-width: 180px;
    font: inherit; font-size: 14px; padding: 6px 11px;
    border: 1px solid var(--line-strong); border-radius: 2px;
    background: var(--surface); color: var(--ink);
  }
  .search::placeholder { color: var(--ink-faint); }
  select.search { cursor: pointer; flex: 0 0 auto; }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

  /* ---------------------------------------------------------------- list */
  main { padding: 8px 0 64px; }
  .count { font-size: 13px; color: var(--ink-faint); padding: 14px 2px 6px; }

  ul.list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
  li.row {
    display: grid; grid-template-columns: 84px 1fr;
    gap: 0 18px; padding: 16px 2px;
    border-bottom: 1px solid var(--line);
  }
  li.row:hover { background: var(--surface); }

  .code {
    font-size: 15px; font-weight: 640; letter-spacing: .02em;
    background: none; border: 0; padding: 0; cursor: pointer; text-align: left;
    align-self: start; position: relative;
  }
  .code::after {
    content: "copiar"; display: block;
    font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
    color: var(--ink-faint); opacity: 0; transition: opacity .12s;
    font-family: system-ui, sans-serif; font-weight: 600;
  }
  li.row:hover .code::after, .code:focus-visible::after { opacity: 1; }
  .code.copied::after { content: "copiado"; opacity: 1; color: var(--cat-q); }
  .e-E { color: var(--cat-e); } .e-M { color: var(--cat-m); }
  .e-Q { color: var(--cat-q); } .e-B { color: var(--cat-b); }

  .body h2 { margin: 0 0 4px; font-size: 15.5px; font-weight: 620; line-height: 1.35; letter-spacing: -.01em; }
  .body p { margin: 0 0 8px; color: var(--ink-soft); font-size: 14px; max-width: 68ch; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tag {
    font-size: 11px; letter-spacing: .04em; padding: 2px 7px;
    border: 1px solid var(--line-strong); border-radius: 2px; color: var(--ink-faint);
  }
  .tag.sev { border-color: var(--cat-b); color: var(--cat-b); font-weight: 600; }
  .tag.conf { border-color: var(--accent); color: var(--accent); }

  .empty { padding: 48px 2px; color: var(--ink-faint); }

  footer {
    border-top: 1px solid var(--line); background: var(--surface);
    padding: 28px 0 40px; color: var(--ink-faint); font-size: 13px;
  }
  footer p { margin: 0 0 8px; max-width: 70ch; }
  footer a { color: var(--accent); }

  @media (max-width: 600px) {
    li.row { grid-template-columns: 1fr; gap: 6px; }
    .head-inner { padding: 32px 0 22px; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<header>
  <div class="wrap head-inner">
    <span class="eyebrow">VibeArtemis · fork do Artemis</span>
    <h1>Catálogo de propostas</h1>
    <p class="lede">
      Tudo que vale a pena considerar neste fork, com um código para cada item.
      Para começar a trabalhar em algo, é só me dizer o código —
      <span class="mono" style="color:var(--accent)">Q07</span>, por exemplo.
      O plano técnico de cada um já está escrito em <span class="mono">docs/planos/</span>.
    </p>
    <div class="tally">
      <div class="t-E"><span class="n mono">${counts.E}</span><span class="k">EPICs</span><div class="h">Várias sessões</div></div>
      <div class="t-M"><span class="n mono">${counts.M}</span><span class="k">Melhorias</span><div class="h">Escopo definido</div></div>
      <div class="t-Q"><span class="n mono">${counts.Q}</span><span class="k">Rápidos</span><div class="h">Horas, não dias</div></div>
      <div class="t-B"><span class="n mono">${counts.B}</span><span class="k">Bugs</span><div class="h">Achados no código</div></div>
    </div>
  </div>
</header>

<div class="toolbar">
  <div class="wrap toolbar-inner">
    <div class="chips" role="group" aria-label="Filtrar por tipo">
      <button class="chip c-E" data-cat="E" aria-pressed="false">EPICs</button>
      <button class="chip c-M" data-cat="M" aria-pressed="false">Melhorias</button>
      <button class="chip c-Q" data-cat="Q" aria-pressed="false">Rápidos</button>
      <button class="chip c-B" data-cat="B" aria-pressed="false">Bugs</button>
    </div>
    <select class="search" id="area" aria-label="Filtrar por área">
      <option value="">Todas as áreas</option>
      ${areas.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('\n      ')}
    </select>
    <input class="search" id="q" type="search" placeholder="Buscar por palavra ou código…" aria-label="Buscar">
  </div>
</div>

<main class="wrap">
  <div class="count" id="count"></div>
  <ul class="list" id="list"></ul>
  <div class="empty" id="empty" hidden>Nada encontrado com esses filtros.</div>
</main>

<footer>
  <div class="wrap">
    <p>
      Origem: análise de 14 subsistemas do código, com 1.059 leituras de arquivo,
      consolidada e deduplicada. Itens marcados <span class="mono">✱</span> foram
      levantados por mais de uma análise independente — são os de maior confiança.
    </p>
    <p>
      <strong>Nada aqui foi reproduzido num aparelho.</strong> São conclusões de leitura
      de código, ancoradas em arquivo e linha. Vale confirmar antes de agir.
    </p>
    <p>
      O teclado (<span class="mono">E01</span>) já está implementado e aguardando teste
      em dispositivo, por isso não aparece na lista.
    </p>
  </div>
</footer>

<script>
  const ITEMS = ${JSON.stringify(items)};
  const CATS = ${JSON.stringify(CATS)};

  const list = document.getElementById('list');
  const empty = document.getElementById('empty');
  const countEl = document.getElementById('count');
  const qEl = document.getElementById('q');
  const areaEl = document.getElementById('area');
  const chips = [...document.querySelectorAll('.chip')];

  let active = new Set();

  function render() {
    const q = qEl.value.trim().toLowerCase();
    const area = areaEl.value;

    const shown = ITEMS.filter(it => {
      if (active.size && !active.has(it.cat)) return false;
      if (area && it.area !== area) return false;
      if (q && !(it.code + ' ' + it.title + ' ' + it.summary + ' ' + it.area).toLowerCase().includes(q)) return false;
      return true;
    });

    countEl.textContent = shown.length === ITEMS.length
      ? shown.length + ' propostas'
      : shown.length + ' de ' + ITEMS.length + ' propostas';

    list.innerHTML = shown.map(it => {
      const tags = [];
      if (it.severity === 'critical') tags.push('<span class="tag sev">crítico</span>');
      if (it.confirmed) tags.push('<span class="tag conf mono">✱ ' + it.confirmed + ' análises</span>');
      if (it.area) tags.push('<span class="tag">' + it.area + '</span>');
      tags.push('<span class="tag">' + CATS[it.cat].label + '</span>');

      return '<li class="row">'
        + '<button class="code mono e-' + it.cat + '" data-code="' + it.code + '" '
        + 'title="Clique para copiar o código">' + it.code + '</button>'
        + '<div class="body"><h2>' + it.title + '</h2>'
        + '<p>' + it.summary + '</p>'
        + '<div class="meta">' + tags.join('') + '</div></div></li>';
    }).join('');

    empty.hidden = shown.length > 0;
  }

  chips.forEach(c => c.addEventListener('click', () => {
    const cat = c.dataset.cat;
    if (active.has(cat)) { active.delete(cat); c.setAttribute('aria-pressed', 'false'); }
    else { active.add(cat); c.setAttribute('aria-pressed', 'true'); }
    render();
  }));

  qEl.addEventListener('input', render);
  areaEl.addEventListener('change', render);

  // Clicar no código copia — é assim que ele volta para o chat.
  list.addEventListener('click', ev => {
    const btn = ev.target.closest('.code');
    if (!btn) return;
    const code = btn.dataset.code;
    const done = () => {
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(done);
    } else {
      const t = document.createElement('textarea');
      t.value = code; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); done();
    }
  });

  render();
</script>
`;

writeFileSync(join(REPO, 'docs', 'catalogo.html'), html);
console.log(`relatório: docs/catalogo.html — ${items.length} itens, ${areas.length} áreas`);

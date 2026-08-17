#!/usr/bin/env node
/**
 * scaffold-docs.mjs — Converte o dump da análise inicial em documentação navegável.
 *
 * ATENÇÃO: isto é um andaime, não um gerador contínuo. Ele rodou uma vez, a partir da
 * análise multi-agente de 2026-08-16, para semear `docs/reference/`, `docs/BACKLOG.md` e
 * `docs/glossary.md`. A partir daí **esses arquivos são mantidos à mão** — rodar de novo
 * sobrescreveria correções humanas.
 *
 * Diferente de `codemap.mjs`, que é determinístico a partir do código e pode (deve) rodar
 * sempre.
 *
 *   node tools/scaffold-docs.mjs <analysis.json>
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(REPO, 'docs');
const src = process.argv[2];

if (!src || !existsSync(src)) {
  console.error('uso: node tools/scaffold-docs.mjs <analysis.json>');
  process.exit(1);
}

const data = JSON.parse(readFileSync(src, 'utf8'));

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_LABEL = { critical: '🔴 crítico', high: '🟠 alto', medium: '🟡 médio', low: '⚪ baixo' };
const SIZE_ORDER = { 'quick-win': 0, small: 1, medium: 2, large: 3, epic: 4 };

/** Deriva um slug estável do nome do subsistema. */
function slug(subsystem) {
  const head = subsystem.split(/[(—\-]/)[0].trim().toLowerCase();
  return head
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-').slice(0, 4).join('-');
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

mkdirSync(join(DOCS, 'reference'), { recursive: true });

// ---------------------------------------------------- referência por subsistema

const written = [];

for (const r of data) {
  const name = slug(r.subsystem);
  if (!name) continue;
  const path = join(DOCS, 'reference', `${name}.md`);

  const findings = [...(r.findings || [])].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9),
  );
  const ideas = [...(r.improvementIdeas || [])].sort(
    (a, b) => (SIZE_ORDER[a.size] ?? 9) - (SIZE_ORDER[b.size] ?? 9),
  );

  let md = `# ${r.subsystem}\n\n`;
  md += `> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.\n`;
  md += `> Se você encontrar algo errado aqui, **corrija na hora** — documentação\n`;
  md += `> desatualizada é pior que ausente, porque é acreditada.\n\n`;

  md += `## Índice\n\n`;
  md += `1. [Como funciona](#como-funciona)\n2. [Arquivos-chave](#arquivos-chave)\n`;
  md += `3. [Fluxo](#fluxo)\n4. [Interfaces externas](#interfaces-externas)\n`;
  md += `5. [Problemas conhecidos](#problemas-conhecidos) (${findings.length})\n`;
  md += `6. [Ideias de melhoria](#ideias-de-melhoria) (${ideas.length})\n`;
  if (r.glossary?.length) md += `7. [Glossário](#glossário)\n`;
  md += `\n## Como funciona\n\n${r.overview}\n`;

  if (r.keyFiles?.length) {
    md += `\n## Arquivos-chave\n\n| Arquivo | Linhas | Papel |\n|---|--:|---|\n`;
    for (const f of r.keyFiles) {
      md += `| [\`${f.path}\`](../../${f.path}) | ${f.lines ?? '—'} | ${esc(f.role)} |\n`;
    }
    md += `\n<details>\n<summary>Símbolos importantes por arquivo</summary>\n\n`;
    for (const f of r.keyFiles) {
      if (!f.keySymbols?.length) continue;
      md += `**\`${f.path}\`**\n`;
      for (const s of f.keySymbols) md += `- \`${s}\`\n`;
      md += `\n`;
    }
    md += `</details>\n`;
  }

  if (r.dataFlow) md += `\n## Fluxo\n\n${r.dataFlow}\n`;

  if (r.externalInterfaces?.length) {
    md += `\n## Interfaces externas\n\n`;
    for (const i of r.externalInterfaces) md += `- ${i}\n`;
  }

  if (findings.length) {
    md += `\n## Problemas conhecidos\n\n`;
    md += `| Sev | Categoria | Problema | Local |\n|---|---|---|---|\n`;
    for (const f of findings) {
      md += `| ${SEV_LABEL[f.severity] ?? f.severity} | ${f.category} | ${esc(f.title)} | \`${esc(f.location)}\` |\n`;
    }
    md += `\n### Detalhe\n\n`;
    for (const f of findings) {
      md += `#### ${SEV_LABEL[f.severity] ?? ''} ${f.title}\n\n`;
      md += `**Local:** \`${f.location}\` · **Categoria:** ${f.category}\n\n`;
      md += `${f.detail}\n\n`;
      md += `**Correção sugerida:** ${f.suggestedFix}\n\n`;
    }
  }

  if (ideas.length) {
    md += `\n## Ideias de melhoria\n\n`;
    for (const i of ideas) {
      md += `### ${i.title}\n\n`;
      md += `**Tamanho:** ${i.size}\n\n`;
      md += `**Por quê:** ${i.rationale}\n\n`;
      md += `**Como:** ${i.approach}\n\n`;
      md += `**Risco:** ${i.risk}\n\n`;
    }
  }

  if (r.glossary?.length) {
    md += `\n## Glossário\n\n`;
    for (const g of r.glossary) md += `- ${g}\n`;
  }

  writeFileSync(path, md);
  written.push({ name, path: `docs/reference/${name}.md`, subsystem: r.subsystem, findings: findings.length, ideas: ideas.length });
}

// ---------------------------------------------------- backlog consolidado

{
  const all = [];
  for (const r of data) {
    for (const f of r.findings || []) all.push({ ...f, subsystem: r.subsystem, ref: slug(r.subsystem) });
  }
  all.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  const ideas = [];
  for (const r of data) {
    for (const i of r.improvementIdeas || []) ideas.push({ ...i, subsystem: r.subsystem, ref: slug(r.subsystem) });
  }
  ideas.sort((a, b) => (SIZE_ORDER[a.size] ?? 9) - (SIZE_ORDER[b.size] ?? 9));

  const counts = all.reduce((m, f) => ({ ...m, [f.severity]: (m[f.severity] || 0) + 1 }), {});

  let md = `# Backlog\n\n`;
  md += `> Semeado pela análise multi-agente de 2026-08-16 (14 subsistemas, 1.059 leituras\n`;
  md += `> de arquivo). Mantido à mão desde então.\n\n`;
  md += `**${all.length} problemas** — ${counts.critical || 0} críticos, ${counts.high || 0} altos, `;
  md += `${counts.medium || 0} médios, ${counts.low || 0} baixos.\n`;
  md += `**${ideas.length} ideias de melhoria.**\n\n`;
  md += `Nada aqui foi verificado em dispositivo. Trate como hipótese bem fundamentada com\n`;
  md += `âncora de \`arquivo:linha\`, não como fato confirmado — confirme antes de agir.\n\n`;

  md += `## Por onde começar\n\n`;
  md += `1. [EPIC E01 — teclado](epics/E01-teclado-anydesk.md) — a dor que motivou o fork.\n`;
  md += `2. Os críticos abaixo, principalmente os que também afetam o teclado.\n`;
  md += `3. Os quick-wins, para ganhar tração no codebase.\n\n`;

  md += `## Problemas críticos\n\n`;
  for (const f of all.filter((x) => x.severity === 'critical')) {
    md += `### ${f.title}\n\n`;
    md += `\`${f.location}\` · ${f.category} · [${f.subsystem.split(/[(—]/)[0].trim()}](reference/${f.ref}.md)\n\n`;
    md += `${f.detail}\n\n**Correção:** ${f.suggestedFix}\n\n`;
  }

  md += `## Problemas de severidade alta\n\n`;
  md += `| Problema | Categoria | Local | Subsistema |\n|---|---|---|---|\n`;
  for (const f of all.filter((x) => x.severity === 'high')) {
    md += `| ${esc(f.title)} | ${f.category} | \`${esc(f.location)}\` | [${esc(f.subsystem.split(/[(—]/)[0].trim())}](reference/${f.ref}.md) |\n`;
  }

  md += `\n## Ganhos rápidos\n\n`;
  md += `| Melhoria | Subsistema |\n|---|---|\n`;
  for (const i of ideas.filter((x) => x.size === 'quick-win')) {
    md += `| ${esc(i.title)} | [${esc(i.subsystem.split(/[(—]/)[0].trim())}](reference/${i.ref}.md) |\n`;
  }

  md += `\n## EPICs propostos\n\n`;
  for (const i of ideas.filter((x) => x.size === 'epic')) {
    md += `### ${i.title}\n\n`;
    md += `[${i.subsystem.split(/[(—]/)[0].trim()}](reference/${i.ref}.md)\n\n`.replace('${i.subsystem', i.subsystem);
    md += `**Por quê:** ${i.rationale}\n\n**Como:** ${i.approach}\n\n**Risco:** ${i.risk}\n\n`;
  }

  md += `\n## Problemas médios e baixos\n\n`;
  md += `Ficam em \`docs/reference/<subsistema>.md\`, na seção "Problemas conhecidos" de cada um.\n`;
  md += `Não foram promovidos aqui para este arquivo continuar utilizável.\n`;

  writeFileSync(join(DOCS, 'BACKLOG.md'), md);
}

// ---------------------------------------------------- glossário

{
  const terms = new Map();
  for (const r of data) {
    for (const g of r.glossary || []) {
      const i = g.indexOf(':');
      if (i < 1) continue;
      const term = g.slice(0, i).trim();
      const def = g.slice(i + 1).trim();
      if (!terms.has(term) || terms.get(term).length < def.length) terms.set(term, def);
    }
  }
  let md = `# Glossário\n\n`;
  md += `> Termos do domínio de game streaming e apelidos internos do codebase.\n`;
  md += `> ${terms.size} termos, consolidados da análise de 2026-08-16.\n\n`;
  for (const t of [...terms.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    md += `**${t}** — ${terms.get(t)}\n\n`;
  }
  writeFileSync(join(DOCS, 'glossary.md'), md);
  console.log(`glossário: ${terms.size} termos`);
}

console.log(`referência: ${written.length} arquivos`);
for (const w of written) console.log(`  ${w.path}  (${w.findings} achados, ${w.ideas} ideias)`);

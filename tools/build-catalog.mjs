#!/usr/bin/env node
/**
 * build-catalog.mjs — Transforma as ideias soltas da análise num catálogo com códigos
 * estáveis, para que uma sugestão possa ser referenciada por código no chat.
 *
 * Andaime, como scaffold-docs.mjs: rodou uma vez para semear o catálogo. Depois disso
 * os arquivos são mantidos à mão — rodar de novo sobrescreve.
 *
 * Os códigos:
 *   E##  EPIC — trabalho grande, várias frentes
 *   M##  Melhoria — escopo definido, uma ou poucas frentes
 *   Q##  Ganho rápido — horas, não dias
 *   B##  Bug — correção de defeito confirmado por leitura de código
 *
 *   node tools/build-catalog.mjs <analysis.json>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(REPO, 'docs');
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const shortSubsystem = (s) => s.split(/[(—\-]/)[0].trim();

/** Slug do arquivo de referência, igual ao usado em scaffold-docs.mjs. */
const REF_SLUGS = {
  'Arquitetura Geral e Ciclo': 'arquitetura',
  'Entrada de Teclado': 'input-teclado',
  'Entrada de Toque, Trackpad, Mouse e Caneta': 'input-touch',
  'Entrada de Controle/Gamepad': 'input-gamepad',
  'Pipeline de Vídeo e Decodificação': 'video',
  'Pipeline de Audio': 'audio',
  'Rede, Protocolo e Descoberta de Hosts': 'rede',
  'Camada Nativa': 'jni-e-nativo',
  'Preferências, Configuração e Perfis': 'preferencias',
  'UI, Recursos e Internacionalização': 'ui-e-i18n',
  'Segurança, Privacidade e Robustez': 'seguranca',
  'Build, CI, Testes e': 'build-e-ci',
  'Delta Artemis vs Moonlight': 'artemis-vs-moonlight',
  'Comparação Artemis': 'comparacao-vplus',
};

function refFor(subsystem) {
  const short = shortSubsystem(subsystem);
  for (const [k, v] of Object.entries(REF_SLUGS)) {
    if (short.startsWith(k.slice(0, 18))) return v;
  }
  return null;
}

/** Palavras-chave para agrupar propostas que são a mesma coisa dita de formas diferentes. */
const norm = (s) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^epic[\s:—-]*/i, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['para', 'como', 'quando', 'esse', 'este', 'onde', 'sobre', 'entre'].includes(w));

/** Jaccard sobre as palavras significativas do título. */
function similar(a, b) {
  const A = new Set(norm(a));
  const B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

// ------------------------------------------------------------ coleta e dedupe

const raw = [];
for (const r of data) {
  for (const i of r.improvementIdeas || []) {
    raw.push({ ...i, subsystem: r.subsystem, ref: refFor(r.subsystem), kind: 'idea' });
  }
  for (const f of r.findings || []) {
    if (f.severity !== 'critical' && f.severity !== 'high') continue;
    raw.push({
      title: f.title, size: f.severity === 'critical' ? 'small' : 'small',
      rationale: f.detail, approach: f.suggestedFix, risk: `Severidade ${f.severity}.`,
      subsystem: r.subsystem, ref: refFor(r.subsystem), kind: 'bug',
      severity: f.severity, location: f.location, category: f.category,
    });
  }
}

/**
 * Temas explícitos. A similaridade de título sozinha não junta "Modo Teclado Ancorado",
 * "IME docked" e "Reflow do stream com os insets do IME" — são a mesma proposta escrita
 * por analistas diferentes. Sem isso o catálogo vira uma lista de sinônimos.
 *
 * `done` marca o que já foi entregue, para não propor de novo.
 */
const THEMES = [
  {
    id: 'ime-resize',
    done: 'E01',
    match: (t) => /\b(ime|teclado|keyboard)\b/i.test(t)
      && /(resize|redimension|empurr|push|docked|ancorad|insets|reflow|cobri|targetsdk)/i.test(t),
  },
  {
    id: 'text-block',
    done: 'E01',
    match: (t) => /(texto|text)/i.test(t)
      && /(barra|campo|bloco|inteir|injec|inject|composi|anydesk|clipboard)/i.test(t),
  },
  {
    id: 'ci-actions',
    done: 'CI',
    match: (t) => /(github actions|pipeline de ci|\bci\b)/i.test(t),
  },
];

function themeOf(title) {
  return THEMES.find((th) => th.match(title))?.id || null;
}

// Agrupa duplicatas: várias análises propuseram a mesma coisa.
const groups = [];
for (const item of raw) {
  item.theme = item.kind === 'idea' ? themeOf(item.title) : null;

  const hit = groups.find((g) => {
    if (g[0].kind !== item.kind) return false;
    // Mesmo tema declarado: agrupa sem discutir.
    if (item.theme && g[0].theme === item.theme) return true;
    // Caso contrário, cai na similaridade de título.
    return similar(g[0].title, item.title) >= 0.42;
  });

  if (hit) hit.push(item);
  else groups.push([item]);
}

/** Do grupo, escolhe a redação mais completa e junta os subsistemas envolvidos. */
function merge(group) {
  const best = [...group].sort(
    (a, b) => (b.approach || '').length + (b.rationale || '').length
            - (a.approach || '').length - (a.rationale || '').length,
  )[0];
  const subsystems = [...new Set(group.map((g) => shortSubsystem(g.subsystem)))];
  const refs = [...new Set(group.map((g) => g.ref).filter(Boolean))];
  const theme = group.find((g) => g.theme)?.theme || null;
  const done = theme ? THEMES.find((t) => t.id === theme)?.done : null;
  return { ...best, subsystems, refs, theme, done, confirmations: group.length };
}

// O que já foi entregue sai do catálogo de propostas — continua registrado no
// documento do próprio EPIC, e repetir aqui só geraria retrabalho.
const merged = groups.map(merge).filter((m) => !m.done);
const delivered = groups.map(merge).filter((m) => m.done);

// ------------------------------------------------------------ códigos

const SIZE_RANK = { 'quick-win': 0, small: 1, medium: 2, large: 3, epic: 4 };

const bugs = merged.filter((m) => m.kind === 'bug')
  .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1)
                  || b.confirmations - a.confirmations);
const epics = merged.filter((m) => m.kind === 'idea' && m.size === 'epic')
  .sort((a, b) => b.confirmations - a.confirmations);
const quick = merged.filter((m) => m.kind === 'idea' && m.size === 'quick-win')
  .sort((a, b) => b.confirmations - a.confirmations);
const improvements = merged.filter((m) => m.kind === 'idea' && !['epic', 'quick-win'].includes(m.size))
  .sort((a, b) => (SIZE_RANK[a.size] ?? 9) - (SIZE_RANK[b.size] ?? 9) || b.confirmations - a.confirmations);

const pad = (n) => String(n).padStart(2, '0');
epics.forEach((e, i) => { e.code = `E${pad(i + 2)}`; });   // E01 é o teclado, já escrito
quick.forEach((q, i) => { q.code = `Q${pad(i + 1)}`; });
improvements.forEach((m, i) => { m.code = `M${pad(i + 1)}`; });
bugs.forEach((b, i) => { b.code = `B${pad(i + 1)}`; });

// ------------------------------------------------------------ saída

mkdirSync(join(DOCS, 'planos'), { recursive: true });
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** Resumo curto e legível, sem jargão de arquivo:linha. */
function summarise(item) {
  const first = (item.rationale || '').split(/(?<=\.)\s/)[0];
  return trunc(first.replace(/\s*\([^)]*\.java[^)]*\)/g, '').replace(/`[^`]*`/g, ''), 260);
}

function planFile(title, items, intro) {
  let md = `# ${title}\n\n> ${intro}\n\n`;
  md += `Cada item tem um código estável. Para começar a trabalhar em um deles, basta\n`;
  md += `citar o código.\n\n## Índice\n\n| Código | Item | Tamanho |\n|---|---|---|\n`;
  for (const it of items) {
    md += `| **${it.code}** | [${esc(trunc(it.title, 90))}](#${it.code.toLowerCase()}) | ${it.size} |\n`;
  }
  md += `\n---\n\n`;
  for (const it of items) {
    md += `## ${it.code}\n\n### ${it.title}\n\n`;
    md += `**Tamanho:** ${it.size}`;
    if (it.severity) md += ` · **Severidade:** ${it.severity}`;
    if (it.location) md += ` · **Local:** \`${it.location}\``;
    md += `\n\n**Subsistema:** ${it.subsystems.join(', ')}`;
    if (it.refs.length) {
      md += ` — ver ${it.refs.map((r) => `[referência](../reference/${r}.md)`).join(', ')}`;
    }
    md += `\n\n`;
    if (it.confirmations > 1) {
      md += `> Levantado de forma independente por ${it.confirmations} análises.\n\n`;
    }
    md += `**Por quê**\n\n${it.rationale}\n\n`;
    md += `**Plano de implementação**\n\n${it.approach}\n\n`;
    md += `**Risco**\n\n${it.risk}\n\n---\n\n`;
  }
  return md;
}

writeFileSync(join(DOCS, 'planos', 'EPICS.md'),
  planFile('EPICs — trabalho grande', epics,
    'Frentes que valem várias sessões e mudam algo estrutural. O E01 (teclado) está em `docs/epics/`, com detalhe maior por ser o que motivou o fork.'));

writeFileSync(join(DOCS, 'planos', 'MELHORIAS.md'),
  planFile('Melhorias', improvements,
    'Escopo definido, uma ou poucas frentes. A maior parte do valor de QoL está aqui.'));

writeFileSync(join(DOCS, 'planos', 'QUICK-WINS.md'),
  planFile('Ganhos rápidos', quick,
    'Horas, não dias. Bons para ganhar tração no codebase antes de encarar um EPIC.'));

writeFileSync(join(DOCS, 'planos', 'BUGS.md'),
  planFile('Bugs confirmados por leitura de código', bugs,
    'Defeitos de severidade crítica ou alta, com âncora de arquivo:linha. **Nenhum foi reproduzido em dispositivo** — confirme antes de corrigir.'));

// catálogo mestre
{
  let md = `# Catálogo de propostas\n\n`;
  md += `> Índice único de tudo que foi proposto para este fork. **Cite o código** para\n`;
  md += `> começar a trabalhar em um item.\n\n`;
  md += `Origem: análise multi-agente de 2026-08-16 (14 subsistemas, 1.059 leituras de\n`;
  md += `arquivo), consolidada e deduplicada. Propostas que apareceram em mais de uma\n`;
  md += `análise estão marcadas — são as de maior confiança.\n\n`;
  md += `| Prefixo | Significado | Onde está o plano |\n|---|---|---|\n`;
  md += `| **E** | EPIC — várias frentes | [planos/EPICS.md](planos/EPICS.md) |\n`;
  md += `| **M** | Melhoria — escopo definido | [planos/MELHORIAS.md](planos/MELHORIAS.md) |\n`;
  md += `| **Q** | Ganho rápido | [planos/QUICK-WINS.md](planos/QUICK-WINS.md) |\n`;
  md += `| **B** | Bug confirmado | [planos/BUGS.md](planos/BUGS.md) |\n\n`;

  const section = (title, items, file) => {
    md += `## ${title}\n\n| Código | Proposta | Tamanho | Subsistema |\n|---|---|---|---|\n`;
    for (const it of items) {
      const mark = it.confirmations > 1 ? ` ✱` : '';
      md += `| [**${it.code}**](planos/${file}#${it.code.toLowerCase()}) | ${esc(trunc(it.title, 95))}${mark} | ${it.size} | ${esc(it.subsystems[0])} |\n`;
    }
    md += `\n`;
  };

  md += `## Em andamento\n\n`;
  md += `| Código | Proposta | Estado |\n|---|---|---|\n`;
  md += `| [**E01**](epics/E01-teclado-anydesk.md) | Teclado no padrão AnyDesk | implementado, pendente de validação em dispositivo |\n\n`;

  section('EPICs', epics, 'EPICS.md');
  section('Melhorias', improvements, 'MELHORIAS.md');
  section('Ganhos rápidos', quick, 'QUICK-WINS.md');
  section('Bugs', bugs, 'BUGS.md');

  md += `\n✱ = levantado por mais de uma análise independente.\n`;
  writeFileSync(join(DOCS, 'CATALOGO.md'), md);
}

// JSON para o relatório HTML
writeFileSync(join(REPO, 'docs', 'catalogo.json'), JSON.stringify({
  epics, improvements, quick, bugs,
}, null, 1));

console.log(`catálogo: ${epics.length} EPICs · ${improvements.length} melhorias · ` +
            `${quick.length} ganhos rápidos · ${bugs.length} bugs`);
console.log(`(${raw.length} propostas brutas → ${merged.length} após deduplicação; ` +
            `${delivered.length} já entregues e removidas)`);
for (const d of delivered) {
  console.log(`  entregue [${d.done}] ${d.title.slice(0, 70)} (${d.confirmations}x)`);
}

#!/usr/bin/env node
/**
 * lint-report.mjs — Compara o resultado do Android Lint com uma baseline.
 *
 * O projeto herdou muitos avisos do upstream. Exigir zero reprovaria todo commit por
 * dívida antiga, e um gate que sempre falha é um gate que todo mundo aprende a ignorar.
 * O que dá para exigir é que **não piore**: erros novos reprovam, os conhecidos não.
 *
 * A baseline guarda a contagem por regra, não a lista de ocorrências. Isso sobrevive a
 * refatoração — mover um arquivo não inventa violação nova — e ainda pega o caso que
 * importa: uma regra que passou a disparar mais vezes.
 *
 *   node tools/lint-report.mjs              # compara com a baseline
 *   node tools/lint-report.mjs --update     # regrava a baseline (use ao QUITAR dívida)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_DIR = join(REPO, 'app', 'build', 'reports');
const BASELINE = join(REPO, 'tools', 'lint-baseline.json');
const UPDATE = process.argv.includes('--update');

function findReport() {
  if (!existsSync(REPORT_DIR)) return null;
  const candidates = readdirSync(REPORT_DIR)
    .filter((f) => f.startsWith('lint-results') && f.endsWith('.xml'));
  return candidates.length ? join(REPORT_DIR, candidates[0]) : null;
}

const reportPath = findReport();
if (!reportPath) {
  console.error('lint-report: nenhum relatório XML encontrado em app/build/reports/.');
  console.error('Rode antes: ./gradlew :app:lintNonRoot_gameDebug');
  process.exit(1);
}

const xml = readFileSync(reportPath, 'utf8');

// Fatiar por elemento em vez de casar o elemento inteiro: issues sem `<location>` vêm
// self-closing, e uma alternância de regex atravessa o elemento seguinte e atribui o
// atributo ao issue errado. Mesmo erro que já aconteceu ao ler os XML de teste.
//
// O separador é `/<issue\b/`, não a string `'<issue '`: o lint quebra linha entre a tag
// e os atributos, então o espaço nunca aparece ali. O `\b` também impede casar o
// elemento raiz `<issues>`, já que "e" seguido de "s" não é fronteira de palavra.
const issues = [];
for (const chunk of xml.split(/<issue\b/).slice(1)) {
  const id = chunk.match(/id="([^"]*)"/)?.[1];
  const severity = chunk.match(/severity="([^"]*)"/)?.[1];
  if (id) issues.push({ id, severity: severity || 'Unknown' });
}

const bySeverity = {};
const byRule = {};
for (const i of issues) {
  bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  byRule[i.id] = (byRule[i.id] || 0) + 1;
}

const summary = {
  measuredAt: new Date().toISOString().slice(0, 10),
  total: issues.length,
  bySeverity,
  byRule: Object.fromEntries(Object.entries(byRule).sort((a, b) => b[1] - a[1])),
};

console.log(`lint: ${issues.length} avisos — ` +
  Object.entries(bySeverity).map(([k, v]) => `${v} ${k}`).join(', '));

if (UPDATE || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify({
    _comment: [
      'Contagem de avisos do Android Lint por regra, herdada do upstream.',
      'O CI reprova quando uma regra passa a disparar MAIS vezes que aqui.',
      'Ao corrigir avisos, rode `node tools/lint-report.mjs --update` para baixar os números.',
      'Nunca suba um número para fazer o CI passar — é o oposto do propósito.',
    ],
    ...summary,
  }, null, 1) + '\n');
  console.log(`lint-report: baseline ${existsSync(BASELINE) ? 'atualizada' : 'criada'} em tools/lint-baseline.json`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const regressions = [];
const improvements = [];

for (const [rule, count] of Object.entries(byRule)) {
  const before = baseline.byRule?.[rule] ?? 0;
  if (count > before) regressions.push({ rule, before, now: count });
}
for (const [rule, before] of Object.entries(baseline.byRule || {})) {
  const now = byRule[rule] ?? 0;
  if (now < before) improvements.push({ rule, before, now });
}

if (improvements.length) {
  console.log('\nMelhorou:');
  for (const i of improvements) console.log(`  ${i.rule}: ${i.before} -> ${i.now}`);
  console.log('  (rode `node tools/lint-report.mjs --update` para registrar)');
}

if (!regressions.length) {
  console.log('\nlint-report: nenhum aviso novo.');
  process.exit(0);
}

console.error(`\nlint-report: ${regressions.length} regra(s) piorando:`);
for (const r of regressions) console.error(`  ${r.rule}: ${r.before} -> ${r.now}`);
console.error('\nCorrija os avisos novos. Atualizar a baseline para cima não é opção.');
process.exit(1);

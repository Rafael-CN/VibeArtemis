#!/usr/bin/env node
/**
 * query.mjs — Consulta ao índice de código.
 *
 * `docs/maps/code-index.json` é um BANCO DE DADOS, não um documento. Lê-lo inteiro custa
 * mais contexto que a tarefa que você veio fazer. Este script existe para responder
 * perguntas pontuais em no máximo 40 linhas de texto puro.
 *
 *   node tools/codemap/query.mjs --symbol sendUtf8Text
 *   node tools/codemap/query.mjs --file Game.java --symbols
 *   node tools/codemap/query.mjs --callers PreferenceConfiguration
 *   node tools/codemap/query.mjs --callees Game.java
 *   node tools/codemap/query.mjs --package com.limelight.binding.video
 *   node tools/codemap/query.mjs --jni sendUtf8Text
 *   node tools/codemap/query.mjs --grep keyboard
 *   node tools/codemap/query.mjs --hot 15
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(REPO, 'docs', 'maps', 'code-index.json');
const MAX_LINES = 40;

if (!existsSync(INDEX)) {
  console.error('query: índice ausente. Rode: node tools/codemap/codemap.mjs');
  process.exit(1);
}

const db = JSON.parse(readFileSync(INDEX, 'utf8'));
const argv = process.argv.slice(2);

function flag(name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true);
}

const out = [];
const say = (s) => out.push(s);
const short = (p) => p.replace('app/src/main/java/com/limelight/', 'cl/').replace('app/src/main/jni/', 'jni/');

/** Arquivos cujo caminho contém o termo (case-insensitive). */
const findFiles = (term) => {
  const t = term.toLowerCase();
  return db.files.filter((f) => f.path.toLowerCase().includes(t));
};

const usage = () => {
  say('Uso: node tools/codemap/query.mjs <flag> <valor>');
  say('');
  say('  --symbol <nome>     onde um símbolo é declarado');
  say('  --file <nome>       resumo de um arquivo (+ --symbols para listar métodos)');
  say('  --callers <nome>    quem importa esse arquivo/classe');
  say('  --callees <nome>    o que esse arquivo importa (interno)');
  say('  --package <nome>    arquivos e métrica de um pacote');
  say('  --jni <nome>        os dois lados da fronteira JNI');
  say('  --grep <termo>      busca livre em caminhos e símbolos');
  say('  --hot [n]           arquivos mais centrais');
};

// ---------------------------------------------------------------- comandos

const symbol = flag('--symbol');
const file = flag('--file');
const callers = flag('--callers');
const callees = flag('--callees');
const pkg = flag('--package');
const jni = flag('--jni');
const grep = flag('--grep');
const hot = flag('--hot');

if (symbol && symbol !== true) {
  const t = symbol.toLowerCase();
  const hits = [];
  for (const f of db.files) {
    for (const ty of f.types) {
      if (ty.name.toLowerCase().includes(t)) hits.push(`${ty.kind.padEnd(9)} ${ty.name}  →  ${f.path}:${ty.line}`);
    }
    for (const m of f.methods) {
      if (m.name.toLowerCase() === t) {
        hits.push(`method    ${m.name}(${(m.params || '').slice(0, 40)})  →  ${f.path}:${m.line}`);
      }
    }
  }
  say(`# símbolo "${symbol}" — ${hits.length} ocorrência(s)`);
  hits.slice(0, MAX_LINES - 2).forEach((h) => say(h));
  if (hits.length > MAX_LINES - 2) say(`… mais ${hits.length - (MAX_LINES - 2)}. Refine o termo.`);
} else if (file && file !== true) {
  const matches = findFiles(file);
  if (!matches.length) say(`# nenhum arquivo casa com "${file}"`);
  for (const f of matches.slice(0, 3)) {
    say(`# ${f.path}`);
    say(`  ${f.lines} linhas · ${f.lang} · pacote ${f.package || '—'}`);
    say(`  tipos: ${f.types.map((t) => t.name).join(', ') || '—'}`);
    const internal = (f.imports || []).filter((i) => i.startsWith('com.limelight'));
    say(`  importa ${internal.length} internos, ${(f.imports || []).length - internal.length} externos`);
    if (f.nativeMethods?.length) say(`  ⚠ ${f.nativeMethods.length} métodos native (fronteira JNI)`);
    if (f.todos?.length) say(`  ⚠ ${f.todos.length} TODO/FIXME`);
    if (argv.includes('--symbols')) {
      say('  métodos públicos:');
      f.methods
        .filter((m) => /public|native|protected/.test(m.modifiers || ''))
        .slice(0, MAX_LINES - 10)
        .forEach((m) => say(`    ${String(m.line).padStart(5)}  ${m.name}(${(m.params || '').slice(0, 50)})`));
    }
  }
} else if (callers && callers !== true) {
  const matches = findFiles(callers);
  if (!matches.length) { say(`# nenhum arquivo casa com "${callers}"`); }
  const target = matches[0];
  if (target) {
    const who = db.graph.fileEdges.filter(([, to]) => to === target.path).map(([from]) => from);
    say(`# quem depende de ${short(target.path)} — ${who.length}`);
    [...new Set(who)].sort().slice(0, MAX_LINES - 2).forEach((w) => say(`  ${short(w)}`));
    if (!who.length) say('  (ninguém — folha do grafo)');
  }
} else if (callees && callees !== true) {
  const matches = findFiles(callees);
  const target = matches[0];
  if (!target) { say(`# nenhum arquivo casa com "${callees}"`); }
  else {
    const what = db.graph.fileEdges.filter(([from]) => from === target.path).map(([, to]) => to);
    say(`# ${short(target.path)} depende de — ${what.length}`);
    [...new Set(what)].sort().slice(0, MAX_LINES - 2).forEach((w) => say(`  ${short(w)}`));
  }
} else if (pkg && pkg !== true) {
  const fs_ = db.files.filter((f) => f.package === pkg || (f.package || '').startsWith(pkg + '.'));
  say(`# pacote ${pkg} — ${fs_.length} arquivos, ${fs_.reduce((s, f) => s + f.lines, 0)} linhas`);
  fs_.sort((a, b) => b.lines - a.lines).slice(0, MAX_LINES - 4).forEach((f) => {
    say(`  ${String(f.lines).padStart(5)}  ${f.path.split('/').pop().padEnd(38)} ${f.types.map((t) => t.name).join(',')}`);
  });
} else if (jni && jni !== true) {
  const t = jni.toLowerCase();
  say(`# fronteira JNI para "${jni}"`);
  for (const f of db.files) {
    for (const m of f.nativeMethods || []) {
      if (m.name.toLowerCase().includes(t)) say(`  JAVA  ${f.path}:${m.line}\n        ${m.returns} ${m.name}(${m.params})`);
    }
    for (const e of f.jniExports || []) {
      if (e.name.toLowerCase().includes(t) || (e.javaSymbol || '').toLowerCase().includes(t)) {
        say(`  C     ${f.path}:${e.line}\n        ${e.name}`);
      }
    }
  }
  if (out.length === 1) say('  (nada encontrado — confira docs/maps/JNI_BRIDGE.md)');
} else if (grep && grep !== true) {
  const t = grep.toLowerCase();
  const paths = db.files.filter((f) => f.path.toLowerCase().includes(t)).map((f) => `  file    ${f.path}`);
  const syms = [];
  for (const f of db.files) {
    for (const ty of f.types) if (ty.name.toLowerCase().includes(t)) syms.push(`  type    ${ty.name}  ${f.path}:${ty.line}`);
  }
  say(`# busca "${grep}" — ${paths.length} arquivos, ${syms.length} tipos`);
  [...paths, ...syms].slice(0, MAX_LINES - 2).forEach((l) => say(l));
} else if (hot) {
  const n = hot === true ? 15 : parseInt(hot, 10);
  const inDeg = new Map();
  for (const [, to] of db.graph.fileEdges) inDeg.set(to, (inDeg.get(to) || 0) + 1);
  say(`# arquivos mais dependidos (top ${n})`);
  [...inDeg.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).forEach(([p, d]) => {
    const f = db.files.find((x) => x.path === p);
    say(`  fan-in ${String(d).padStart(3)}  ${String(f?.lines ?? '?').padStart(5)}L  ${short(p)}`);
  });
} else {
  usage();
}

console.log(out.slice(0, MAX_LINES + 10).join('\n'));

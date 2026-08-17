#!/usr/bin/env node
/**
 * SessionStart — injeta o estado real do repositório no início da sessão.
 *
 * Poucas linhas, alto valor: evita que o agente comece supondo branch, supondo que os
 * mapas estão em dia, ou sem saber que o submódulo está sujo. Tudo aqui é barato de
 * obter e caro de descobrir errado.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: repo, encoding: 'utf8' });
  return (r.stdout || '').trim();
};

const lines = [];

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const head = run('git', ['log', '-1', '--format=%h %s']);
if (branch) lines.push(`branch: ${branch} — ${head}`);

const dirty = run('git', ['status', '--porcelain']).split('\n').filter(Boolean);
if (dirty.length) {
  lines.push(`working tree: ${dirty.length} arquivo(s) modificado(s)`);
  lines.push(...dirty.slice(0, 8).map((d) => `  ${d}`));
  if (dirty.length > 8) lines.push(`  … mais ${dirty.length - 8}`);
} else {
  lines.push('working tree: limpo');
}

const sub = run('git', ['submodule', 'status']);
if (sub) {
  // prefixo '+' = commit diferente do registrado; '-' = não inicializado
  const flag = sub.trim()[0];
  const state = flag === '+' ? '⚠ DIVERGENTE do commit registrado'
    : flag === '-' ? '⚠ NÃO INICIALIZADO — rode git submodule update --init --recursive'
    : 'ok';
  lines.push(`submódulo moonlight-common-c: ${state}`);
}

// mapas em dia?
if (existsSync(join(repo, 'tools/codemap/codemap.mjs'))) {
  const check = spawnSync('node', ['tools/codemap/codemap.mjs', '--check'], {
    cwd: repo, encoding: 'utf8',
  });
  lines.push(
    check.status === 0
      ? 'docs/maps: em dia'
      : '⚠ docs/maps DESATUALIZADO — rode `node tools/codemap/codemap.mjs`',
  );
}

// ambiente de build
const hasSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || existsSync(join(repo, 'local.properties'));
if (!hasSdk) {
  lines.push('⚠ Android SDK ausente — build e testes NÃO podem rodar. Ver docs/guides/setup-ambiente.md');
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `[estado do repo]\n${lines.join('\n')}`,
    },
  }),
);

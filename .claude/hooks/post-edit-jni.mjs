#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write|MultiEdit) — se a edição tocou a fronteira JNI, roda o gate
 * imediatamente e devolve o resultado como contexto.
 *
 * Não bloqueia: informa. O valor está no ciclo de dois segundos — o erro de assinatura
 * aparece agora, e não daqui a vinte minutos como um crash em runtime sem causa aparente.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const file = (payload?.tool_input?.file_path || '').replace(/\\/g, '/');
// O caminho pode chegar absoluto ou relativo à raiz do projeto — não ancore em barra.
const touchesJni =
  /(^|\/)app\/src\/main\/jni\//.test(file) || /MoonBridge\.java$/.test(file);

if (!touchesJni) process.exit(0);

const repo = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync('node', [join(repo, 'tools/codemap/jni-check.mjs')], {
  cwd: repo,
  encoding: 'utf8',
});

const output = `${r.stdout || ''}${r.stderr || ''}`.trim();

// exit 0 = fronteira íntegra; não vale gastar contexto dizendo isso.
if (r.status === 0 && !/problema/i.test(output)) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `[jni-check] A edição em ${file} tocou a fronteira JNI e o gate acusou:\n\n` +
        `${output}\n\n` +
        `Corrija antes de seguir — esse erro compila nos dois lados e só falha em runtime.`,
    },
  }),
);
process.exit(0);

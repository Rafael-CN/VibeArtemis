#!/usr/bin/env node
/**
 * test-hooks.mjs — Testa os hooks de .claude/hooks/.
 *
 * Hook silencioso é indistinguível de hook quebrado: os dois não produzem saída. Sem este
 * teste, um erro de regex passa despercebido e a proteção simplesmente não existe — que é
 * exatamente o modo de falha que já aconteceu aqui (padrões ancorados em `/` deixavam
 * passar todo caminho relativo).
 *
 * Uso: node tools/test-hooks.mjs
 */

import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(REPO, '.claude', 'hooks');

function runHook(hook, payload) {
  const r = spawnSync('node', [join(HOOKS, hook)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, CLAUDE_PROJECT_DIR: REPO },
  });
  return { stdout: (r.stdout || '').trim(), status: r.status };
}

let pass = 0;
let fail = 0;

function check(label, condition, detail = '') {
  if (condition) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.error(`  FALHA ${label}${detail ? ` — ${detail}` : ''}`); }
}

// ------------------------------------------------------- protect-paths

console.log('protect-paths — deve NEGAR:');
const mustDeny = [
  'docs/maps/FILE_INDEX.md',
  'gradlew',
  'gradlew.bat',
  'gradle/wrapper/gradle-wrapper.properties',
  'app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h',
  'app/src/main/jni/moonlight-core/openssl/include/openssl/ssl.h',
  'app/src/main/res/values-pt-rBR/strings.xml',
  'C:\\Users\\x\\Artemis\\docs\\maps\\HOTSPOTS.md',
  '/home/x/Artemis/app/src/main/jni/moonlight-core/libopus/include/opus.h',
];
for (const p of mustDeny) {
  const { stdout } = runHook('protect-paths.mjs', { tool_input: { file_path: p } });
  let decision = null;
  try { decision = JSON.parse(stdout)?.hookSpecificOutput?.permissionDecision; } catch { /* vazio */ }
  check(p, decision === 'deny', stdout ? 'saída inesperada' : 'hook não emitiu nada (permitiu)');
}

console.log('protect-paths — deve PERMITIR:');
const mustAllow = [
  'app/src/main/java/com/limelight/Game.java',
  'app/src/main/res/values/strings.xml',
  'app/src/main/jni/moonlight-core/simplejni.c',
  'app/src/main/jni/moonlight-core/callbacks.c',
  'docs/adr/0003-exemplo.md',
  'build.gradle',
  'tools/codemap/codemap.mjs',
];
for (const p of mustAllow) {
  const { stdout } = runHook('protect-paths.mjs', { tool_input: { file_path: p } });
  check(p, stdout === '', 'hook negou indevidamente');
}

console.log('protect-paths — entrada inválida não pode travar:');
for (const bad of ['', 'nao-e-json', '{}', '{"tool_input":{}}']) {
  const r = spawnSync('node', [join(HOOKS, 'protect-paths.mjs')], {
    input: bad, encoding: 'utf8', cwd: REPO,
  });
  check(`entrada ${JSON.stringify(bad).slice(0, 20)}`, r.status === 0);
}

// ------------------------------------------------------- post-edit-jni

console.log('post-edit-jni — roteamento:');
const jniPaths = [
  'app/src/main/jni/moonlight-core/callbacks.c',
  'app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java',
  'C:\\x\\app\\src\\main\\jni\\moonlight-core\\simplejni.c',
];
// Com a fronteira íntegra o hook é silencioso, então testamos só que ele não quebra
// e que ignora arquivo fora da fronteira.
for (const p of jniPaths) {
  const { status } = runHook('post-edit-jni.mjs', { tool_input: { file_path: p } });
  check(`aceita ${p.slice(-30)}`, status === 0);
}
const { stdout: nonJni } = runHook('post-edit-jni.mjs', {
  tool_input: { file_path: 'app/src/main/java/com/limelight/PcView.java' },
});
check('ignora arquivo não-JNI', nonJni === '');

// ------------------------------------------------------- session-context

console.log('session-context:');
const sc = runHook('session-context.mjs', {});
let ctx = '';
try { ctx = JSON.parse(sc.stdout)?.hookSpecificOutput?.additionalContext || ''; } catch { /* */ }
check('emite contexto', ctx.length > 0);
check('reporta branch', /branch:/.test(ctx));
check('reporta estado dos mapas', /docs\/maps/.test(ctx));

// ------------------------------------------------------- gate-validate

console.log('gate-validate:');
const guard = runHook('gate-validate.mjs', { stop_hook_active: true });
check('respeita stop_hook_active (sem laço)', guard.status === 0);

// -------------------------------------------------------

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);

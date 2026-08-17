#!/usr/bin/env node
/**
 * validate.mjs — Ponto único de verdade do "está pronto?".
 *
 * Chamado pelo hook Stop, pela skill /validate e pelo CI. Ter um só lugar impede que o
 * gate local e o do CI divirjam — o modo de falha clássico é "passa na minha máquina".
 *
 * Estágios em ordem; para no primeiro erro (falhar rápido economiza minutos de Gradle).
 * Grava .claude/.cache/validate.json para que o agente conserte por arquivo sem reler o log.
 *
 *   node tools/validate.mjs             # tudo
 *   node tools/validate.mjs --fast      # só o que não precisa de Android SDK
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(REPO, '.claude', '.cache');
const FAST = process.argv.includes('--fast');
const isWin = process.platform === 'win32';
const gradlew = isWin ? '.\\gradlew.bat' : './gradlew';

/** O build Android exige SDK. Sem ele, dizemos isso em vez de fingir que passou. */
function hasAndroidSdk() {
  if (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT) return true;
  return existsSync(join(REPO, 'local.properties'));
}

const STAGES = [
  {
    name: 'codemap',
    why: 'os mapas em docs/maps/ precisam refletir o código atual',
    cmd: ['node', ['tools/codemap/codemap.mjs', '--check']],
    needsSdk: false,
  },
  {
    name: 'jni',
    why: 'a fronteira JNI não tem checagem em tempo de compilação',
    cmd: ['node', ['tools/codemap/jni-check.mjs']],
    needsSdk: false,
  },
  {
    name: 'build',
    why: 'compilar é o mínimo',
    cmd: [gradlew, [':app:assembleNonRoot_gameDebug', '--console=plain']],
    needsSdk: true,
  },
  {
    name: 'test',
    why: 'regressão de lógica Java',
    cmd: [gradlew, [':app:testNonRoot_gameDebugUnitTest', '--console=plain']],
    needsSdk: true,
  },
];

const result = { ok: true, stage: null, skipped: [], stages: [] };
const sdk = hasAndroidSdk();

for (const s of STAGES) {
  if (FAST && s.needsSdk) { result.skipped.push(s.name); continue; }
  if (s.needsSdk && !sdk) {
    result.skipped.push(s.name);
    console.error(
      `[SKIP] ${s.name} — Android SDK não encontrado (sem ANDROID_HOME nem local.properties).\n` +
      `       Ver docs/guides/setup-ambiente.md. NÃO afirme que o build passa.`,
    );
    continue;
  }

  const [bin, args] = s.cmd;
  process.stdout.write(`[....] ${s.name} — ${s.why}\n`);
  // shell só para o wrapper .bat do Gradle; com `node` ele é desnecessário e o Node
  // avisa que concatenar argumentos sob shell é inseguro.
  const needsShell = isWin && bin.endsWith('.bat');
  const r = spawnSync(bin, args, { cwd: REPO, encoding: 'utf8', shell: needsShell });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0;

  result.stages.push({ name: s.name, ok, code: r.status });

  if (ok) {
    console.log(`[ OK ] ${s.name}`);
    continue;
  }

  result.ok = false;
  result.stage = s.name;
  // Só as linhas úteis: erros de compilação e falhas de teste.
  result.failures = output
    .split('\n')
    .filter((l) => /error:|FAILED|FAILURE:|\[C\d\]|\[S\d\]|\[T\d\]|Exception|desatualizad/i.test(l))
    .slice(0, 40);

  console.error(`[FAIL] ${s.name}`);
  console.error(result.failures.join('\n'));
  break;
}

mkdirSync(CACHE, { recursive: true });
writeFileSync(join(CACHE, 'validate.json'), JSON.stringify(result, null, 1));

if (result.skipped.length) {
  console.error(
    `\n⚠ Estágios não executados: ${result.skipped.join(', ')}. ` +
    `O resultado é PARCIAL — declare isso ao reportar.`,
  );
}

if (!result.ok) {
  console.error(
    '\nProibido para ficar verde: @Ignore, enfraquecer assert, suprimir lint ou apagar teste.\n' +
    'Conserte a causa.',
  );
  process.exit(1);
}

console.log(result.skipped.length ? '\nvalidate: passou (parcial).' : '\nvalidate: passou.');

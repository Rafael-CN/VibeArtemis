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
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
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

/**
 * Acha um JDK utilizável quando `JAVA_HOME` não está definido no ambiente.
 *
 * O AGP 8.13 não aceita qualquer versão: o JBR que vem com o Android Studio é o JDK 25,
 * novo demais. Por isso preferimos um JDK 17–21 instalado e só caímos no JBR como último
 * recurso — melhor tentar e falhar com mensagem clara do que não tentar.
 */
function resolveJavaHome() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;

  const candidates = [];
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  for (const vendor of ['Java', 'Eclipse Adoptium', 'Microsoft', 'Amazon Corretto']) {
    const dir = join(programFiles, vendor);
    if (!existsSync(dir)) continue;
    try {
      for (const entry of readdirSync(dir)) {
        const m = entry.match(/-(\d+)/);
        const major = m ? parseInt(m[1], 10) : null;
        if (major && major >= 17 && major <= 21) candidates.push({ path: join(dir, entry), major });
      }
    } catch { /* diretório ilegível, segue */ }
  }
  candidates.sort((a, b) => b.major - a.major);
  if (candidates.length) return candidates[0].path;

  const jbr = join(programFiles, 'Android', 'Android Studio', 'jbr');
  return existsSync(jbr) ? jbr : null;
}

/**
 * Lê os XML de resultado do Gradle e separa falha nova de falha já conhecida.
 * Os XML são a fonte confiável — o texto do console varia com a versão do Gradle.
 */
function classifyTestFailures() {
  const dir = join(REPO, 'app/build/test-results/testNonRoot_gameDebugUnitTest');
  const baselinePath = join(REPO, 'tools/test-baseline.json');
  const baseline = existsSync(baselinePath)
    ? new Set(JSON.parse(readFileSync(baselinePath, 'utf8')).knownFailures.map((k) => k.test))
    : new Set();

  const failed = [];
  if (existsSync(dir)) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.xml'))) {
      const xml = readFileSync(join(dir, file), 'utf8');
      // Fatiar por <testcase é mais confiável que casar o elemento inteiro com regex:
      // testcases que passam vêm self-closing (`/>`), e uma alternância `/>|>...</testcase>`
      // atravessa o elemento seguinte, atribuindo a falha ao teste errado.
      const chunks = xml.split('<testcase ').slice(1);
      for (const chunk of chunks) {
        const body = chunk.split('</testcase>')[0];
        // Só conta se o <failure>/<error> vier antes do fim DESTE testcase.
        const selfClosingAt = chunk.search(/\/>/);
        const failureAt = body.search(/<(failure|error)\b/);
        if (failureAt === -1) continue;
        if (selfClosingAt !== -1 && selfClosingAt < failureAt) continue;

        const name = chunk.match(/name="([^"]*)"/)?.[1];
        const cls = chunk.match(/classname="([^"]*)"/)?.[1];
        if (name && cls) failed.push(`${cls}#${name}`);
      }
    }
  }

  return {
    newFailures: failed.filter((t) => !baseline.has(t)),
    known: failed.filter((t) => baseline.has(t)),
  };
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
const javaHome = resolveJavaHome();

if (sdk && !javaHome) {
  console.error(
    '[AVISO] SDK presente mas nenhum JDK 17–21 encontrado. O Gradle vai falhar ou usar\n' +
    '        uma versão incompatível. Ver docs/guides/setup-ambiente.md.',
  );
}
if (javaHome && javaHome !== process.env.JAVA_HOME) {
  console.log(`[info] JAVA_HOME resolvido para ${javaHome}`);
}

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
  // O wrapper .bat exige shell no Windows. Passar args separados COM shell faz o Node
  // avisar que a concatenação é insegura, então concatenamos nós mesmos — os argumentos
  // aqui são literais deste arquivo, não entrada do usuário.
  const needsShell = isWin && bin.endsWith('.bat');
  const cmd = needsShell ? `${bin} ${args.join(' ')}` : bin;
  const r = spawnSync(cmd, needsShell ? [] : args, {
    cwd: REPO,
    encoding: 'utf8',
    shell: needsShell,
    env: javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env,
  });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0;

  result.stages.push({ name: s.name, ok, code: r.status });

  if (ok) {
    console.log(`[ OK ] ${s.name}`);
    continue;
  }

  // O estágio de teste é especial: a suíte já vinha com falhas do upstream. Reprovar
  // por elas tornaria a definição de pronto inalcançável e treinaria todo mundo a
  // ignorar o gate. Reprovamos só o que é NOVO.
  if (s.name === 'test') {
    const { newFailures, known } = classifyTestFailures();
    result.knownFailures = known;
    result.failures = newFailures;
    if (!newFailures.length) {
      console.log(`[ OK ] test — ${known.length} falha(s) preexistente(s), nenhuma nova`);
      continue;
    }
    result.ok = false;
    result.stage = s.name;
    console.error(`[FAIL] test — ${newFailures.length} falha(s) NOVA(S):`);
    for (const f of newFailures) console.error(`  ${f}`);
    console.error(`\n(${known.length} falha(s) preexistente(s) ignorada(s) — ver tools/test-baseline.json)`);
    break;
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

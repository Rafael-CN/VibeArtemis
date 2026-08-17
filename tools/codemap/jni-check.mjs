#!/usr/bin/env node
/**
 * jni-check.mjs — Gate de integridade da fronteira JNI.
 *
 * A JNI não tem verificação em tempo de compilação. Um descritor errado em
 * `GetStaticMethodID` compila nos dois lados e só falha em runtime, normalmente como um
 * `NoSuchMethodError` no meio do stream. Este script pega isso em dois segundos.
 *
 * Verifica três coisas:
 *   1. Todo método `native` em Java tem um símbolo `Java_*` em C.
 *   2. Todo símbolo `Java_*` em C tem o `native` correspondente em Java.
 *   3. Todo descritor em `GetStaticMethodID`/`GetMethodID` bate com a assinatura real
 *      do método Java que ele referencia (a direção C→Java, que é a que quebra calada).
 *
 * Uso: node tools/codemap/jni-check.mjs        (exit 1 se houver divergência)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRIDGE = join(REPO, 'app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java');
const JNI_DIR = join(REPO, 'app/src/main/jni/moonlight-core');
const SHADOW = join(REPO, 'app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java');

const problems = [];
const fail = (rule, where, msg) => problems.push({ rule, where, msg });

// -------------------------------------------------- descritores JNI

const PRIMITIVES = {
  void: 'V', boolean: 'Z', byte: 'B', char: 'C', short: 'S',
  int: 'I', long: 'J', float: 'F', double: 'D',
};

const OBJECTS = {
  String: 'Ljava/lang/String;',
  Object: 'Ljava/lang/Object;',
};

/** Converte um tipo Java no seu descritor JNI. Retorna null se desconhecido. */
function descriptor(javaType) {
  let t = javaType.trim().replace(/^final\s+/, '');
  let arrays = 0;
  while (t.endsWith('[]')) { arrays++; t = t.slice(0, -2).trim(); }
  const base = PRIMITIVES[t] || OBJECTS[t] || null;
  return base === null ? null : '['.repeat(arrays) + base;
}

/** Monta o descritor completo "(args)ret" de um método Java. */
function methodDescriptor(params, returns) {
  const parts = params.trim() === '' ? [] : splitParams(params);
  const args = [];
  for (const p of parts) {
    // "byte[] decodeUnitData" -> tipo é tudo menos o último token
    const tokens = p.trim().split(/\s+/);
    const type = tokens.slice(0, -1).join(' ') || tokens[0];
    const d = descriptor(type);
    if (d === null) return null;
    args.push(d);
  }
  const r = descriptor(returns);
  if (r === null) return null;
  return `(${args.join('')})${r}`;
}

/** Divide a lista de parâmetros respeitando genéricos. */
function splitParams(s) {
  const out = [];
  let depth = 0, cur = '';
  for (const c of s) {
    if (c === '<') depth++;
    if (c === '>') depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// -------------------------------------------------- coleta

if (!existsSync(BRIDGE)) {
  console.error(`jni-check: não encontrei ${BRIDGE}`);
  process.exit(1);
}

const bridgeSrc = readFileSync(BRIDGE, 'utf8');

// Métodos native declarados em Java. A visibilidade é livre de propósito: um native pode
// ser `private` e ficar atrás de um wrapper público — é o caso de sendUtf8TextBytes, que
// existe para receber bytes já em UTF-8 real em vez de um jstring.
const nativeMethods = new Map();
for (const m of bridgeSrc.matchAll(
  /^\s*(?:public|private|protected\s+)?\s*static\s+native\s+([\w.<>\[\]]+)\s+(\w+)\s*\(([^)]*)\)/gm,
)) {
  nativeMethods.set(m[2], { returns: m[1], params: m[3] });
}

// métodos estáticos Java que o C chama de volta (bridge*)
const javaCallbacks = new Map();
for (const m of bridgeSrc.matchAll(
  /^\s*(?:public|private|protected\s+)?\s*static\s+(?!native)([\w.<>\[\]]+)\s+(bridge\w+)\s*\(([^)]*)\)/gm,
)) {
  javaCallbacks.set(m[2], { returns: m[1], params: m[3] });
}

// lado C
const cFiles = readdirSync(JNI_DIR).filter((f) => f.endsWith('.c')).map((f) => join(JNI_DIR, f));
const cExports = new Map();
const cMethodIds = [];

for (const f of cFiles) {
  const src = readFileSync(f, 'utf8');
  const name = f.split(/[\\/]/).pop();

  for (const m of src.matchAll(/^[ \t]*(Java_\w+)[ \t]*\(/gm)) {
    const simple = m[1].split('_').pop();
    cExports.set(m[1], { file: name, line: src.slice(0, m.index).split('\n').length, simple });
  }

  for (const m of src.matchAll(
    /Get(?:Static)?MethodID\s*\(\s*env\s*,\s*\w+\s*,\s*"(\w+)"\s*,\s*"([^"]+)"/g,
  )) {
    cMethodIds.push({
      method: m[1], descriptor: m[2], file: name,
      line: src.slice(0, m.index).split('\n').length,
    });
  }
}

// -------------------------------------------------- verificações

// (1) native Java sem símbolo C
for (const [name, sig] of nativeMethods) {
  const expected = `Java_com_limelight_nvstream_jni_MoonBridge_${name.replace(/_/g, '_1')}`;
  const found = [...cExports.keys()].some((k) => k === expected || k.endsWith(`_${name}`));
  if (!found) {
    fail('S1', `MoonBridge.java :: ${name}`,
      `método native sem implementação C. Esperado símbolo ${expected} em app/src/main/jni/moonlight-core/*.c`);
  }
  void sig;
}

// (2) símbolo C órfão
for (const [sym, info] of cExports) {
  if (!sym.includes('MoonBridge')) continue;
  const simple = sym.replace(/^Java_com_limelight_nvstream_jni_MoonBridge_/, '').replace(/_1/g, '_');
  if (!nativeMethods.has(simple)) {
    fail('S2', `${info.file}:${info.line}`,
      `símbolo C órfão "${sym}" — nenhum método native "${simple}" em MoonBridge.java`);
  }
}

// (3) descritor de callback C→Java divergente
for (const id of cMethodIds) {
  const java = javaCallbacks.get(id.method) || nativeMethods.get(id.method);
  if (!java) {
    fail('C1', `${id.file}:${id.line}`,
      `C referencia o método Java "${id.method}", que não existe em MoonBridge.java`);
    continue;
  }
  const expected = methodDescriptor(java.params, java.returns);
  if (expected === null) {
    fail('C2', `${id.file}:${id.line}`,
      `não consegui derivar o descritor de "${id.method}" (tipo não mapeado em jni-check.mjs). Confira à mão.`);
    continue;
  }
  if (expected !== id.descriptor) {
    fail('C3', `${id.file}:${id.line}`,
      `descritor divergente para "${id.method}": C diz "${id.descriptor}", Java exige "${expected}". ` +
      `Isso compila nos dois lados e crasha em runtime.`);
  }
}

// (4) o shadow de teste precisa continuar neutralizando o carregamento da lib nativa.
// Ele NÃO stuba método a método: sobrescreve o inicializador estático para que
// System.loadLibrary nunca rode sob Robolectric. Se isso sumir, a suíte inteira
// quebra com UnsatisfiedLinkError e a causa não é óbvia no relatório do Gradle.
if (existsSync(SHADOW)) {
  const shadowSrc = readFileSync(SHADOW, 'utf8');
  if (!shadowSrc.includes('__staticInitializer__')) {
    fail('T1', 'ShadowMoonBridge.java',
      'o shadow não sobrescreve mais __staticInitializer__. Sem isso o Robolectric tenta ' +
      'carregar a lib nativa e toda a suíte falha com UnsatisfiedLinkError.');
  }
} else {
  fail('T1', 'app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java',
    'shadow ausente. Os testes Robolectric dependem dele para não carregar a lib nativa.');
}

// -------------------------------------------------- relatório

const counts = { total: nativeMethods.size, c: cExports.size, callbacks: javaCallbacks.size, ids: cMethodIds.length };
console.log(
  `jni-check: ${counts.total} métodos native · ${counts.c} símbolos C · ` +
  `${counts.callbacks} callbacks Java · ${counts.ids} descritores verificados`,
);

if (!problems.length) {
  console.log('jni-check: fronteira íntegra.');
  process.exit(0);
}

// T1 é aviso, não bloqueio: shadows incompletos só afetam testes que toquem o método.
const blocking = problems.filter((p) => p.rule !== 'T1');
const warnings = problems.filter((p) => p.rule === 'T1');

if (warnings.length) {
  console.log(`\n${warnings.length} aviso(s):`);
  for (const w of warnings) console.log(`  [${w.rule}] ${w.where}\n        ${w.msg}`);
}

if (blocking.length) {
  console.error(`\n${blocking.length} problema(s) bloqueante(s):`);
  for (const p of blocking) console.error(`  [${p.rule}] ${p.where}\n        ${p.msg}`);
  process.exit(1);
}

process.exit(0);

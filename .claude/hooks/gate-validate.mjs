#!/usr/bin/env node
/**
 * Stop — impede que a sessão termine declarando pronto o que não passou no gate.
 *
 * Ressalva honesta: o harness sobrescreve este hook após bloqueios consecutivos. Ele
 * reduz o falso "terminei", não elimina. A prova final continua sendo a saída colada.
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// Sem esta guarda o hook entra em laço consigo mesmo.
if (payload?.stop_hook_active === true) process.exit(0);

const repo = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Só vale a pena validar se código de fato mudou.
const status = spawnSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' });
const changed = (status.stdout || '')
  .split('\n')
  .filter((l) => /\.(java|c|h|mk|xml|gradle)$/.test(l.trim()));

if (!changed.length) process.exit(0);

if (!existsSync(join(repo, 'tools/validate.mjs'))) process.exit(0);

const r = spawnSync('node', [join(repo, 'tools/validate.mjs')], {
  cwd: repo,
  encoding: 'utf8',
});

if (r.status === 0) process.exit(0);

const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
process.stderr.write(
  `O gate de validação falhou — a mudança ainda não está pronta.\n\n${out}\n\n` +
  `Conserte a causa. Proibido para ficar verde: @Ignore, enfraquecer assert, ` +
  `suprimir lint ou apagar teste.\n` +
  `Se o gate não puder rodar neste ambiente, diga isso ao usuário explicitamente ` +
  `em vez de declarar a tarefa concluída.`,
);
process.exit(2);

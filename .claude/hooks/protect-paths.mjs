#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write|MultiEdit) — bloqueia escrita em caminhos que não devem ser
 * editados à mão. Avisar não basta: sem bloqueio, o agente edita assim mesmo.
 *
 * Cada bloqueio explica qual é o caminho correto, senão o agente fica preso tentando
 * variações da mesma coisa.
 */

import { readFileSync } from 'node:fs';

let input = '';
try {
  input = readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(input);
} catch {
  process.exit(0); // entrada inesperada nunca deve travar a sessão
}

// O caminho pode chegar absoluto ou relativo à raiz do projeto. Os padrões abaixo usam
// `(^|/)` em vez de `/` justamente por isso — ancorar em barra deixa passar tudo que vem
// relativo, que é o caso mais comum.
const file = (payload?.tool_input?.file_path || '').replace(/\\/g, '/');
if (!file) process.exit(0);

const RULES = [
  {
    match: /(^|\/)moonlight-common-c\//,
    reason:
      'moonlight-common-c é um submódulo git. Edições aqui somem no próximo ' +
      '`git submodule update`, ou ficam como gitlink sujo e o build diverge em outra ' +
      'máquina. Estenda pelo lado Java ou por moonlight-core/callbacks.c. Se a correção ' +
      'pertence mesmo ao protocolo, abra PR no repositório do submódulo.',
  },
  {
    match: /(^|\/)(libopus|openssl|enet|reedsolomon)\//,
    reason:
      'Biblioteca vendorizada. OpenSSL e libopus entram pré-compiladas como .a por ABI — ' +
      'editar o header não muda o binário e cria divergência entre compilador e linker.',
  },
  {
    match: /(^|\/)docs\/maps\//,
    reason:
      'docs/maps/ é gerado. Edite o gerador em tools/codemap/codemap.mjs e rode ' +
      '`node tools/codemap/codemap.mjs`. Uma edição manual aqui é revertida na próxima ' +
      'geração e faz `--check` falhar.',
  },
  {
    match: /(^|\/)res\/values-[a-zA-Z]/,
    reason:
      'Traduções vêm de contribuidores. Adicione a string apenas em res/values/strings.xml; ' +
      'o lint.xml já desativa MissingTranslation por isso.',
  },
  {
    match: /(^|\/)gradle\/wrapper\/|(^|\/)gradlew(\.bat)?$/,
    reason:
      'O wrapper do Gradle fixa a versão do build. Trocá-lo é decisão de projeto — ' +
      'escreva um ADR em docs/adr/ antes.',
  },
];

for (const rule of RULES) {
  if (rule.match.test(file)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `[protect-paths] ${file}\n\n${rule.reason}`,
        },
      }),
    );
    process.exit(0);
  }
}

process.exit(0);

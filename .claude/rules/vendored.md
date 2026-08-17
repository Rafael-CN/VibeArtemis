---
paths:
  - "**/moonlight-common-c/**"
  - "**/libopus/**"
  - "**/openssl/**"
  - "**/enet/**"
  - "**/reedsolomon/**"
---

# Você está em código de terceiros. Provavelmente não deve editar.

**`moonlight-common-c/` é um submódulo git** apontando para `ClassicOldSong/moonlight-common-c`.
Editar aqui tem duas consequências ruins e nenhuma boa:

1. A alteração some no próximo `git submodule update`.
2. Ou pior — fica registrada como gitlink sujo, e o build de outra máquina passa a divergir
   silenciosamente do seu.

`libopus/`, `openssl/`, `enet/` e `reedsolomon/` são bibliotecas vendorizadas. OpenSSL e
libopus entram **pré-compiladas** como `.a` por ABI; o fonte que você vê são só headers.
Editar o header sem recompilar a lib produz divergência entre o que o compilador acredita e
o que o linker entrega.

## O que fazer em vez disso

| Você quer | Faça |
|---|---|
| mudar comportamento do protocolo | estenda pelo lado Java, ou por `moonlight-core/callbacks.c` |
| corrigir bug real no common-c | PR no repositório do submódulo, depois bump do ponteiro |
| entender a API | leia `moonlight-common-c/src/Limelight.h` (978 linhas) — leitura é livre |
| atualizar a lib | `git -C <submódulo> fetch && git checkout <sha>`, e commite o ponteiro |

Ler é sempre permitido e muitas vezes necessário. A restrição é sobre **escrita**.

Se você concluiu que precisa mesmo editar aqui, isso é uma decisão de arquitetura: escreva
um ADR em `docs/adr/` e confirme com o dono do fork antes.

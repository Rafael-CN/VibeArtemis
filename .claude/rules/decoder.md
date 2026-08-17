---
paths:
  - "app/src/main/java/com/limelight/binding/video/**"
---

# Decodificação de vídeo — não otimize sem medir

A regra existe por um caso concreto deste domínio: **habilitar frame pacing no Android
aumenta a latência de entrada, e o aumento não aparece nas estatísticas de performance do
próprio app.** Um raciocínio plausível aqui produz piora invisível.

Nenhuma mudança de decoder sem número antes e depois. Use o subagente
`stream-latency-analyst`, que reporta p50/p95/p99 e separa jitter da média.

## Leia primeiro

`decoder-errata.txt`, na raiz do repositório. É a errata acumulada de comportamento de
decoder por dispositivo. Referencie-a; não a copie para outro lugar — duas cópias divergem.

## Realidades da plataforma

- `FEATURE_LowLatency` **não** é universal. Presença da constante não significa suporte real.
- Perfis baseline e constrained-high existem por causa de B-frames em decoders específicos.
- Parâmetros de fornecedor usam a forma `vendor.<extensão>.<parâmetro>` e falham em
  silêncio quando o dispositivo não os conhece.
- `MediaCodecHelper.java` (1.196 linhas) concentra blacklists e quirks por SoC. Um device
  novo com problema quase sempre significa uma entrada nova ali, não uma refatoração.

## Métricas disponíveis

`MoonBridge.getPendingVideoFrames()` e `getPendingAudioDuration()` dão profundidade de fila.
O overlay de performance do app expõe parte disso; ele não é completo, e essa incompletude
é justamente o que esconde a regressão de frame pacing.

## Ao adicionar um quirk

Registre a evidência: modelo do dispositivo, versão do Android, SoC, e o comportamento
observado. Quirk sem evidência vira dívida permanente — ninguém depois consegue avaliar se
ainda é necessário.

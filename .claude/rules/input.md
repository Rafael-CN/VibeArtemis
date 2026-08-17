---
paths:
  - "app/src/main/java/com/limelight/binding/input/**"
  - "app/src/main/java/com/limelight/ui/StreamView.java"
  - "app/src/main/java/com/limelight/ui/StreamContainer.java"
---

# Entrada — o subsistema com a dor aberta do fork

Considere delegar ao subagente `android-input-specialist`, que carrega o caminho completo
do evento e os fatos já verificados.

## Antes de editar

`ControllerHandler.java` tem 3.473 linhas e 72 métodos; `Game.java` tem 4.349. Convenções
variam entre regiões do mesmo arquivo — **leia o método vizinho** antes de escrever o seu.

Mapeamento de botão ou tecla vai em tabela existente, não em uma nova cadeia de `if`.
`KeyMapper.java` já são 1.077 linhas de tabela; adicionar uma linha lá é o caminho certo.

`app/src/main/java/com/limelight/binding/input/evdev/` só existe no flavor **`root`**
(`maxSdk 25`). Código que dependa dele não pode estar no caminho comum.

## Armadilhas concretas

- `KeyEvent.getRepeatCount() > 0` significa repetição por tecla presa. `Game.java` descarta
  esses eventos no caminho de teclado; se você adicionar caminho novo, decida explicitamente.
- Modificador pode **ficar preso** quando a janela perde foco com a tecla pressionada.
  Existe tratamento de foco em `StreamView.onWindowFocusChanged()`.
- Teclado da Samsung consome `Shift+Space` — por isso `onKeyPreIme()` existe, para
  interceptar antes do IME. Não remova essa interceptação achando que é redundante.
- Dispositivo sem mapeamento conhecido cai no caminho não-normalizado
  (`MoonBridge.SS_KBE_FLAG_NON_NORMALIZED`). Verifique com
  `keyboardTranslator.hasNormalizedMapping()`.
- O pacote `virtual_controller/keyboard/` é um **overlay de botões arrastáveis**, não um
  teclado de sistema. Não confunda os dois ao planejar trabalho de digitação.

## Se você vai mexer em janela ou insets

O teclado sobrepondo o stream não é bug de `windowSoftInputMode` isolado. É a interação
entre ele e `FLAG_FULLSCREEN` + `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` em `Game.java`. Leia
`docs/epics/E01-teclado-anydesk.md` antes de mudar qualquer flag — a análise já foi feita.

Toda mudança de flag de janela precisa ser avaliada contra: modo imersivo, notch/cutout,
display externo, modo retrato e o overlay de controle virtual.

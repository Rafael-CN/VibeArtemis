---
paths:
  - "app/src/main/java/com/limelight/preferences/**"
  - "app/src/main/java/com/limelight/profiles/**"
  - "app/src/main/res/xml/**"
---

# Preferências e perfis — quatro lugares, não um

`PreferenceConfiguration.java` é o arquivo mais dependido do repositório (fan-in 33). Uma
preferência incompleta quebra em toda parte, e normalmente só na primeira execução após
atualizar — quando o valor salvo ainda não existe.

## Toda preferência nova exige os quatro

1. **Chave e widget** em `app/src/main/res/xml/preferences.xml`
2. **Constante e default** em `PreferenceConfiguration.java` — o par
   `private static final String CHECKBOX_X` + `DEFAULT_X`
3. **Leitura** no `readPreferences()`, com o default como fallback do `getBoolean`/`getInt`
4. **Entrada no perfil**, em `profiles/` — este é o passo esquecido com mais frequência, e
   o sintoma é a preferência funcionar globalmente mas ignorar o perfil por host

## Strings

Vão em `res/values/strings.xml`, nunca no código. O app tem cerca de 20 traduções; string
hardcoded é invisível para todas elas.

**Não edite `res/values-*/strings.xml`** (as traduções). Elas vêm de contribuidores. Adicione
só em `values/` — o `lint.xml` já desativa `MissingTranslation` justamente por isso.

Duas exceções, ambas de manutenção e nenhuma delas altera texto traduzido:

- **Remover string órfã** — uma chave que existe só num locale e não no `values/` padrão
  não é traduzível por ninguém e o lint a reporta como `ExtraTranslation`, severidade
  Fatal. Havia doze delas em `values-ru`, restos de uma feature que nunca chegou.
- **Corrigir marcação técnica** — atributos como `formatted="false"` corrigem como o
  Android interpreta a string, não o que ela diz.

Fora esses dois casos, mudança em tradução é trabalho de tradutor.

## Migração

Renomear ou remover uma chave deixa o valor antigo órfão em `SharedPreferences`. Se o tipo
mudar (por exemplo boolean para string), a leitura lança `ClassCastException` no
dispositivo de quem atualiza. Prefira chave nova a chave reinterpretada.

## Verificação

```bash
node tools/codemap/query.mjs --callers PreferenceConfiguration
```

Mostra os 33 arquivos afetados. Vale conferir se algum deles assume o valor antigo.

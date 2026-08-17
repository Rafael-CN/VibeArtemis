<!-- GERADO POR tools/codemap/codemap.mjs — NÃO EDITE À MÃO. Rode: node tools/codemap/codemap.mjs -->

# Grafo de Dependências

> Acoplamento entre pacotes, derivado dos imports `com.limelight.*`. Use para prever o raio de impacto de uma mudança.

## Pacotes por centralidade

| Pacote | PageRank | Arquivos | Linhas |
|---|--:|--:|--:|
| `com.limelight` | 231.6 | 20 | 9132 |
| `com.limelight.utils` | 104.8 | 22 | 5726 |
| `com.limelight.nvstream.http` | 104.4 | 6 | 1678 |
| `com.limelight.nvstream.jni` | 71.6 | 1 | 445 |
| `com.limelight.preferences` | 53.6 | 10 | 3052 |
| `com.limelight.nvstream` | 51.6 | 4 | 950 |
| `com.limelight.nvstream.av.audio` | 36.7 | 1 | 16 |
| `com.limelight.nvstream.av.video` | 31.7 | 1 | 22 |
| `com.limelight.profiles` | 26.1 | 8 | 1016 |
| `com.limelight.nvstream.input` | 25.8 | 3 | 51 |
| `com.limelight.computers` | 21.7 | 7 | 1598 |
| `com.limelight.ui` | 21.2 | 8 | 803 |
| `com.limelight.binding.input` | 19.6 | 5 | 4304 |
| `com.limelight.nvstream.mdns` | 15.1 | 5 | 733 |
| `com.limelight.binding.input.capture` | 14.9 | 6 | 403 |
| `com.limelight.binding.video` | 14.9 | 5 | 3735 |
| `com.limelight.binding` | 14.1 | 1 | 15 |
| `com.limelight.binding.input.virtual_controller.keyboard` | 13.7 | 12 | 4198 |
| `com.limelight.binding.input.evdev` | 13.7 | 6 | 627 |
| `com.limelight.binding.input.touch` | 13.4 | 4 | 1092 |
| `com.limelight.grid.assets` | 12.5 | 5 | 709 |
| `com.limelight.binding.audio` | 11.6 | 1 | 234 |
| `com.limelight.binding.crypto` | 11.6 | 1 | 260 |
| `com.limelight.binding.input.driver` | 11.4 | 8 | 1695 |
| `com.limelight.binding.input.virtual_controller` | 10.3 | 13 | 2815 |
| `com.limelight.grid` | 10.2 | 3 | 366 |
| `com.limelight.nvstream.wol` | 10.2 | 1 | 150 |
| `com.limelight.discovery` | 7.8 | 1 | 91 |
| `com.limelight.nvstream.av` | 7.0 | 1 | 58 |
| `com.limelight.shadows` | 7.0 | 3 | 72 |

## Mapa de dependências (Mermaid)

Arestas com peso >= 3 (número de imports distintos entre os pacotes).

```mermaid
graph LR
  cl["cl"] -->|34| cl_utils["cl.utils"]
  cl_utils["cl.utils"] -->|24| cl["cl"]
  cl["cl"] -->|15| cl_nvstream_http["cl.nvstream.http"]
  cl_preferences["cl.preferences"] -->|14| cl["cl"]
  cl_profiles["cl.profiles"] -->|14| cl["cl"]
  cl_computers["cl.computers"] -->|13| cl_nvstream_http["cl.nvstream.http"]
  cl["cl"] -->|12| cl_preferences["cl.preferences"]
  cl["cl"] -->|11| cl_profiles["cl.profiles"]
  cl_binding_input_virtual_controller_keyboard["cl.binding.input.virtual_controller.keyboard"] -->|11| cl["cl"]
  cl_preferences["cl.preferences"] -->|10| cl_utils["cl.utils"]
  cl_utils["cl.utils"] -->|9| cl_nvstream_http["cl.nvstream.http"]
  cl_nvstream["cl.nvstream"] -->|8| cl_nvstream_http["cl.nvstream.http"]
  cl["cl"] -->|7| cl_computers["cl.computers"]
  cl["cl"] -->|7| cl_ui["cl.ui"]
  cl_binding_input_driver["cl.binding.input.driver"] -->|7| cl["cl"]
  cl["cl"] -->|6| cl_binding_input["cl.binding.input"]
  cl_binding_input_virtual_controller["cl.binding.input.virtual_controller"] -->|6| cl["cl"]
  cl_grid["cl.grid"] -->|6| cl["cl"]
  cl_binding_input["cl.binding.input"] -->|5| cl["cl"]
  cl_binding_input_virtual_controller["cl.binding.input.virtual_controller"] -->|5| cl_preferences["cl.preferences"]
  cl_binding_input_virtual_controller["cl.binding.input.virtual_controller"] -->|5| cl_nvstream_input["cl.nvstream.input"]
  cl_binding_input_virtual_controller_keyboard["cl.binding.input.virtual_controller.keyboard"] -->|5| cl_preferences["cl.preferences"]
  cl_discovery["cl.discovery"] -->|5| cl_nvstream_mdns["cl.nvstream.mdns"]
  cl_utils["cl.utils"] -->|5| cl_preferences["cl.preferences"]
  cl["cl"] -->|4| cl_binding_input_touch["cl.binding.input.touch"]
  cl["cl"] -->|4| cl_binding_video["cl.binding.video"]
  cl_binding_input_driver["cl.binding.input.driver"] -->|4| cl_nvstream_jni["cl.nvstream.jni"]
  cl_binding_input_driver["cl.binding.input.driver"] -->|4| cl_nvstream_input["cl.nvstream.input"]
  cl_binding_input_virtual_controller_keyboard["cl.binding.input.virtual_controller.keyboard"] -->|4| cl_binding_input_virtual_controller["cl.binding.input.virtual_controller"]
  cl_binding_input_virtual_controller_keyboard["cl.binding.input.virtual_controller.keyboard"] -->|4| cl_utils["cl.utils"]
  cl_binding_video["cl.binding.video"] -->|4| cl["cl"]
  cl_computers["cl.computers"] -->|4| cl["cl"]
  cl_grid["cl.grid"] -->|4| cl_grid_assets["cl.grid.assets"]
  cl_grid_assets["cl.grid.assets"] -->|4| cl["cl"]
  cl_nvstream_http["cl.nvstream.http"] -->|4| cl["cl"]
  cl_ui["cl.ui"] -->|4| cl["cl"]
  cl["cl"] -->|3| cl_nvstream["cl.nvstream"]
  cl_binding_input["cl.binding.input"] -->|3| cl_binding_input_driver["cl.binding.input.driver"]
  cl_binding_input["cl.binding.input"] -->|3| cl_nvstream_input["cl.nvstream.input"]
  cl_binding_input_capture["cl.binding.input.capture"] -->|3| cl["cl"]
  cl_binding_input_evdev["cl.binding.input.evdev"] -->|3| cl["cl"]
  cl_binding_input_touch["cl.binding.input.touch"] -->|3| cl_nvstream["cl.nvstream"]
  cl_binding_input_touch["cl.binding.input.touch"] -->|3| cl_nvstream_input["cl.nvstream.input"]
  cl_computers["cl.computers"] -->|3| cl_utils["cl.utils"]
  cl_grid["cl.grid"] -->|3| cl_nvstream_http["cl.nvstream.http"]
  cl_grid_assets["cl.grid.assets"] -->|3| cl_nvstream_http["cl.nvstream.http"]
  cl_nvstream_mdns["cl.nvstream.mdns"] -->|3| cl["cl"]
  cl_ui["cl.ui"] -->|3| cl_utils["cl.utils"]
```

## Comunidades detectadas

Agrupamento por label propagation — pacotes que mudam juntos com mais probabilidade.

**Comunidade 1** (28): `com.limelight`, `com.limelight.binding`, `com.limelight.binding.audio`, `com.limelight.binding.crypto`, `com.limelight.binding.input`, `com.limelight.binding.input.capture`, `com.limelight.binding.input.driver`, `com.limelight.binding.input.evdev`, `com.limelight.binding.input.touch`, `com.limelight.binding.input.virtual_controller`, `com.limelight.binding.input.virtual_controller.keyboard`, `com.limelight.binding.video`, `com.limelight.computers`, `com.limelight.discovery`, `com.limelight.grid`, `com.limelight.grid.assets`, `com.limelight.nvstream`, `com.limelight.nvstream.av.audio`, `com.limelight.nvstream.av.video`, `com.limelight.nvstream.http`, `com.limelight.nvstream.input`, `com.limelight.nvstream.jni`, `com.limelight.nvstream.mdns`, `com.limelight.nvstream.wol`, `com.limelight.preferences`, `com.limelight.profiles`, `com.limelight.ui`, `com.limelight.utils`


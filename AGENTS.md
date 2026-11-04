This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Continuidad y Eficiencia de Tokens (Obligatorio)

1. **Protocolo de Continuidad:** Al iniciar sesión o recibir solicitudes de seguimiento, leer primero `ANTIGRAVITY_CONTINUITY.md` y `PROJECT_INDEX.md`. NUNCA realizar escaneos globales ni re-auditar el código desde cero si el estado ya está documentado.
2. **Actualización Obligatoria:** Actualizar siempre `ANTIGRAVITY_CONTINUITY.md` al finalizar cada tarea técnica, indicando archivos modificados y estado de validación (`tsc`/`lint`).
3. **Entorno Windows (PowerShell/CMD):** No usar operadores bash (`&&`, `&`). Usar `;` o comandos independientes. Si PowerShell bloquea scripts por ExecutionPolicy, ejecutar comandos Node con `cmd /c npx <comando>`.
4. **Lecturas Acotadas:** Los archivos de este proyecto superan las 3,000 líneas. NUNCA leer archivos completos de golpe; utilizar `StartLine` y `EndLine` (bloques ≤ 150 líneas) o búsquedas selectivas (`Select-String`).
5. **No Destructividad:** No alterar flujos existentes ni lógica de negocio aprobada sin autorización expresa.


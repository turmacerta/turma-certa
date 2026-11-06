# Turma Certa Mobile (Expo)

App escolar (gestor, professor, aluno/responsável) compartilhando API/Supabase com o web.

## Setup

```bash
cp .env.example .env
# preencha EXPO_PUBLIC_*
npm install   # na raiz do monorepo
npm run dev:mobile
```

Na raiz do monorepo: `npm run dev:mobile`.

> `typedRoutes` fica desligado no monorepo: o `@expo/cli` da raiz não resolve `expo-router/internal/testing` quando o pacote só está em `mobile/node_modules`.

## Build preview

```bash
cd mobile
npx eas-cli build --profile preview --platform all
```

Scheme de deep link: `turmacerta://` (auth callback/reset).

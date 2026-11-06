import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Locale = "pt-BR" | "en";

const messages = {
  "pt-BR": {
    appName: "Turma Certa",
    loading: "Carregando...",
    retry: "Tentar de novo",
    cancel: "Cancelar",
    save: "Salvar",
    back: "Voltar",
    email: "E-mail",
    password: "Senha",
    signIn: "Entrar",
    signUp: "Criar conta",
    signOut: "Sair",
    forgot: "Esqueci a senha",
    fullName: "Nome completo",
    verifyEmail: "Confirmar e-mail",
    code: "Código",
    twoFactor: "Verificação em duas etapas",
    home: "Início",
    schedule: "Agenda",
    classes: "Turmas",
    students: "Alunos",
    teachers: "Professores",
    billing: "Financeiro",
    packages: "Pacotes",
    team: "Equipe",
    settings: "Configurações",
    network: "Rede",
    account: "Conta",
    lessons: "Aulas",
    makeup: "Reposição",
    plan: "Plano",
    empty: "Nada por aqui",
    sessionReplaced: "Sua conta entrou em outro aparelho.",
    onboardingHello: (name: string) => `Oi, ${name}. Como você vai usar o Turma Certa?`,
    ownerTitle: "Sou dono / professor",
    memberTitle: "Sou aluno ou professor convidado",
    waitingInvite: "Aguardando convite da escola no seu e-mail.",
    createSchool: "Criar escola",
    schoolName: "Nome da escola",
    noLessons: "Nenhuma aula nos próximos 14 dias.",
    cancelLesson: "Cancelar aula",
    restoreLesson: "Restaurar aula",
    markPaid: "Marcar pago",
    renew: "Renovar",
  },
  en: {
    appName: "Turma Certa",
    loading: "Loading...",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    forgot: "Forgot password",
    fullName: "Full name",
    verifyEmail: "Verify email",
    code: "Code",
    twoFactor: "Two-step verification",
    home: "Home",
    schedule: "Schedule",
    classes: "Classes",
    students: "Students",
    teachers: "Teachers",
    billing: "Billing",
    packages: "Packages",
    team: "Team",
    settings: "Settings",
    network: "Network",
    account: "Account",
    lessons: "Lessons",
    makeup: "Makeup",
    plan: "Plan",
    empty: "Nothing here",
    sessionReplaced: "Your account signed in on another device.",
    onboardingHello: (name: string) => `Hi, ${name}. How will you use Turma Certa?`,
    ownerTitle: "I run a school or teach",
    memberTitle: "I'm a student or invited teacher",
    waitingInvite: "Waiting for a school invite on your email.",
    createSchool: "Create school",
    schoolName: "School name",
    noLessons: "No lessons in the next 14 days.",
    cancelLesson: "Cancel lesson",
    restoreLesson: "Restore lesson",
    markPaid: "Mark paid",
    renew: "Renew",
  },
} as const;

type Messages = {
  [K in keyof (typeof messages)["pt-BR"]]: (typeof messages)["pt-BR"][K];
};

const I18nContext = createContext<{ locale: Locale; t: Messages; setLocale: (locale: Locale) => void } | null>(null);
const KEY = "tc-mobile-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((value) => {
      if (value === "pt-BR" || value === "en") setLocaleState(value);
    });
  }, []);

  const value = useMemo(
    () => ({
      locale,
      t: messages[locale] as Messages,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        void AsyncStorage.setItem(KEY, next);
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider missing");
  return ctx;
}

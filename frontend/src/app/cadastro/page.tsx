"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field } from "@/components/ui";
import { homeAfterLogin } from "@/lib/auth-redirect";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError("Supabase ainda não está no .env. Veja o README.");
      return;
    }

    setLoading(true);
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    if (data.session) {
      router.replace(await homeAfterLogin());
      return;
    }

    setInfo("Confirme o e-mail se o Supabase estiver pedindo verificação.");
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <BrandMark />
        <h1 className="display mt-6 text-3xl">Criar conta</h1>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <Field
            label="Seu nome"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            label="Senha"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-clay-dark">{error}</p> : null}
          {info ? <p className="text-sm text-forest">{info}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-forest">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}

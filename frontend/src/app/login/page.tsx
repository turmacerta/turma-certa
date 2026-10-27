"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandMark } from "@/components/brand";
import { Button, Card, Field } from "@/components/ui";
import { homeAfterLogin } from "@/lib/auth-redirect";
import { createBrowserSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signError) {
      setError(signError.message);
      return;
    }

    router.replace(searchParams.get("next") || (await homeAfterLogin()));
  }

  return (
    <Card className="w-full max-w-md">
      <BrandMark />
      <h1 className="display mt-6 text-3xl">Entrar</h1>
      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-clay-dark">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-forest">
          Criar agora
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

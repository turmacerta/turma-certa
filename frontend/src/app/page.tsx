import Link from "next/link";
import { BrandMark } from "@/components/brand";

const pains = [
  {
    persona: "Dono / autônomo",
    text: "Parar de gerir turma, falta, reposição e renovação no WhatsApp e na planilha.",
  },
  {
    persona: "Aluno",
    text: "Remarcar rápido, achar horário que cabe e cair numa turma do nível certo.",
  },
  {
    persona: "Professor",
    text: "Montar turmas por nível e ver a agenda na relação aluno <> escola.",
  },
];

const features = [
  "Vagas visíveis em cada turma",
  "Agenda de turma, professor e aluno",
  "Créditos de aula e reposição",
  "Faturamento e fila de renovação",
  "Quadras por unidade",
  "Multi-esporte e divisão por nível",
  "Alerta de vaga para quem tem crédito",
  "Ficha cadastral do aluno",
  "Plano particular e plano de turmas",
];

export default function HomePage() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/login" className="rounded-full px-4 py-2 hover:bg-sand">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-clay px-4 py-2 text-white hover:bg-clay-dark"
          >
            Começar
          </Link>
        </nav>
      </header>

      <section className="court-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">
              SaaS para aulas de esporte
            </p>
            <h1 className="display mt-4 max-w-3xl text-5xl leading-[1.05] text-forest md:text-7xl">
              A turma certa, no horário certo, cobrada em dia.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Turma Certa é o sistema operacional de escolas e professores
              autônomos: enche vaga, encaixa aluno por nível e não deixa
              renovação morrer no grupo da família.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cadastro"
                className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-sand"
              >
                Criar minha escola
              </Link>
              <Link
                href="#planos"
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
              >
                Ver planos
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-line bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-semibold text-forest">Ocupação agora</p>
            {[
              ["Tênis Avançado · Qua 19h", 7, 8],
              ["Vôlei Iniciante · Sáb 10h", 4, 10],
              ["Futsal Sub-12 · Ter 18h", 0, 12],
            ].map(([name, enrolled, capacity]) => (
              <div key={String(name)} className="mt-5">
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="text-muted">
                    {enrolled}/{capacity}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-sand">
                  <div
                    className="h-full rounded-full bg-clay"
                    style={{
                      width: `${(Number(enrolled) / Number(capacity)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="mt-6 rounded-2xl bg-sand px-4 py-3 text-sm">
              Futsal Sub-12 está vazia. 3 alunos com crédito podem ser
              notificados agora.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="display text-4xl text-forest">Para quem dói hoje</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {pains.map((item) => (
            <article
              key={item.persona}
              className="rounded-3xl border border-line bg-white p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
                {item.persona}
              </p>
              <p className="mt-3 text-lg">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="display text-4xl text-forest">O que o MVP entrega</h2>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm"
            >
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="display text-4xl text-forest">Precificação de entrada</h2>
        <p className="mt-3 max-w-2xl text-muted">
          Quem paga é a escola ou o autônomo. O aluno não é o cliente da Turma
          Certa. Um aluno recuperado no mês já paga o software.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-line bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              Autônomo
            </p>
            <p className="display mt-3 text-5xl">R$ 79</p>
            <p className="text-sm text-muted">por mês · 1 professor</p>
            <ul className="mt-6 grid gap-2 text-sm">
              <li>1 unidade</li>
              <li>Até 40 alunos</li>
              <li>Agenda, créditos, vagas e ficha</li>
            </ul>
          </article>
          <article className="rounded-3xl bg-forest p-8 text-sand">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-clay">
              Escola
            </p>
            <p className="display mt-3 text-5xl">R$ 189</p>
            <p className="text-sm text-sand/70">por mês · time de professores</p>
            <ul className="mt-6 grid gap-2 text-sm">
              <li>Várias unidades e quadras</li>
              <li>Até 250 alunos</li>
              <li>Multi-esporte, níveis e renovação</li>
            </ul>
          </article>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-sm text-muted">
        Turma Certa · gestão de aulas de esporte
      </footer>
    </div>
  );
}

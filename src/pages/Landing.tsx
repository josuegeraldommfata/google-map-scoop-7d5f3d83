import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Sparkles,
  ShieldCheck,
  Clock,
  Globe,
  MessageCircle,
  Crown,
  BadgeCheck,
  Check,
  Star,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

type Plan = {
  key: "standard" | "business";
  name: string;
  price: string;
  tagline: string;
  highlight?: boolean;
  bullets: string[];
};

const plans: Plan[] = [
  {
    key: "standard",
    name: "Standard",
    price: "R$ 80,00 / mês",
    tagline: "Prospecção inteligente, sem complicação.",
    bullets: [
      "3 pesquisas por dia · até 300 leads por pesquisa",
      "Exportação da lista em CSV",
      "Disparo individual pelo WhatsApp (clique a clique)",
      "Histórico de buscas e relatórios básicos",
      "Suporte por e-mail",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: "R$ 180,00 / mês",
    tagline: "Para quem precisa de volume e velocidade.",
    highlight: true,
    bullets: [
      "Pesquisas ilimitadas · até 500 leads por pesquisa por dia",
      "Exportação avançada (CSV completo com Instagram e site)",
      "Disparo individual pelo WhatsApp otimizado",
      "Enriquecimento extra (Instagram, e-mail, site)",
      "Relatórios avançados e suporte prioritário",
    ],
  },
];

function SectionTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{kicker}</p>
      <h2 className="font-display text-3xl sm:text-4xl leading-tight text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  // Mock de checkout/cadastro: sem integrar gateway ainda.
  const [loading, setLoading] = useState<null | "standard" | "business">(null);

  const testimonials = useMemo(
    () =>
      [
        {
          name: "Marina S.",
          role: "Clínica Odontológica",
          quote:
            "Eu só colocava nicho e cidade. Em poucos minutos eu já tinha leads qualificados e o robô foi disparando propostas no WhatsApp no ritmo certo — sem eu ficar abrindo conversa um por um.",
          stars: 5,
          photoUrl: "/testimonials/woman1.jpg",
        },
        {
          name: "Rafael T.",
          role: "Advocacia",
          quote:
            "A cadência e o limite de caracteres fizeram toda diferença. A mensagem ficou curta, objetiva e com cara de profissional. Em 48 horas já recebi respostas e agendei reuniões.",
          stars: 5,
          photoUrl: "/testimonials/man1.jpg",
        },
        {
          name: "Carla M.",
          role: "Imobiliária",
          quote:
            "O volume no Business é absurdo (do jeito bom). Eu acompanho o histórico e vejo quais buscas performam melhor. O robô me entregou contatos que realmente geraram visitas ao imóvel.",
          stars: 5,
          photoUrl: "/testimonials/woman2.jpg",
        },
        {
          name: "Diego P.",
          role: "Academia",
          quote:
            "Eu precisava de leads para aula experimental sem perder tempo. O Leads Hunter puxou contatos e o piloto automático iniciou o envio em lote. Resultado: lotou a primeira semana de testes.",
          stars: 5,
          photoUrl: "/testimonials/man2.jpg",
        },
        {
          name: "Fernanda R.",
          role: "Salão de Beleza",
          quote:
            "O template fica perfeito no WhatsApp, sem quebrar linha e sem texto cortado. Eu não fico refazendo mensagem: é só ativar e o sistema segue trabalhando.",
          stars: 5,
          photoUrl: "/testimonials/woman3.jpg",
        },
        {
          name: "Eduardo A.",
          role: "Contabilidade",
          quote:
            "Me surpreendeu a quantidade de leads por campanha. O robô me ajudou a manter presença todo dia. Eu transformei atendimento reativo em processo e minha taxa de retorno subiu.",
          stars: 5,
          photoUrl: "/testimonials/man3.jpg",
        },
        {
          name: "Patrícia L.",
          role: "Clínica Médica",
          quote:
            "A mensagem chega na hora certa e com a proposta bem direcionada. Em vez de perder pacientes por demora, eu comecei a converter mais consultas com envio em lote.",
          stars: 5,
          photoUrl: "/testimonials/woman4.jpg",
        },
        {
          name: "Lucas V.",
          role: "Mecânica",
          quote:
            "O robô não deixa lead esfriar. Eu uso o filtro e priorizo os mais prováveis. Em poucos dias eu já estava com orçamento sendo solicitado via WhatsApp.",
          stars: 5,
          photoUrl: "/testimonials/man4.jpg",
        },
        {
          name: "Gisele N.",
          role: "Pet Shop",
          quote:
            "Eu estava perdendo vendas para concorrentes que respondem rápido. Com o envio automático, eu consigo falar com quem chega no Google Maps e converter em banho, tosa e compra.",
          stars: 5,
          photoUrl: "/testimonials/woman5.jpg",
        },
        {
          name: "Bruno K.",
          role: "Advocacia (família e civil)",
          quote:
            "O que eu gostei foi a consistência. Cada mensagem tem o limite certo e não parece spam. O histórico das buscas me mostra onde tenho mais chance de fechar.",
          stars: 5,
          photoUrl: "/testimonials/man5.jpg",
        },
        {
          name: "Renata C.",
          role: "Imobiliária (locação)",
          quote:
            "A gente quer rapidez e organização. O Leads Hunter trouxe contatos relevantes e o piloto automático mantém o follow-up sem eu precisar ficar no computador.",
          stars: 5,
          photoUrl: "/testimonials/woman6.jpg",
        },
        {
          name: "Thiago S.",
          role: "Psicologia",
          quote:
            "A taxa de resposta melhorou porque a mensagem é objetiva e respeita o limite. Eu configurei e deixei rodar — o sistema seguiu com cadência e eu consegui marcar triagens.",
          stars: 5,
          photoUrl: "/testimonials/man6.jpg",
        },
      ] as const,
    []
  );

  const faqs = useMemo(
    () =>
      [
        {
          q: "O que é o Plano 2 (Robô)?",
          a: "É o envio em lote com QR e sessão do WhatsApp via backend. No mock, a interface funciona para você validar fluxo — depois conectamos à Evolution API.",
        },
        {
          q: "Como funciona o envio de mensagem?",
          a: "Você configura um template e o sistema monta a proposta por lead com limite de caracteres (clamp) para evitar mensagens truncadas ou ruins.",
        },
        {
          q: "Tem risco de eu perder lead?",
          a: "Não. O sistema registra status por campanha (e depois persistimos no banco). A lógica é pensada para reduzir conversas perdidas.",
        },
        {
          q: "Por que 2 dias grátis?",
          a: "Porque você precisa sentir o valor: rodar uma busca, validar a qualidade do lead e testar o fluxo do Robô sem compromisso.",
        },
      ] as const,
    []
  );

  const onPickPlan = async (key: Plan["key"]) => {
    setLoading(key);
    // Simulação de checkout.
    await new Promise((r) => setTimeout(r, 900));
    setLoading(null);
    // Redireciona para login/cadastro (ainda será implementado).
    navigate("/auth/register", { state: { plan: key } });
  };

  return (
    <div className="min-h-screen">
      {/* background editorial */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(124,58,237,.18),transparent_60%),radial-gradient(60%_50%_at_10%_20%,rgba(16,185,129,.10),transparent_55%)]" />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Leads Hunter" className="w-9 h-9 rounded-xl" />
            <div className="leading-tight">
              <p className="font-display text-lg">Leads Hunter</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Prospecção com velocidade
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={() => navigate("/auth/login")}
              className="hidden sm:inline-flex"
            >
              Entrar
            </Button>
            <Button onClick={() => navigate("/auth/register")} className="gap-2">
              Começar grátis <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <Badge className="gap-2 mb-4" variant="secondary">
                <Sparkles className="w-3.5 h-3.5" />
                2 dias GRÁTIS para você validar o fluxo do Robô
              </Badge>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground">
                Prospecção com WhatsApp em lote — sem perder lead.
              </h1>
              <p className="text-muted-foreground mt-4 max-w-xl">
                Busque por nicho e cidade no Google Maps, obtenha leads enriquecidos e envie mensagens com templates e limite inteligente de caracteres.
                Depois, ative o Plano 2 (Robô) para rodar no backend.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button className="h-12 text-base font-semibold glow-primary" onClick={() => navigate("/auth/register")}>
                  Começar grátis
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-base"
                  onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}
                >
                  Ver planos
                </Button>
              </div>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {[{ icon: Zap, t: "Rapidez", d: "Busca e enriquecimento em minutos." }, { icon: ShieldCheck, t: "Qualidade", d: "WhatsApp e site quando disponíveis." }, { icon: Clock, t: "Sem pausa", d: "Robô roda no backend." }, { icon: Globe, t: "Brasil", d: "Foco em leads reais por nicho." }].map(
                  ({ icon: Icon, t, d }) => (
                    <Card key={t} className="p-4 bg-card/70">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{t}</p>
                          <p className="text-sm text-muted-foreground">{d}</p>
                        </div>
                      </div>
                    </Card>
                  )
                )}
              </div>
            </div>

            <div className="lg:col-span-5">
              <Card className="p-5 sm:p-6 rounded-2xl bg-card/70 border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Plano recomendado</p>
                    <p className="font-display text-xl">Standard</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium">R$ 80/mês</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {["Rodar uma busca", "Ver leads enriquecidos", "Ativar Robô", "Enviar propostas em lote"].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-success/15 text-success border border-success/30">
                        <Check className="w-4 h-4" />
                      </span>
                      <p className="text-sm">{s}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button disabled className="h-12 bg-muted text-muted-foreground" variant="secondary">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                  <Button disabled className="h-12 bg-muted text-muted-foreground" variant="secondary">
                    <Zap className="w-4 h-4 mr-2" /> Automação
                  </Button>
                </div>

                <div className="mt-5 text-xs text-muted-foreground">
                  Sem compromisso nos 2 dias grátis. Depois: Standard R$ 80/mês e Business R$ 180/mês.
                </div>

                <div className="mt-5">
                  <Button onClick={() => onPickPlan("standard")} className="w-full h-12">
                    Ativar teste grátis
                  </Button>
                </div>
              </Card>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span>+ produtividade</span>
                </div>
                <div className="flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>templates prontos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionTitle
            kicker="Planos"
            title="Escolha o plano ideal para seu volume"
            subtitle="Você começa com 2 dias grátis. Depois você escolhe Standard (R$ 80) ou Business (R$ 180)."
          />

          <div className="mt-8 grid lg:grid-cols-2 gap-6">
            {plans.map((p) => (
              <Card
                key={p.key}
                className={`p-6 rounded-2xl border-border/60 bg-card/70 ${p.highlight ? "ring-2 ring-primary/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Plano</p>
                    <p className="font-display text-2xl">{p.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{p.tagline}</p>
                  </div>
                  {p.highlight ? (
                    <Badge className="bg-primary/15 text-primary border-primary/30 gap-2">
                      <Crown className="w-3.5 h-3.5" /> Mais vendido
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="font-display text-3xl text-foreground">{p.price}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cobrança mensal após 2 dias grátis</p>
                </div>

                <div className="mt-5 space-y-3">
                  {p.bullets.map((b) => (
                    <div key={b} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex w-5 h-5 items-center justify-center rounded-full bg-success/15 text-success border border-success/30">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <p className="text-sm text-muted-foreground">{b}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Button
                    className={`w-full h-12 ${p.highlight ? "bg-primary text-primary-foreground hover:opacity-90" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                    onClick={() => onPickPlan(p.key)}
                    disabled={loading === p.key}
                  >
                    {loading === p.key ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                      </span>
                    ) : (
                      "Começar grátis"
                    )}
                  </Button>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  Sem cartão nos 2 dias grátis (simulação). Em produção, conectamos ao gateway.
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionTitle
            kicker="Por que funciona"
            title="Você para de depender do acaso — e começa a prospectar do jeito certo"
            subtitle="O que você precisa é de consistência: busca, enriquecimento, template e envio em lote." 
          />

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[{ icon: Sparkles, t: "Busca real", d: "Nicho + cidade + estado e capturamos leads." }, { icon: ShieldCheck, t: "Enriquecimento", d: "Site, Instagram, WhatsApp e indicadores." }, { icon: Zap, t: "Robô no backend", d: "Sessão/QR e envio em lote sem o usuário ficar no navegador." }].map(
              ({ icon: Icon, t, d }) => (
                <Card key={t} className="p-6 bg-card/70">
                  <div className="p-3 rounded-2xl bg-primary/10 text-primary inline-flex">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-display text-xl mt-4">{t}</p>
                  <p className="text-sm text-muted-foreground mt-2">{d}</p>
                </Card>
              )
            )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
          <SectionTitle kicker="Depoimentos" title="Quem usa, sente a diferença" />

          <div className="mt-8">
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{ width: `${testimonials.length * 100}%`, animation: "none" }}
                >
                  {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, groupIndex) => {
                    const start = groupIndex * 3;
                    const chunk = testimonials.slice(start, start + 3);
                    return (
                      <div
                        key={groupIndex}
                        className="w-full flex-none"
                        style={{ width: `${100 / Math.ceil(testimonials.length / 3)}%` }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                          {chunk.map((t) => (
                            <Card key={t.name} className="p-6 bg-card/70">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 overflow-hidden shrink-0">
                                  {t.photoUrl ? (
                                    <img
                                      src={t.photoUrl}
                                      alt={`Foto de ${t.name}`}
                                      className="w-full h-full object-cover"
                                      loading="eager"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                </div>
                                <div>
                                  <p className="font-medium">{t.name}</p>
                                  <p className="text-xs text-muted-foreground">{t.role}</p>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center gap-1">
                                {Array.from({ length: t.stars }).map((_, i) => (
                                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                ))}
                              </div>
                              <p className="text-sm text-muted-foreground mt-3">“{t.quote}”</p>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Indícios (dots) + auto-slide via CSS keyframes */}
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-muted/60"
                    style={{ opacity: i === 0 ? 1 : 0.45 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>


        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
          <SectionTitle kicker="FAQ" title="Perguntas comuns" />
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {faqs.map((f) => (
              <Card key={f.q} className="p-5 bg-card/70">
                <p className="font-medium">{f.q}</p>
                <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
              </Card>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl">Pronto pra captar leads com velocidade?</p>
              <p className="text-sm text-muted-foreground mt-1">Teste por 2 dias grátis. Depois, Standard R$ 80 e Business R$ 180.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/auth/login")} className="h-12">
                Entrar
              </Button>
              <Button onClick={() => navigate("/auth/register")} className="h-12">
                Começar grátis
              </Button>
            </div>
          </div>
        </section>
      </main>


<footer className="border-t border-border/60 py-6">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
    <div className="flex items-center gap-3 justify-center">
      <img src="/logo.png" alt="Leads Hunter" className="w-7 h-7" />
      <p className="font-medium">Leads Hunter</p>
    </div>

    <div className="text-xs text-muted-foreground">
      todos direitos reservados @
      <a
        href="https://www.agenciainfotech.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md px-1 -mx-1 transition-colors duration-200 text-muted-foreground hover:text-foreground relative group"
      > &nbsp;&nbsp;
        <span className="relative z-10">Agência Infotec</span>
        {/* efeito de luz ascendente */}
        <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 blur-sm bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 transition-opacity duration-200 group-hover:opacity-100" />
        <span className="sr-only">Abrir site da Agência Infotec</span>
      </a>.
    </div>


          </div>

      </footer>
    </div>
  );
}



  





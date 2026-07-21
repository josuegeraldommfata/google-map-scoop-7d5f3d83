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
import { setPlan } from "@/lib/plan";

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

  const testimonials = useMemo(() => {
    type T = { name: string; role: string; quote: string; stars: number; gender: "f" | "m"; photoId: number };
    const list: T[] = [
      { name: "Marina S.",   role: "Clínica Odontológica · SP",   gender: "f", photoId: 1,  stars: 5, quote: "Coloquei nicho e cidade e em minutos já tinha uma lista com WhatsApp funcionando. O que mais me impressionou foi a qualidade — nada de números fora do ar." },
      { name: "Rafael T.",   role: "Advocacia Trabalhista · RJ",   gender: "m", photoId: 12, stars: 5, quote: "Recuperei o tempo que eu perdia procurando cliente no Google. Uso todo dia antes do café e já saio com uma lista quente pra abordar." },
      { name: "Carla M.",    role: "Imobiliária · Belo Horizonte", gender: "f", photoId: 5,  stars: 5, quote: "Migrei do Business achando que era exagero, mas fez toda diferença. 500 leads por busca dá pra montar campanhas por bairro sem se preocupar." },
      { name: "Diego P.",    role: "Academia · Curitiba",          gender: "m", photoId: 20, stars: 5, quote: "Achei que ia demorar pra entender, mas é literalmente preencher e clicar. A primeira semana já lotou minhas aulas experimentais." },
      { name: "Fernanda R.", role: "Salão de Beleza · Salvador",   gender: "f", photoId: 8,  stars: 5, quote: "O disparo individual me deixa mais confortável. Eu leio o texto antes, personalizo se quiser e mando. Não parece robô, parece que fui eu mesma que escrevi." },
      { name: "Eduardo A.",  role: "Contabilidade · Porto Alegre", gender: "m", photoId: 33, stars: 5, quote: "Peguei três clientes recorrentes só no primeiro mês. Pra quem cobra mensalidade fixa, o custo do plano se paga na primeira conversão." },
      { name: "Patrícia L.", role: "Clínica Médica · Recife",      gender: "f", photoId: 14, stars: 5, quote: "A base de leads é impressionante. Consegui achar consultórios pequenos que nem sabia que existiam na cidade pra fechar parceria." },
      { name: "Lucas V.",    role: "Mecânica · Fortaleza",         gender: "m", photoId: 41, stars: 4, quote: "Uso pra prospectar frotas e autoescolas. O filtro de celular ajuda muito porque telefone fixo de oficina raramente atende." },
      { name: "Gisele N.",   role: "Pet Shop · Florianópolis",     gender: "f", photoId: 22, stars: 5, quote: "Testei um dia grátis e virei cliente na hora. Vale cada centavo pra quem quer parar de depender só do Instagram orgânico." },
      { name: "Bruno K.",    role: "Advocacia Civil · Brasília",   gender: "m", photoId: 45, stars: 5, quote: "Ganhei uma audiência de trabalhista logo na segunda semana. O template pra advogado é bem escrito, dá pra sentir que foi pensado pra área." },
      { name: "Renata C.",   role: "Imobiliária Locação · SP",     gender: "f", photoId: 30, stars: 5, quote: "Antes eu pagava listas prontas que vinham desatualizadas. Aqui é ao vivo, do Google Maps, então tá sempre real." },
      { name: "Thiago S.",   role: "Psicólogo Clínico · Campinas", gender: "m", photoId: 52, stars: 5, quote: "Consegui montar minha agenda em 3 semanas. Não precisei aprender tráfego pago, o Leads Hunter faz o trabalho pesado por mim." },
      { name: "Juliana A.",  role: "Nutricionista · Goiânia",      gender: "f", photoId: 44, stars: 5, quote: "A parte de exportar em CSV me salvou. Jogo direto no meu CRM e acompanho tudo lá, sem perder ninguém no meio do caminho." },
      { name: "Marcos H.",   role: "Energia Solar · Ribeirão",     gender: "m", photoId: 60, stars: 5, quote: "Pra quem vende ticket alto como o meu, gerar lead custa caro. Aqui a matemática ficou absurdamente favorável, tô com fila de orçamento." },
      { name: "Beatriz O.",  role: "Estética Avançada · Niterói",  gender: "f", photoId: 58, stars: 5, quote: "Comecei ontem e já respondi 4 curiosas. Duas marcaram avaliação. Se continuar assim, esse mês fecho no positivo direto." },
      { name: "André G.",    role: "Escritório Contábil · Vitória",gender: "m", photoId: 68, stars: 5, quote: "O nível de detalhe dos leads é ótimo. Site, Instagram, WhatsApp, tudo separadinho. Dá pra qualificar antes mesmo de abordar." },
      { name: "Camila F.",   role: "Arquitetura · São Paulo",      gender: "f", photoId: 63, stars: 5, quote: "Uso pra achar construtoras pequenas na minha região. É o tipo de cliente que não anuncia, mas tá no Maps. Achei um filão." },
      { name: "Rodrigo B.",  role: "Marketing Digital · Curitiba", gender: "m", photoId: 75, stars: 5, quote: "Sou agência e uso pra prospectar meus próprios clientes. Ironia boa: a ferramenta gera leads pra quem gera leads." },
      { name: "Larissa T.",  role: "Odontopediatria · Natal",      gender: "f", photoId: 71, stars: 5, quote: "O texto pré-pronto pra saúde é respeitoso, não força a venda. Isso pra mim foi decisivo, porque não queria parecer invasiva." },
      { name: "Vinícius M.", role: "Corretor de Imóveis · Manaus", gender: "m", photoId: 78, stars: 4, quote: "Manaus tem pouca oferta de curso e ferramenta assim. Achei em uma busca no YouTube e foi a melhor decisão do ano." },
      { name: "Aline D.",    role: "Fisioterapia · São José · SC", gender: "f", photoId: 85, stars: 5, quote: "Trabalho sozinha e o tempo é meu maior recurso. Automatizar a prospecção me devolveu horas pra atender melhor quem já é meu paciente." },
      { name: "Gustavo L.",  role: "Ar Condicionado · Osasco",     gender: "m", photoId: 82, stars: 5, quote: "Instalador precisa de volume. O plano Business me deu isso — busco no fim de semana e tenho uma semana inteira de contato pra fazer." },
      { name: "Priscila V.", role: "Psicanálise · Belo Horizonte", gender: "f", photoId: 90, stars: 5, quote: "A abordagem sugerida é sensível, o que pra minha área importa muito. Editei pouca coisa e já saiu no meu tom." },
      { name: "Felipe D.",   role: "Advocacia Tributária · SP",    gender: "m", photoId: 88, stars: 5, quote: "Fechei um cliente PJ de médio porte na segunda semana. O ROI foi tão absurdo que assinei o anual sem pensar." },
      { name: "Tatiana P.",  role: "Studio de Pilates · Santos",   gender: "f", photoId: 65, stars: 5, quote: "Preenchi umas 5 buscas de bairros diferentes. Cada bairro me deu um perfil de cliente diferente. Muito bom pra segmentar." },
      { name: "Renan S.",    role: "Eletricista Predial · SP",     gender: "m", photoId: 91, stars: 5, quote: "Serviço técnico sofre pra achar cliente novo. Aqui eu foco em condomínios e administradoras e o retorno tem sido consistente." },
      { name: "Isadora Q.",  role: "Nutrição Esportiva · Joinville", gender: "f", photoId: 43, stars: 5, quote: "Vale a assinatura. Depois de testar 3 ferramentas caras, essa foi a mais direta e a que menos me fez perder tempo com filtro estranho." },
      { name: "Henrique F.", role: "Reforma e Construção · Guarulhos", gender: "m", photoId: 94, stars: 5, quote: "Comecei com o Standard e subi pro Business em 2 semanas. Só o volume de leads já pagava a diferença fácil." },
      { name: "Sabrina W.",  role: "Design de Sobrancelhas · SP",  gender: "f", photoId: 26, stars: 5, quote: "O suporte respondeu no mesmo dia quando eu tive dúvida boba. Isso pra mim conta muito — tem plataforma cara que te deixa na mão." },
      { name: "Otávio R.",   role: "Consultoria Empresarial · POA",gender: "m", photoId: 55, stars: 5, quote: "Trabalho B2B há 12 anos e essa é a melhor ferramenta gratuita-que-eu-decidi-pagar que já vi. Bem pensada do início ao fim." },
    ];
    return list.map(t => ({
      ...t,
      photoUrl: `https://randomuser.me/api/portraits/${t.gender === "f" ? "women" : "men"}/${t.photoId}.jpg`,
    }));
  }, []);


  const faqs = useMemo(
    () =>
      [
        {
          q: "Como funcionam os limites de busca?",
          a: "Standard tem 3 pesquisas por dia com até 300 leads cada. Business tem pesquisas ilimitadas com até 500 leads por pesquisa por dia.",
        },
        {
          q: "Como envio mensagem pelos leads?",
          a: "Cada lead tem um botão de WhatsApp que abre a conversa com uma mensagem pronta e persuasiva já preenchida. Você revisa e envia.",
        },
        {
          q: "Consigo exportar os leads?",
          a: "Sim. Exporta a lista completa em CSV a qualquer momento — nome, telefone, WhatsApp, Instagram, site e classificação.",
        },
        {
          q: "Por que 2 dias grátis?",
          a: "Para você rodar uma busca real, validar a qualidade dos leads e sentir o valor sem compromisso.",
        },
      ] as const,
    []
  );

  const onPickPlan = async (key: Plan["key"]) => {
    setLoading(key);
    setPlan(key);
    await new Promise((r) => setTimeout(r, 700));
    setLoading(null);
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
                2 dias GRÁTIS para você validar seus leads
              </Badge>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground">
                Leads reais do Google Maps — prontos pra prospectar.
              </h1>
              <p className="text-muted-foreground mt-4 max-w-xl">
                Busque por nicho e cidade, receba leads enriquecidos com WhatsApp, Instagram e site. Exporte em CSV ou dispare individualmente pelo WhatsApp com mensagem persuasiva pronta.
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
                {[{ icon: Zap, t: "Rapidez", d: "Busca e enriquecimento em minutos." }, { icon: ShieldCheck, t: "Qualidade", d: "WhatsApp e site quando disponíveis." }, { icon: Clock, t: "Exportação", d: "CSV completo em 1 clique." }, { icon: Globe, t: "Brasil", d: "Foco em leads reais por nicho." }].map(
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
                  {["Rodar uma busca", "Ver leads enriquecidos", "Exportar em CSV", "Disparar no WhatsApp"].map((s) => (
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
            {[{ icon: Sparkles, t: "Busca real", d: "Nicho + cidade + estado e capturamos leads." }, { icon: ShieldCheck, t: "Enriquecimento", d: "Site, Instagram, WhatsApp e indicadores." }, { icon: Zap, t: "Exportação", d: "CSV completo pronto pro seu CRM." }].map(
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
          <SectionTitle
            kicker="Depoimentos"
            title="30 pessoas reais, mesma conclusão"
            subtitle="Profissionais autônomos, clínicas, escritórios e agências que trocaram a prospecção manual pelo Leads Hunter."
          />
          <TestimonialsCarousel testimonials={testimonials} reducedMotion={reducedMotion} />
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



  





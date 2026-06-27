import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const planFromLanding = (location.state as any)?.plan as string | undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [plan, setPlan] = useState<string>(planFromLanding || "standard");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // MOCK cadastro: cria usuário fictício em localStorage
    await new Promise((r) => setTimeout(r, 700));
    const users = JSON.parse(localStorage.getItem("lh_users") || "[]") as any[];
    users.push({ id: crypto.randomUUID(), name, email, passwordHashMock: password, plan });
    localStorage.setItem("lh_users", JSON.stringify(users));
    localStorage.setItem("lh_auth", JSON.stringify({ email, ts: Date.now(), plan }));
    setLoading(false);
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl">Começar grátis</h1>
          <p className="text-sm text-muted-foreground">Crie sua conta para iniciar o Plano 2.</p>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          {[
            { key: "standard", label: "Standard (R$ 80)" },
            { key: "business", label: "Business (R$ 180)" },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPlan(p.key)}
              className={`px-3 py-2 rounded-lg border text-sm ${
                plan === p.key ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>

          <Button className="w-full" disabled={loading || !name || !email || !password}>
            {loading ? "Criando..." : "Criar conta e iniciar"}
          </Button>

          <div className="text-xs text-muted-foreground">
            Ao continuar, você aceita os termos de uso. (mock)
          </div>
        </form>
      </Card>
    </div>
  );
}


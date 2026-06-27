import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPlan = (location.state as any)?.plan;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // MOCK auth: salva token fictício em memória
    await new Promise((r) => setTimeout(r, 500));
    localStorage.setItem("lh_auth", JSON.stringify({ email, ts: Date.now() }));
    setLoading(false);
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl">Entrar</h1>
          <p className="text-sm text-muted-foreground">
            {fromPlan ? `Continuar cadastro do plano: ${fromPlan}` : "Acesse sua conta"}
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>

          <Button className="w-full" disabled={loading || !email || !password}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>

          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <button type="button" className="hover:underline" onClick={() => navigate("/auth/register")}>Criar conta</button>
            <button type="button" className="hover:underline" onClick={() => navigate("/auth/forgot")}>Esqueci a senha</button>
          </div>
        </form>
      </Card>
    </div>
  );
}


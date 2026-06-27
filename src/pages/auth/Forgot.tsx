import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Enviaremos um link para seu email. (mock)</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <Button className="w-full" disabled={loading || !email}>
            {loading ? "Enviando..." : sent ? "Enviado" : "Enviar link"}
          </Button>
        </form>
      </Card>
    </div>
  );
}


// Roda uma vez quando o servidor do Next sobe (no seu PC e em cada instância na Vercel).
// Em produção, sem um SESSION_SECRET forte o app NÃO sobe: melhor falhar na hora do que
// aceitar cookies de sessão assinados com uma chave que qualquer um adivinha.
import { problemaNoSegredo } from "@/lib/sessao";

export function register() {
  if (process.env.NODE_ENV !== "production") return;
  const problema = problemaNoSegredo();
  if (!problema) return;

  const mensagem =
    `[AutoCare] O app não pode subir: ${problema}. Configure SESSION_SECRET nas variáveis de ambiente ` +
    `(na Vercel: Settings > Environment Variables).`;
  // `npm start` num servidor comum: encerra o processo (senão ele ficaria no ar respondendo erro).
  // Na Vercel, o erro abaixo derruba a função e aparece nos logs do deploy.
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    console.error(`\n${mensagem}\n`);
    process.exit(1);
  }
  throw new Error(mensagem);
}

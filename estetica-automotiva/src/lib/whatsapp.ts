// Envio de mensagem pro WhatsApp do cliente (hoje só o código de verificação).
import "server-only";
import { formatarTelefone } from "./format";

/**
 * Devolve true se a mensagem foi enviada.
 *
 * Por enquanto NÃO envia de verdade:
 * - em desenvolvimento (npm run dev), mostra a mensagem no terminal;
 * - em produção, devolve false ("Não foi possível enviar o código agora"), a não ser
 *   que WHATSAPP_CODIGO_NO_TERMINAL=1 esteja no .env (só pra testar `npm start` na sua máquina).
 */
export async function enviarMensagem(telefone: string, texto: string): Promise<boolean> {
  // ---------------------------------------------------------------------------
  // PLUGAR A API DO WHATSAPP AQUI (WhatsApp Cloud API da Meta, Twilio, Z-API...).
  // Quando tiver as credenciais no .env, faça a chamada e devolva se deu certo:
  //
  //   const resposta = await fetch(process.env.WHATSAPP_API_URL!, {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`, "Content-Type": "application/json" },
  //     body: JSON.stringify({ to: `55${telefone}`, text: texto }),
  //   });
  //   return resposta.ok;
  //
  // Depois disso, apague o bloco abaixo e a variável WHATSAPP_CODIGO_NO_TERMINAL.
  // ---------------------------------------------------------------------------

  const noTerminal = process.env.NODE_ENV !== "production" || process.env.WHATSAPP_CODIGO_NO_TERMINAL === "1";
  if (!noTerminal) return false;

  console.log(`\n[WhatsApp simulado] Para ${formatarTelefone(telefone)}: ${texto}\n`);
  return true;
}

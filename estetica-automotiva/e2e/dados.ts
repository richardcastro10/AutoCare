// Dados dos testes de ponta a ponta.
//
// Dois alvos:
// - padrão (npm run test:e2e): banco de teste LOCAL (estetica_e2e), recriado do zero a cada rodada.
//   Os acessos abaixo são só desse banco: nada aqui é senha de verdade.
// - E2E_ALVO=dev (npm run test:e2e:dev): a branch dev do Neon, com o banco e o bucket do .env.
//   Nada é zerado: roda só o teste das fotos, que entra com o dono da Molinari (MOLINARI_DONO_*
//   do .env) e remove no fim tudo o que enviou.
import "dotenv/config";

export const ALVO_DEV = process.env.E2E_ALVO === "dev";

export const URL_BANCO_E2E = ALVO_DEV
  ? (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "")
  : (process.env.E2E_DATABASE_URL ?? "postgresql://estetica:estetica@localhost:5432/estetica_e2e");

export const DONO = ALVO_DEV
  ? {
      nome: process.env.MOLINARI_DONO_NOME ?? "",
      email: process.env.MOLINARI_DONO_EMAIL ?? "",
      senha: process.env.MOLINARI_DONO_SENHA ?? "",
    }
  : { nome: "Dono E2E", email: "dono.e2e@teste.local", senha: "senha-dono-e2e" };
export const ADMIN = { nome: "Admin E2E", email: "admin.e2e@teste.local", senha: "senha-admin-e2e" };

/** Variáveis de ambiente do servidor e dos scripts nos testes locais (banco de teste + acessos acima) */
export const AMBIENTE_E2E: Record<string, string> = {
  DATABASE_URL: URL_BANCO_E2E,
  DIRECT_URL: URL_BANCO_E2E,
  // envio de fotos ligado, como em produção. As fotos vão pro bucket se NEON_S3_* estiverem no
  // ambiente (ou no .env); senão, pra ./uploads
  UPLOADS_HABILITADOS: "true",
  MOLINARI_DONO_NOME: DONO.nome,
  MOLINARI_DONO_EMAIL: DONO.email,
  MOLINARI_DONO_SENHA: DONO.senha,
  PLATAFORMA_ADMIN_NOME: ADMIN.nome,
  PLATAFORMA_ADMIN_EMAIL: ADMIN.email,
  PLATAFORMA_ADMIN_SENHA: ADMIN.senha,
};

"use server";

// Conta do cliente: entrar, criar, trocar senha, editar nome e sair.
// Os formulários (components/cliente/form-conta.tsx) mandam um campo "voltar" quando estão
// numa página própria (/conta/entrar, /conta/criar...): aí a action redireciona.
// Sem "voltar" (login dentro do agendamento), a action só devolve o resultado e atualiza a
// tela, pra o cliente não perder serviço, veículo, dia e horário já escolhidos.
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clienteAtual, exigirCliente } from "@/lib/dal";
import {
  MENSAGEM_LOGIN_ERRADO,
  apagarSessaoCliente,
  esquemaCelular,
  esquemaSenha,
  gerarHashSenha,
  gravarSessaoCliente,
  mensagemBloqueio,
  tentarLogin,
  voltarSeguro,
} from "@/lib/conta";
import bcrypt from "bcryptjs";

export type EstadoConta =
  | {
      erro?: string;
      /** "Esse celular já tem conta. Entrar?" */
      jaTemConta?: boolean;
      ok?: boolean;
      /** entrou com senha temporária: precisa criar uma nova antes de seguir */
      trocarSenha?: boolean;
      telefone?: string;
      nome?: string;
    }
  | undefined;

/** Depois de entrar/criar conta: redireciona (página própria) ou só atualiza a tela (agendamento) */
function seguir(formData: FormData, cliente: { nome: string; telefone: string }): EstadoConta {
  const voltar = formData.get("voltar");
  if (voltar !== null) redirect(voltarSeguro(voltar));
  refresh();
  return { ok: true, nome: cliente.nome, telefone: cliente.telefone };
}

export async function entrar(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const telefoneDigitado = String(formData.get("telefone") ?? "");
  const resultado = z
    .object({ telefone: esquemaCelular, senha: z.string().min(1, "Digite a senha.") })
    .safeParse({ telefone: telefoneDigitado, senha: formData.get("senha") ?? "" });
  if (!resultado.success) return { erro: resultado.error.issues[0].message, telefone: telefoneDigitado };
  const { telefone, senha } = resultado.data;

  const login = await tentarLogin(telefone, senha);
  if (!login.ok) {
    // mensagem genérica: não diz se o celular tem conta
    return { erro: login.bloqueadoMin ? mensagemBloqueio(login.bloqueadoMin) : MENSAGEM_LOGIN_ERRADO, telefone: telefoneDigitado };
  }

  await gravarSessaoCliente(login.cliente);
  if (login.cliente.senhaTemporaria) {
    const voltar = formData.get("voltar");
    if (voltar !== null) redirect(`/conta/nova-senha?voltar=${encodeURIComponent(voltarSeguro(voltar))}`);
    return { trocarSenha: true };
  }
  return seguir(formData, login.cliente);
}

const esquemaCriar = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo."),
    telefone: esquemaCelular,
    senha: esquemaSenha,
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não são iguais.", path: ["confirmacao"] });

export async function criarConta(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const nomeDigitado = String(formData.get("nome") ?? "");
  const telefoneDigitado = String(formData.get("telefone") ?? "");
  const resultado = esquemaCriar.safeParse({
    nome: nomeDigitado,
    telefone: telefoneDigitado,
    senha: formData.get("senha") ?? "",
    confirmacao: formData.get("confirmacao") ?? "",
  });
  const devolver = { nome: nomeDigitado, telefone: telefoneDigitado };
  if (!resultado.success) return { erro: resultado.error.issues[0].message, ...devolver };
  const { nome, telefone, senha } = resultado.data;

  const jaTemConta = { erro: "Esse celular já tem conta.", jaTemConta: true, ...devolver };
  const senhaHash = await gerarHashSenha(senha);
  const agora = new Date();

  const existente = await prisma.cliente.findUnique({ where: { telefone }, select: { id: true, senhaHash: true } });
  if (existente?.senhaHash) return jaTemConta;

  let cliente: { id: number; nome: string; telefone: string };
  if (existente) {
    // Celular já cadastrado no balcão (sem senha): a conta usa o mesmo registro.
    // Os agendamentos e veículos de balcão continuam fora da conta (origem BALCAO).
    // updateMany com senhaHash null: se outra pessoa criou a conta no mesmo instante, não sobrescreve.
    const { count } = await prisma.cliente.updateMany({
      where: { id: existente.id, senhaHash: null },
      data: { nome, senhaHash, senhaTemporaria: false, contaCriadaEm: agora },
    });
    if (!count) return jaTemConta;
    cliente = { id: existente.id, nome, telefone };
  } else {
    try {
      cliente = await prisma.cliente.create({
        data: { nome, telefone, senhaHash, contaCriadaEm: agora },
        select: { id: true, nome: true, telefone: true },
      });
    } catch {
      return jaTemConta; // o mesmo celular foi cadastrado no mesmo instante
    }
  }

  await gravarSessaoCliente({ id: cliente.id, senhaHash });
  return seguir(formData, cliente);
}

const esquemaNovaSenha = z
  .object({ senha: esquemaSenha, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não são iguais.", path: ["confirmacao"] });

/** Troca obrigatória depois de entrar com a senha temporária gerada pela plataforma */
export async function definirNovaSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const cliente = await clienteAtual();
  if (!cliente) return { erro: "Sua sessão expirou. Entre de novo." };

  const resultado = esquemaNovaSenha.safeParse({
    senha: formData.get("senha") ?? "",
    confirmacao: formData.get("confirmacao") ?? "",
  });
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  const senhaHash = await gerarHashSenha(resultado.data.senha);
  await prisma.cliente.update({ where: { id: cliente.id }, data: { senhaHash, senhaTemporaria: false } });
  await gravarSessaoCliente({ id: cliente.id, senhaHash }); // a sessão antiga caiu com a troca
  return seguir(formData, cliente);
}

// ---------- Tela /conta (já logado) ----------

export async function salvarNome(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const cliente = await exigirCliente("/conta");
  const nome = z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo.").safeParse(formData.get("nome") ?? "");
  if (!nome.success) return { erro: nome.error.issues[0].message };

  await prisma.cliente.update({ where: { id: cliente.id }, data: { nome: nome.data } });
  refresh();
  return { ok: true };
}

const esquemaTrocarSenha = z
  .object({ atual: z.string().min(1, "Digite a senha atual."), senha: esquemaSenha, confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas novas não são iguais.", path: ["confirmacao"] });

export async function trocarSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const cliente = await exigirCliente("/conta");
  const resultado = esquemaTrocarSenha.safeParse({
    atual: formData.get("atual") ?? "",
    senha: formData.get("senha") ?? "",
    confirmacao: formData.get("confirmacao") ?? "",
  });
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  const { senhaHash: hashAtual } = await prisma.cliente.findUniqueOrThrow({
    where: { id: cliente.id },
    select: { senhaHash: true },
  });
  if (!hashAtual || !(await bcrypt.compare(resultado.data.atual, hashAtual))) return { erro: "Senha atual incorreta." };

  const senhaHash = await gerarHashSenha(resultado.data.senha);
  await prisma.cliente.update({ where: { id: cliente.id }, data: { senhaHash } });
  // este aparelho continua logado; os outros saem (a impressão da senha mudou)
  await gravarSessaoCliente({ id: cliente.id, senhaHash });
  return { ok: true };
}

/** "Sair deste aparelho" (tela /conta) */
export async function sair() {
  await apagarSessaoCliente();
  redirect("/");
}

/** "Não é você?" no agendamento: sai sem trocar de tela (as escolhas continuam) */
export async function sairSemSairDaTela() {
  await apagarSessaoCliente();
  refresh();
}

"use server";

import bcrypt from "bcryptjs";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirDono } from "@/lib/dal";
import { TAG_LOJAS, tagLoja } from "@/lib/catalogo";
import { dataValida, horaParaMinutos, somenteDigitos } from "@/lib/format";
import { removerImagem, salvarImagem, uploadsHabilitados } from "@/lib/uploads";

const inteiro = (v: FormDataEntryValue | null, padrao: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : padrao;
};

const coordenada = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return String(v ?? "").trim() && Number.isFinite(n) ? n : null;
};

/** Limpa o cache do que o cliente vê (página da loja e lista de lojas) */
function limparCache(lojaId: number) {
  updateTag(tagLoja(lojaId));
  updateTag(TAG_LOJAS);
}

export type EstadoConfig = { erro?: string; ok?: string } | undefined;

export async function salvarLoja(_anterior: EstadoConfig, formData: FormData): Promise<EstadoConfig> {
  const { lojaId } = await exigirDono();
  const loja = await prisma.loja.findUniqueOrThrow({ where: { id: lojaId } });

  const nome = String(formData.get("nome") ?? "").trim();
  if (nome.length < 3) return { erro: "Informe o nome da loja." };

  // fotos (capa e logo): nova, removida ou mantida. Com o envio de fotos desligado
  // (UPLOADS_HABILITADOS), qualquer arquivo é ignorado e as fotos atuais ficam como estão
  // (inclusive a logo fixa em public/lojas/<slug>-logo.webp).
  let capaUrl = loja.capaUrl;
  let logoUrl = loja.logoUrl;
  if (uploadsHabilitados()) {
    const capa = await salvarImagem(formData.get("capa"), 1600);
    if (capa && "erro" in capa) return { erro: capa.erro };
    const logo = await salvarImagem(formData.get("logo"), 600);
    if (logo && "erro" in logo) return { erro: logo.erro };

    capaUrl = capa ? capa.url : formData.get("removerCapa") === "on" ? "" : loja.capaUrl;
    logoUrl = logo ? logo.url : formData.get("removerLogo") === "on" ? "" : loja.logoUrl;
    if (loja.capaUrl && loja.capaUrl !== capaUrl) await removerImagem(loja.capaUrl);
    if (loja.logoUrl && loja.logoUrl !== logoUrl) await removerImagem(loja.logoUrl);
  }

  await prisma.loja.update({
    where: { id: lojaId },
    data: {
      nome,
      descricao: String(formData.get("descricao") ?? "").trim().slice(0, 400),
      telefone: somenteDigitos(String(formData.get("telefone") ?? "")),
      endereco: String(formData.get("endereco") ?? "").trim(),
      bairro: String(formData.get("bairro") ?? "").trim(),
      cidade: String(formData.get("cidade") ?? "").trim(),
      uf: String(formData.get("uf") ?? "SP").trim().toUpperCase().slice(0, 2),
      latitude: coordenada(formData.get("latitude")),
      longitude: coordenada(formData.get("longitude")),
      ativa: formData.get("ativa") === "on",
      capaUrl,
      logoUrl,
    },
  });
  limparCache(lojaId);
  return { ok: "Dados da loja salvos." };
}

export async function salvarAgenda(formData: FormData) {
  const { lojaId } = await exigirDono();
  await prisma.loja.update({
    where: { id: lojaId },
    data: {
      vagasSimultaneas: Math.max(1, inteiro(formData.get("vagasSimultaneas"), 2)),
      intervaloSlotMin: Math.max(10, inteiro(formData.get("intervaloSlotMin"), 30)),
      antecedenciaMinHoras: inteiro(formData.get("antecedenciaMinHoras"), 1),
      diasAntecedenciaMax: Math.min(90, Math.max(1, inteiro(formData.get("diasAntecedenciaMax"), 30))),
    },
  });
  limparCache(lojaId);
}

export async function salvarHorarios(formData: FormData) {
  const { lojaId } = await exigirDono();
  for (let dia = 0; dia < 7; dia++) {
    const aberto = formData.get(`aberto_${dia}`) === "on";
    const abre = horaParaMinutos(String(formData.get(`abre_${dia}`) || "08:00"));
    const fecha = horaParaMinutos(String(formData.get(`fecha_${dia}`) || "18:00"));
    const dados = { aberto: aberto && fecha > abre, abre, fecha };
    await prisma.horarioFuncionamento.upsert({
      where: { lojaId_diaSemana: { lojaId, diaSemana: dia } },
      update: dados,
      create: { lojaId, diaSemana: dia, ...dados },
    });
  }
  limparCache(lojaId);
}

export async function adicionarBloqueio(formData: FormData) {
  const { lojaId } = await exigirDono();
  const data = String(formData.get("data") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim() || "Fechado";
  if (!dataValida(data)) return;
  await prisma.bloqueio.upsert({
    where: { lojaId_data: { lojaId, data } },
    update: { motivo },
    create: { lojaId, data, motivo },
  });
  limparCache(lojaId);
}

export async function removerBloqueio(id: number) {
  const { lojaId } = await exigirDono();
  await prisma.bloqueio.deleteMany({ where: { id, lojaId } });
  limparCache(lojaId);
}

export type EstadoSenha = { erro?: string; ok?: boolean } | undefined;

export async function trocarSenha(_anterior: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const eu = await exigirAdmin();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  if (nova.length < 6) return { erro: "A nova senha precisa de pelo menos 6 caracteres." };

  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: eu.id } });
  if (!(await bcrypt.compare(atual, usuario.senhaHash))) return { erro: "Senha atual incorreta." };

  await prisma.usuario.update({ where: { id: eu.id }, data: { senhaHash: await bcrypt.hash(nova, 10) } });
  return { ok: true };
}

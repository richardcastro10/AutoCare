"use server";

import bcrypt from "bcryptjs";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TAG_LOJAS } from "@/lib/catalogo";
import { gerarSlug, somenteDigitos } from "@/lib/format";
import { COOKIE_ADMIN, assinarSessaoAdmin, opcoesCookieAdmin } from "@/lib/sessao";

const esquema = z.object({
  nomeLoja: z.string().trim().min(3, "Informe o nome da loja"),
  telefone: z
    .string()
    .transform(somenteDigitos)
    .refine((t) => t.length === 10 || t.length === 11, "WhatsApp da loja inválido (DDD + número)"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF com 2 letras").transform((u) => u.toUpperCase()),
  bairro: z.string().trim().default(""),
  endereco: z.string().trim().min(3, "Informe o endereço"),
  nome: z.string().trim().min(2, "Informe seu nome"),
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
});

export type EstadoCadastro = { erro: string; valores: Record<string, string> } | undefined;

export async function cadastrarLoja(_anterior: EstadoCadastro, formData: FormData): Promise<EstadoCadastro> {
  const valores = Object.fromEntries(
    ["nomeLoja", "telefone", "cidade", "uf", "bairro", "endereco", "nome", "email"].map((c) => [
      c,
      String(formData.get(c) ?? ""),
    ]),
  );
  const resultado = esquema.safeParse({ ...valores, senha: formData.get("senha") });
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };
  const d = resultado.data;

  if (await prisma.usuario.findUnique({ where: { email: d.email } })) {
    return { erro: "Já existe um acesso com esse e-mail. Use outro ou entre com ele.", valores };
  }

  // slug único: brilho-pro, brilho-pro-2, brilho-pro-3...
  const base = gerarSlug(d.nomeLoja) || "loja";
  let slug = base;
  for (let n = 2; await prisma.loja.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

  // a loja nasce PENDENTE (padrão do banco): o dono já configura tudo,
  // mas ela só aparece no app depois que a plataforma aprovar
  const loja = await prisma.loja.create({
    data: {
      slug,
      nome: d.nomeLoja,
      telefone: d.telefone,
      cidade: d.cidade,
      uf: d.uf,
      bairro: d.bairro,
      endereco: d.endereco,
      // horário inicial: seg a sex 8h-18h, sábado 8h-14h (dá pra mudar em Configurações)
      horarios: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
          diaSemana: dia,
          aberto: dia !== 0,
          abre: 8 * 60,
          fecha: dia === 6 ? 14 * 60 : 18 * 60,
        })),
      },
      usuarios: {
        create: {
          nome: d.nome,
          email: d.email,
          senhaHash: await bcrypt.hash(d.senha, 10),
          papel: "ADMIN",
          ultimoAcesso: new Date(),
        },
      },
    },
    include: { usuarios: true },
  });

  const dono = loja.usuarios[0];
  (await cookies()).set(
    COOKIE_ADMIN,
    await assinarSessaoAdmin({ usuarioId: dono.id, nome: dono.nome, papel: "ADMIN" }),
    opcoesCookieAdmin,
  );
  updateTag(TAG_LOJAS);
  redirect("/admin/servicos?primeiro=1");
}

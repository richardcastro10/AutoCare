"use client";

import Link from "next/link";
import { useState } from "react";
import { VerificarWhatsApp } from "@/components/cliente/verificar-whatsapp";

// "Entrar com WhatsApp": pra ver os agendamentos num aparelho que ainda não tem o cookie.
// Quando o número tem cadastro, a action grava o cookie e a página recarrega já com a lista.
export function EntrarComWhatsApp() {
  const [semCadastro, setSemCadastro] = useState(false);

  // o código estava certo, mas ninguém agendou com esse número
  // (só aparece pra quem provou que o número é dele)
  if (semCadastro) {
    return (
      <div className="painel mt-4 p-5">
        <p className="font-semibold">Nenhum agendamento com esse número</p>
        <p className="mt-1 text-sm text-texto-suave">Quando você agendar, seus horários aparecem nesta tela.</p>
        <Link href="/" className="btn-primario mt-4 w-full">
          Encontrar uma estética
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="painel mt-4 p-5">
        <p className="font-semibold">Entrar com WhatsApp</p>
        <p className="mb-4 mt-1 text-sm text-texto-suave">
          Já agendou por aqui? Informe seu WhatsApp e digite o código que enviarmos pra ver seus horários neste
          aparelho.
        </p>
        <VerificarWhatsApp aoVerificar={(cliente) => setSemCadastro(!cliente)} />
      </div>
      <p className="mt-5 text-center text-sm text-texto-suave">
        Ainda não agendou?{" "}
        <Link href="/" className="font-medium text-menta">
          Encontrar uma estética
        </Link>
      </p>
    </>
  );
}

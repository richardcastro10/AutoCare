"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

// Botão de submit que se desabilita enquanto a server action roda
export function BotaoEnviar({
  children,
  pendente = "Salvando...",
  className = "btn-primario",
  ...props
}: ComponentProps<"button"> & { pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || props.disabled} {...props}>
      {pending ? pendente : children}
    </button>
  );
}

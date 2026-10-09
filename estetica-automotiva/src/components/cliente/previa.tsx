import Link from "next/link";

/** Faixa que aparece pro dono da plataforma e pra equipe da loja quando ela ainda não está no ar */
export function FaixaPrevia() {
  return (
    <p role="status" className="sticky top-0 z-30 bg-dourado px-4 py-2 text-center text-sm font-semibold text-fundo">
      Prévia: loja não publicada
    </p>
  );
}

/** O cliente caiu numa loja pendente, suspensa ou desligada pelo dono */
export function LojaIndisponivel() {
  return (
    <main className="grid flex-1 place-items-center px-6 py-16 text-center">
      <div>
        <h1 className="titulo text-xl">Esta loja não está disponível no momento</h1>
        <p className="mt-2 text-sm text-texto-suave">Que tal conhecer outras estéticas perto de você?</p>
        <Link href="/" className="btn-secundario mt-6">
          Ver outras lojas
        </Link>
      </div>
    </main>
  );
}

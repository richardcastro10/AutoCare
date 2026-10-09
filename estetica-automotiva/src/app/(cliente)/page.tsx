import { getLojasAtivas } from "@/lib/catalogo";
import { LogoPlataforma, SilhuetaCarro } from "@/components/marca";
import { NavCliente } from "@/components/cliente/nav";
import { BuscaLojas } from "./busca-lojas";

// Tela 01 do design: escolher a loja.
// A lista vem do cache ("use cache" em getLojasAtivas); busca, distância e
// favoritos são calculados no aparelho do cliente (componente BuscaLojas).
export default async function Inicio() {
  const lojas = await getLojasAtivas();

  return (
    <>
      <section className="relative overflow-hidden px-5 pb-6 pt-[max(2.5rem,env(safe-area-inset-top))]">
        {/* "foto" do topo: farol estilizado com gradiente */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_75%,#1b4152_0%,transparent_55%),radial-gradient(ellipse_at_10%_0%,#14303c_0%,transparent_50%)]" />
          <SilhuetaCarro className="absolute -right-24 bottom-10 h-48 w-[34rem] text-menta/[0.07]" />
        </div>

        <div className="relative">
          <div className="pt-6">
            <LogoPlataforma />
          </div>
          <h1 className="titulo mt-14 max-w-[17ch] text-[1.75rem] leading-tight">
            Encontre a melhor estética automotiva perto de você.
          </h1>
        </div>
      </section>

      <main className="flex-1 px-5 pb-6">
        <BuscaLojas lojas={lojas} />
      </main>

      <NavCliente ativo="inicio" />
    </>
  );
}

// Placa no padrão Mercosul (faixa azul em cima). Só visual.
export function Placa({ placa, pequena }: { placa: string; pequena?: boolean }) {
  if (!placa) return null;
  return (
    <span
      className={`inline-flex flex-col overflow-hidden rounded-[5px] border-2 border-[#1c2430] bg-white text-center align-middle leading-none ${
        pequena ? "w-[72px]" : "w-[118px]"
      }`}
      aria-label={`Placa ${placa}`}
    >
      <span
        className={`bg-[#1f4fa3] font-semibold text-white ${
          pequena ? "py-[1px] text-[5px]" : "py-[2px] text-[7px]"
        }`}
        style={{ letterSpacing: "0.3em" }}
      >
        BRASIL
      </span>
      <span
        className={`font-bold text-[#1c2430] ${pequena ? "py-0.5 text-[13px]" : "py-1 text-[22px]"}`}
        style={{ fontStretch: "80%", letterSpacing: "0.04em" }}
      >
        {placa}
      </span>
    </span>
  );
}

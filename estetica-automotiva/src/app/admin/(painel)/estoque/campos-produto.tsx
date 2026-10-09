import { UNIDADES } from "@/lib/constantes";

type Produto = {
  nome: string;
  unidade: string;
  tamanhoEmbalagem: number;
  precoEmbalagem: number;
  estoqueMinimo: number;
};

// Campos usados no cadastro e na edição de produto
export function CamposProduto({ produto }: { produto?: Produto }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="sm:col-span-2">
        <label className="rotulo" htmlFor="nome">
          Nome
        </label>
        <input id="nome" name="nome" className="campo" defaultValue={produto?.nome} required />
      </div>
      <div>
        <label className="rotulo" htmlFor="unidade">
          Unidade
        </label>
        <select id="unidade" name="unidade" className="campo" defaultValue={produto?.unidade ?? "ml"}>
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="rotulo" htmlFor="tamanhoEmbalagem">
          Tamanho da embalagem
        </label>
        <input
          id="tamanhoEmbalagem"
          name="tamanhoEmbalagem"
          type="number"
          min={0}
          step="any"
          className="campo"
          defaultValue={produto?.tamanhoEmbalagem ?? 1000}
          required
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="precoEmbalagem">
          Preço da embalagem
        </label>
        <input
          id="precoEmbalagem"
          name="precoEmbalagem"
          inputMode="decimal"
          className="campo"
          placeholder="0,00"
          defaultValue={produto ? (produto.precoEmbalagem / 100).toFixed(2).replace(".", ",") : ""}
          required
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="estoqueMinimo">
          Avisar quando ficar abaixo de
        </label>
        <input
          id="estoqueMinimo"
          name="estoqueMinimo"
          type="number"
          min={0}
          step="any"
          className="campo"
          defaultValue={produto?.estoqueMinimo ?? 0}
        />
      </div>
    </div>
  );
}

// App do cliente: coluna estreita pensada pra celular.
// Cada tela tem o próprio topo (com voltar) e o próprio botão de ação embaixo.
export default function LayoutCliente({ children }: LayoutProps<"/">) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col">{children}</div>;
}

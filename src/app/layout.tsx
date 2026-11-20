import type { Metadata } from "next";
import { Provider } from "@/context/Context";
import NavegacaoApp from "@/components/NavegacaoApp/NavegacaoApp";
import "../styles/globals.css";


export const metadata: Metadata = {
  title: "Controle mensal | Finanças pessoais",
  description: "Acompanhe receitas, despesas e categorias do seu mês.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body><Provider><NavegacaoApp>{children}</NavegacaoApp></Provider></body>
    </html>
  );
}

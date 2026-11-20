import { render, screen } from "@testing-library/react";
import NavegacaoApp from "./NavegacaoApp";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe("NavegacaoApp", () => {
    it.each([["/", "Início"], ["/lancamentos", "Lançamentos"], ["/resumo", "Resumo"]])("marca %s como rota ativa", (rota, rotulo) => {
        jest.mocked(usePathname).mockReturnValue(rota);
        render(<NavegacaoApp><div>Conteúdo da rota</div></NavegacaoApp>);
        expect(screen.getByRole("link", { name: new RegExp(rotulo, "i") })).toHaveAttribute("aria-current", "page");
        expect(screen.getByText("Conteúdo da rota")).toBeInTheDocument();
        expect(screen.getAllByRole("link")).toHaveLength(3);
    });

    it("não marca rota inativa como selecionada", () => {
        jest.mocked(usePathname).mockReturnValue("/resumo");
        render(<NavegacaoApp>{null}</NavegacaoApp>);
        expect(screen.getByRole("link", { name: /início/i })).not.toHaveAttribute("aria-current");
    });
});

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import GerenciarCategorias from "./GerenciarCategorias";
import { context } from "@/context/Context";
import type { ContextType } from "@/types/types";

function criarContexto(): ContextType {
    return {
        registros: [], metas: [],
        categorias: [
            { id: "mercado", nome: "Mercado", tipo: "despesa" },
            { id: "lazer", nome: "Lazer", tipo: "despesa" },
            { id: "salario", nome: "Salário", tipo: "receita" },
        ],
        statusPersistencia: "disponivel", erroPersistencia: null,
        adicionarRegistro: jest.fn(), atualizarRegistro: jest.fn(), deletarRegistro: jest.fn(),
        criarCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        renomearCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        excluirCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        definirMeta: jest.fn(),
    };
}

function renderizar(value = criarContexto()) { return { ...render(<context.Provider value={value}><GerenciarCategorias /></context.Provider>), value }; }

describe("GerenciarCategorias", () => {
    it("mostra grupos e total de categorias", () => {
        renderizar();
        expect(screen.getByRole("heading", { name: "Suas categorias" })).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Despesas" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Receitas" })).toBeInTheDocument();
    });

    it("cria uma categoria com nome e tipo informados", async () => {
        const { value } = renderizar();
        fireEvent.change(screen.getByLabelText("Nome da categoria"), { target: { value: "Pets" } });
        fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "receita" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Adicionar categoria" }).closest("form")!); });
        expect(value.criarCategoria).toHaveBeenCalledWith({ nome: "Pets", tipo: "receita" });
        expect(screen.getByRole("status")).toHaveTextContent("Categoria criada");
    });

    it("exibe o erro retornado ao tentar criar categoria", async () => {
        const value = criarContexto();
        jest.mocked(value.criarCategoria).mockResolvedValue({ sucesso: false, erro: "Nome duplicado." });
        renderizar(value);
        fireEvent.change(screen.getByLabelText("Nome da categoria"), { target: { value: "Pets" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Adicionar categoria" }).closest("form")!); });
        expect(screen.getByRole("status")).toHaveTextContent("Nome duplicado.");
    });

    it("renomeia uma categoria", async () => {
        const { value } = renderizar();
        const row = screen.getByText("Mercado").parentElement!;
        fireEvent.click(within(row).getByRole("button", { name: "Renomear" }));
        fireEvent.change(screen.getByRole("textbox", { name: "Novo nome para Mercado" }), { target: { value: "Alimentação" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Salvar" }).closest("form")!); });
        expect(value.renomearCategoria).toHaveBeenCalledWith("mercado", "Alimentação");
        expect(screen.getByRole("status")).toHaveTextContent("Categoria atualizada");
    });

    it("desabilita exclusão de categoria vinculada a lançamento", () => {
        const value = criarContexto();
        value.registros = [{ id: "r1", tipo: "despesa", categoriaId: "mercado", descricao: "Compra", valor: 10, data: "2026-11-19" }];
        renderizar(value);
        const row = screen.getByText("Mercado").parentElement!;
        expect(within(row).getByRole("button", { name: "Excluir" })).toBeDisabled();
        expect(within(row).getByText("1 lançamento")).toBeInTheDocument();
    });

    it("permite remover categoria sem uso e envia seu ID", async () => {
        const { value } = renderizar();
        const row = screen.getByText("Lazer").parentElement!;
        await act(async () => { fireEvent.click(within(row).getByRole("button", { name: "Excluir" })); });
        expect(value.excluirCategoria).toHaveBeenCalledWith("lazer");
    });

    it("desabilita alterações enquanto a persistência carrega", () => {
        const value = { ...criarContexto(), statusPersistencia: "carregando" as const };
        renderizar(value);
        expect(screen.getByRole("button", { name: "Adicionar categoria" })).toBeDisabled();
    });
});

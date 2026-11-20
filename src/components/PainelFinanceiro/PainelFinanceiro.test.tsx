import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PainelFinanceiro from "./PainelFinanceiro";
import { context } from "@/context/Context";
import { dataLocalISO } from "@/utils/validarRegistro";
import type { ContextType } from "@/types/types";

function criarContexto(): ContextType {
    const hoje = dataLocalISO();
    return {
        registros: [
            { id: "r1", tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 3500, data: hoje },
            { id: "r2", tipo: "despesa", categoriaId: "alimentacao", descricao: "Mercado", valor: 128.5, data: hoje },
        ],
        categorias: [
            { id: "salario", nome: "Salário", tipo: "receita" },
            { id: "alimentacao", nome: "Alimentação", tipo: "despesa" },
        ],
        metas: [{ competencia: hoje.slice(0, 7), valor: 1000 }],
        statusPersistencia: "disponivel", erroPersistencia: null,
        adicionarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        atualizarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        deletarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        criarCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        renomearCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        excluirCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        definirMeta: jest.fn().mockResolvedValue({ sucesso: true }),
    };
}

function renderizar(pagina: "inicio" | "lancamentos" | "resumo", dados = criarContexto()) {
    return { ...render(<context.Provider value={dados}><PainelFinanceiro pagina={pagina} /></context.Provider>), dados };
}

describe("PainelFinanceiro", () => {
    beforeEach(() => localStorage.clear());

    it("na página inicial mostra saldo, gastos e deixa o formulário recolhido", () => {
        renderizar("inicio");
        expect(screen.getByRole("heading", { name: "Seu mês com mais clareza" })).toBeInTheDocument();
        expect(screen.getByText("Disponível neste mês")).toBeInTheDocument();
        expect(screen.getByText("Gasto até agora")).toBeInTheDocument();
        expect(screen.queryByRole("textbox", { name: "Descrição" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /adicionar lançamento/i }));
        expect(screen.getByRole("textbox", { name: "Descrição" })).toBeInTheDocument();
        expect(screen.getByText("Mercado")).toBeInTheDocument();
    });

    it("apresenta resumo mensal, meta e gastos por categoria na rota de resumo", () => {
        renderizar("resumo");
        expect(screen.getByRole("heading", { name: "Resumo do mês" })).toBeInTheDocument();
        expect(screen.getByText("Receitas")).toBeInTheDocument();
        expect(screen.getByText("Despesas")).toBeInTheDocument();
        expect(screen.getByText("Despesas por categoria")).toBeInTheDocument();
        expect(screen.getByText("Alimentação")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", { name: "Progresso da meta mensal" })).toBeInTheDocument();
    });

    it("salva a meta informada", async () => {
        const { dados } = renderizar("resumo");
        fireEvent.change(screen.getByLabelText("Definir objetivo mensal"), { target: { value: "1200" } });
        await act(async () => { fireEvent.submit(screen.getByLabelText("Definir objetivo mensal").closest("form")!); });
        expect(dados.definirMeta).toHaveBeenCalledWith(dataLocalISO().slice(0, 7), 1200);
        expect(screen.getByText("Meta salva.")).toBeInTheDocument();
    });

    it("abre o seletor ao clicar no controle e recupera o mês atual ao limpar", () => {
        renderizar("resumo");
        const input = screen.getByLabelText("Selecionar mês") as HTMLInputElement;
        const showPicker = jest.fn();
        Object.defineProperty(input, "showPicker", { configurable: true, value: showPicker });
        fireEvent.click(screen.getByRole("button", { name: /selecionar período/i }));
        expect(showPicker).toHaveBeenCalledTimes(1);
        fireEvent.change(input, { target: { value: "" } });
        expect(input).toHaveValue(dataLocalISO().slice(0, 7));
    });

    it("permite alternar o tema e sincroniza a preferência local", async () => {
        renderizar("inicio");
        const botao = screen.getByRole("button", { name: /ativar tema (claro|escuro)/i });
        const temaAnterior = botao.getAttribute("aria-label");
        fireEvent.click(botao);
        await waitFor(() => expect(screen.getByRole("button", { name: /ativar tema (claro|escuro)/i }).getAttribute("aria-label")).not.toBe(temaAnterior));
        expect(localStorage.getItem("controle-mensal:tema")).toMatch(/^(claro|escuro)$/);
    });

    it("na página de lançamentos exibe histórico e atalho de categorias", () => {
        renderizar("lancamentos");
        expect(screen.getByRole("heading", { name: "Lançamentos do mês" })).toBeInTheDocument();
        expect(screen.getByText("Mercado")).toBeInTheDocument();
        expect(screen.getByText(/Criar ou organizar categorias/)).toBeInTheDocument();
        expect(document.getElementById("filtro-tipo")).toBeInTheDocument();
    });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Formulario from "./Formulario";
import { context } from "@/context/Context";
import type { ContextType, Registro } from "@/types/types";

function criarContexto(): ContextType {
    return {
        registros: [], metas: [],
        categorias: [
            { id: "mercado", nome: "Mercado", tipo: "despesa" },
            { id: "salario", nome: "Salário", tipo: "receita" },
        ],
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

function renderizar(contexto: ContextType, props: React.ComponentProps<typeof Formulario> = {}) {
    return render(<context.Provider value={contexto}><Formulario {...props} /></context.Provider>);
}

describe("Formulario", () => {
    it("mostra campos essenciais, data inicial e categorias do tipo selecionado", () => {
        renderizar(criarContexto());
        expect(screen.getByRole("combobox", { name: /tipo de registro/i })).toHaveValue("despesa");
        expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveValue("mercado");
        expect(screen.getByRole("textbox", { name: "Descrição" })).toBeInTheDocument();
        expect(screen.getByRole("spinbutton", { name: "Valor" })).toBeInTheDocument();
        expect((screen.getByLabelText("Data") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("altera o tipo e seleciona uma categoria compatível", () => {
        renderizar(criarContexto());
        fireEvent.change(screen.getByRole("combobox", { name: /tipo de registro/i }), { target: { value: "receita" } });
        expect(screen.getByRole("combobox", { name: "Categoria" })).toHaveValue("salario");
    });

    it("mostra erros de validação e não chama o salvamento com dados vazios", async () => {
        const contexto = criarContexto();
        renderizar(contexto);
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: /adicionar registro/i }).closest("form")!); });
        expect(screen.getByText("A descrição é obrigatória.")).toBeInTheDocument();
        expect(screen.getByText(/Informe um valor maior que zero/)).toBeInTheDocument();
        expect(contexto.adicionarRegistro).not.toHaveBeenCalled();
    });

    it("salva os dados normalizados com categoria e data civil", async () => {
        const contexto = criarContexto();
        renderizar(contexto);
        fireEvent.change(screen.getByRole("textbox", { name: "Descrição" }), { target: { value: "  Salário  " } });
        fireEvent.change(screen.getByRole("spinbutton", { name: "Valor" }), { target: { value: "3000" } });
        fireEvent.change(screen.getByRole("combobox", { name: /tipo de registro/i }), { target: { value: "receita" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: /adicionar registro/i }).closest("form")!); });
        await waitFor(() => expect(contexto.adicionarRegistro).toHaveBeenCalledWith(expect.objectContaining({ tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 3000, data: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })));
    });

    it("limpa os campos depois de cadastrar", async () => {
        const contexto = criarContexto();
        renderizar(contexto);
        fireEvent.change(screen.getByRole("textbox", { name: "Descrição" }), { target: { value: "Compra" } });
        fireEvent.change(screen.getByRole("spinbutton", { name: "Valor" }), { target: { value: "25" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: /adicionar registro/i }).closest("form")!); });
        expect(screen.getByRole("textbox", { name: "Descrição" })).toHaveValue("");
        expect(screen.getByRole("spinbutton", { name: "Valor" })).toHaveValue(null);
    });

    it("carrega e salva uma edição preservando o ID", async () => {
        const contexto = criarContexto();
        const registro: Registro = { id: "r1", tipo: "despesa", categoriaId: "mercado", descricao: "Compra", valor: 10, data: "2026-11-01" };
        renderizar(contexto, { registroEditar: registro });
        expect(screen.getByRole("textbox", { name: "Descrição" })).toHaveValue("Compra");
        fireEvent.change(screen.getByRole("spinbutton", { name: "Valor" }), { target: { value: "12" } });
        await act(async () => { fireEvent.submit(screen.getByRole("button", { name: /salvar alterações/i }).closest("form")!); });
        expect(contexto.atualizarRegistro).toHaveBeenCalledWith("r1", expect.objectContaining({ valor: 12 }));
    });

    it("recolhe o formulário sem perder o rascunho", () => {
        renderizar(criarContexto(), { recolhivel: true, inicialmenteAberto: false });
        expect(screen.queryByRole("textbox", { name: "Descrição" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /adicionar lançamento/i }));
        fireEvent.change(screen.getByRole("textbox", { name: "Descrição" }), { target: { value: "Rascunho" } });
        fireEvent.click(screen.getByRole("button", { name: /fechar formulário/i }));
        fireEvent.click(screen.getByRole("button", { name: /adicionar lançamento/i }));
        expect(screen.getByRole("textbox", { name: "Descrição" })).toHaveValue("Rascunho");
    });

    it("não permite enviar quando armazenamento está indisponível", () => {
        const contexto = { ...criarContexto(), statusPersistencia: "erro" as const };
        renderizar(contexto);
        expect(screen.getByRole("button", { name: /adicionar registro/i })).toBeDisabled();
    });
});

import { fireEvent, render, screen } from "@testing-library/react";
import Formulario from "./Formulario";
import { context } from "@/context/Context";
import type { ContextType } from "@/types/types";


describe("Formulario", () => {
    
    const mockContext: ContextType = {
        registros: [],
        metas: [],
        categorias: [
            { id: "outros-despesa", nome: "Outros", tipo: "despesa" },
            { id: "salario", nome: "Salário", tipo: "receita" },
        ],
        statusPersistencia: "disponivel",
        erroPersistencia: null,
        adicionarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        atualizarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        deletarRegistro: jest.fn().mockResolvedValue({ sucesso: true }),
        criarCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        renomearCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        excluirCategoria: jest.fn().mockResolvedValue({ sucesso: true }),
        definirMeta: jest.fn().mockResolvedValue({ sucesso: true }),
    };

    beforeEach(() => {
    jest.clearAllMocks();
    });

    it("deve renderizar todos os campos do formulario", () => {
        render(
            <context.Provider value={mockContext}>
                <Formulario/>
            </context.Provider>
        );

        expect(screen.getByRole("combobox", {name: /tipo de registro/i})).toBeInTheDocument();
        expect(screen.getByRole("textbox", {name: /descrição/i})).toBeInTheDocument();
        expect(screen.getByRole("spinbutton", {name: /valor/i})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: /adicionar registro/i})).toBeInTheDocument();
    });

    it("Deve exibir erros ao enviar formulario vazio", () => {
       
        render(
            <context.Provider value={mockContext}>
                <Formulario/>
            </context.Provider>
        );

        const botao = screen.getByRole("button", {name: /adicionar registro/i});

        fireEvent.click(botao);

        expect(screen.getByText("A descrição é obrigatoria")).toBeInTheDocument();
        expect(screen.getByText("Informe um valor valido maior que 0")).toBeInTheDocument();
        expect(mockContext.adicionarRegistro).not.toHaveBeenCalled();
    });

    it("Deve casdastrar um registro valido", () => {
        render(
            <context.Provider value={mockContext}>
                <Formulario/>
            </context.Provider>
        );

        fireEvent.change(screen.getByRole("combobox", {
            name: /tipo/i
        }),{
            target: { value: "receita" }
        });

        fireEvent.change(screen.getByRole("textbox", {
            name: /descrição/i
        }), {
            target: { value: "Salario" }
        });

        fireEvent.change(screen.getByRole("spinbutton", {
            name: /valor/i
        }), {
            target: { value: 3000 }
        });

        fireEvent.click(screen.getByRole("button", {
            name: /adicionar registro/i
        }));

        expect(mockContext.adicionarRegistro).toHaveBeenCalledWith({
            tipo: "receita",
            descricao: "Salario",
            valor: 3000
        });
    });

    it("Deve limpar os campos após cadastrar o registro", () => {
        render(
            <context.Provider value={mockContext}>
                <Formulario/>
            </context.Provider>
        );

        fireEvent.change(screen.getByRole("combobox", {
                name: /tipo/i
            }), {
                target: { value: "receita"}
            });

        fireEvent.change(screen.getByRole("textbox", {
            name: /descrição/i
        }), {
            target: { value: "Salario" }
        });

        fireEvent.change(screen.getByRole("spinbutton", {
            name: /valor/i
        }), {
            target: { value: 3000 }
        });

        fireEvent.click(screen.getByRole("button", { name: /adicionar registro/i}));

        expect(screen.getByRole("combobox", {
            name: /tipo/i
        })).toHaveValue("despesa");

        expect(screen.getByRole("textbox", {
            name: /descrição/i
        })).toHaveValue("");

        expect(screen.getByRole("spinbutton", {
            name: /valor/i
        })).toHaveValue(null);

        expect(mockContext.adicionarRegistro).toHaveBeenCalledTimes(1);

    });    
});

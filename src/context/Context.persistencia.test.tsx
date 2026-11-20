import { renderHook, act, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { Provider, context } from "./Context";

function prepararFalhaDeLeitura() {
    const dadosOriginais = JSON.stringify([
        {
            id: "registro-1",
            tipo: "receita",
            descricao: "Salário",
            valor: 5000,
        },
    ]);

    localStorage.setItem("registros", dadosOriginais);

    const getItemSpy = jest
        .spyOn(Storage.prototype, "getItem")
        .mockImplementation(() => {
            throw new Error("Falha simulada de leitura");
        });

    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    jest.spyOn(console, "error").mockImplementation(() => {});

    return {
        dadosOriginais,
        getItemSpy,
        setItemSpy,
    };
}

describe("Context - Persistência", () => {

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider>{children}</Provider>
    );

    const registroSalvo = {
        id: "registro-1",
        tipo: "receita",
        descricao: "Salário",
        valor: 3000,
    };

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
    jest.restoreAllMocks();
    });

    // RECUPERAÇÃO
    it("deve recuperar os registros salvos no localStorage", async () => {
        localStorage.setItem(
            "registros",
            JSON.stringify([registroSalvo])
        );

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toHaveLength(1);
        });

        expect(result.current?.registros[0]).toEqual(registroSalvo);
    });

    // ADIÇÃO
    it("deve salvar um novo registro no localStorage", async () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        act(() => {
            result.current?.adicionarRegistro({
                tipo: "despesa",
                descricao: "Mercado",
                valor: 500,
            });
        });

        await waitFor(() => {
            const registrosSalvos = JSON.parse(
                localStorage.getItem("registros") || "[]"
            );

            expect(registrosSalvos).toHaveLength(1);
            expect(registrosSalvos[0]).toMatchObject({
                tipo: "despesa",
                descricao: "Mercado",
                valor: 500,
            });
        });
    });

    // ATUALIZAÇÃO
    it("deve persistir a atualização de um registro", async () => {
        localStorage.setItem(
            "registros",
            JSON.stringify([registroSalvo])
        );

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toHaveLength(1);
        });

        act(() => {
            result.current?.atualizarRegistro("registro-1", {
                tipo: "receita",
                descricao: "Salário atualizado",
                valor: 3500,
            });
        });

        await waitFor(() => {
            const registrosSalvos = JSON.parse(
                localStorage.getItem("registros") || "[]"
            );

            expect(registrosSalvos[0]).toMatchObject({
                id: "registro-1",
                descricao: "Salário atualizado",
                valor: 3500,
            });
        });
    });

    // EXCLUSÃO
    it("deve persistir a exclusão de um registro", async () => {
        localStorage.setItem(
            "registros",
            JSON.stringify([registroSalvo])
        );

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toHaveLength(1);
        });

        act(() => {
            result.current?.deletarRegistro("registro-1");
        });

        await waitFor(() => {
            const registrosSalvos = JSON.parse(
                localStorage.getItem("registros") || "[]"
            );

            expect(registrosSalvos).toHaveLength(0);
        });
    });

    // DADOS INVÁLIDOS
    it("deve ignorar registros inválidos durante a recuperação", async () => {
        const dados = [
            registroSalvo,
            {
                id: "",
                tipo: "despesa",
                descricao: "Mercado",
                valor: 200,
            },
            {
                id: "registro-3",
                tipo: "despesa",
                descricao: "Conta de luz",
                valor: -100,
            },
        ];

        localStorage.setItem("registros", JSON.stringify(dados));

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toHaveLength(1);
        });

        expect(result.current?.registros[0]).toEqual(registroSalvo);

        await waitFor(() => {
            const registrosSalvos = JSON.parse(
                localStorage.getItem("registros") || "[]"
            );

            expect(registrosSalvos).toHaveLength(1);
        });
    });

    // JSON CORROMPIDO
    it("não deve sobrescrever os dados quando o JSON estiver corrompido", () => {
        const dadosCorrompidos = "{ registros inválidos ";

        localStorage.setItem("registros", dadosCorrompidos);

        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            renderHook(
                () => useContext(context),
                { wrapper }
            );

            expect(localStorage.getItem("registros")).toBe(
                dadosCorrompidos
            );

        } finally {
            consoleError.mockRestore();
        }
    });

    it("deve tratar erros durante a leitura do localStorage", () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        jest.spyOn(Storage.prototype, "getItem")
            .mockImplementation(() => {
                throw new Error("Falha na leitura");
            });

        try {
            const { result } = renderHook(
                () => useContext(context),
                { wrapper }
            );

            expect(result.current?.registros).toHaveLength(0);
            expect(consoleError).toHaveBeenCalled();

        } finally {
            consoleError.mockRestore();
        }
    });

    it("deve tratar erros durante a gravação no localStorage", () => {
        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        jest.spyOn(Storage.prototype, "setItem")
            .mockImplementation(() => {
                throw new Error("Falha na gravação");
            });

        try {
            const { result } = renderHook(
                () => useContext(context),
                { wrapper }
            );

            act(() => {
                result.current?.adicionarRegistro({
                    tipo: "despesa",
                    descricao: "Mercado",
                    valor: 500,
                });
            });

            expect(result.current?.registros).toHaveLength(1);
            expect(consoleError).toHaveBeenCalled();

        } finally {
            consoleError.mockRestore();
        }
    });

    it("deve ignorar registros com IDs duplicados", async () => {
        const registrosDuplicados = [
            registroSalvo,
            {
                id: "registro-1",
                tipo: "despesa",
                descricao: "Mercado",
                valor: 500,
            },
        ];

        localStorage.setItem(
            "registros",
            JSON.stringify(registrosDuplicados)
        );

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toHaveLength(1);
        });

        expect(result.current?.registros[0].descricao).toBe("Salário");

        await waitFor(() => {
            const registrosSalvos = JSON.parse(
                localStorage.getItem("registros") || "[]"
            );

            expect(registrosSalvos).toHaveLength(1);
        });
    });

    it("não deve sobrescrever dados quando o JSON não representar uma lista", () => {
        const dadosInvalidos = JSON.stringify({
            nome: "Victor",
            valor: 3000,
        });

        localStorage.setItem("registros", dadosInvalidos);

        const consoleError = jest
            .spyOn(console, "error")
            .mockImplementation(() => {});

        try {
            const { result } = renderHook(
                () => useContext(context),
                { wrapper }
            );

            expect(result.current?.registros).toHaveLength(0);

            expect(localStorage.getItem("registros")).toBe(
                dadosInvalidos
            );

        } finally {
            consoleError.mockRestore();
        }
    });

    it("deve iniciar com uma lista vazia quando não existem registros salvos", async () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        expect(result.current?.registros).toHaveLength(0);

        await waitFor(() => {
            expect(localStorage.getItem("registros")).toBe("[]");
        });
    });

    it("deve recuperar corretamente uma lista vazia", async () => {

        localStorage.setItem("registros", JSON.stringify([]));

        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        await waitFor(() => {
            expect(result.current?.registros).toEqual([]);
        });
    });

    it("não deve adicionar registros quando ocorrer erro de leitura", () => {
        const { dadosOriginais, getItemSpy, setItemSpy } =
            prepararFalhaDeLeitura();

        const { result } = renderHook(() => useContext(context), { wrapper });

        act(() => {
            result.current?.adicionarRegistro({
                tipo: "receita",
                descricao: "Salário",
                valor: 5000,
            });
        });

        expect(result.current?.registros).toEqual([]);
        expect(setItemSpy).not.toHaveBeenCalled();

        getItemSpy.mockRestore();

        expect(localStorage.getItem("registros")).toBe(dadosOriginais);
    });

    it("não deve atualizar registros quando ocorrer erro de leitura", () => {
        const { dadosOriginais, getItemSpy, setItemSpy } =
            prepararFalhaDeLeitura();

        const { result } = renderHook(() => useContext(context), { wrapper });

        act(() => {
            result.current?.atualizarRegistro("registro-1", {
                tipo: "receita",
                descricao: "Salário atualizado",
                valor: 6000,
            });
        });

        expect(result.current?.registros).toEqual([]);
        expect(setItemSpy).not.toHaveBeenCalled();

        getItemSpy.mockRestore();

        expect(localStorage.getItem("registros")).toBe(dadosOriginais);
    });

    it("não deve excluir registros quando ocorrer erro de leitura", () => {
        const { dadosOriginais, getItemSpy, setItemSpy } =
            prepararFalhaDeLeitura();

        const { result } = renderHook(() => useContext(context), { wrapper });

        act(() => {
            result.current?.deletarRegistro("registro-1");
        });

        expect(result.current?.registros).toEqual([]);
        expect(setItemSpy).not.toHaveBeenCalled();

        getItemSpy.mockRestore();

        expect(localStorage.getItem("registros")).toBe(dadosOriginais);
    });

});
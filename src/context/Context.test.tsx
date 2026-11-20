import { renderHook, act } from "@testing-library/react";
import { useContext } from "react";
import { Provider, context } from "./Context";
import type { Entrada } from "@/types/types";

describe("Context - CRUD", () => {

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider>{children}</Provider>
    );

    beforeEach(() => {
        localStorage.clear();
    });

    // ADICIONAR REGISTRO
    it("deve adicionar um registro válido", () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        const novoRegistro: Entrada = {
            tipo: "receita",
            categoriaId: "salario",
            descricao: "Salário",
            valor: 3000,
            data: "2026-11-19",
        };

        act(() => {
            result.current?.adicionarRegistro(novoRegistro);
        });

        expect(result.current?.registros).toHaveLength(1);

        expect(result.current?.registros[0]).toMatchObject({
            tipo: "receita",
            descricao: "Salário",
            valor: 3000,
        });

        expect(result.current?.registros[0].id).toBeTruthy();
    });

    it("não deve adicionar um registro inválido", () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        const registroInvalido = {
            tipo: "despesa",
            descricao: "Mercado",
            valor: -100,
        } as Entrada;

        act(() => {
            result.current?.adicionarRegistro(registroInvalido);
        });

        expect(result.current?.registros).toHaveLength(0);
    });

    it("deve gerar IDs diferentes para registros diferentes", () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        act(() => {
            result.current?.adicionarRegistro({
                tipo: "receita",
                descricao: "Salário",
                valor: 3000,
            });

            result.current?.adicionarRegistro({
                tipo: "despesa",
                descricao: "Mercado",
                valor: 500,
            });
        });

        const registros = result.current?.registros;

        expect(registros).toHaveLength(2);
        expect(registros?.[0].id).not.toBe(registros?.[1].id);
    });

    // ATUALIZAR REGISTRO
    it("deve atualizar um registro existente", () => {
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

        const registroId = result.current!.registros[0].id;

        act(() => {
            result.current?.atualizarRegistro(registroId, {
                tipo: "despesa",
                descricao: "Supermercado",
                valor: 650,
            });
        });

        expect(result.current?.registros[0]).toMatchObject({
            id: registroId,
            tipo: "despesa",
            descricao: "Supermercado",
            valor: 650,
        });
    });

    it("deve preservar o ID original durante a atualização", () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        act(() => {
            result.current?.adicionarRegistro({
                tipo: "receita",
                descricao: "Salário",
                valor: 3000,
            });
        });

        const idOriginal = result.current!.registros[0].id;

        act(() => {
            result.current?.atualizarRegistro(idOriginal, {
                tipo: "receita",
                descricao: "Salário atualizado",
                valor: 3500,
            });
        });

        expect(result.current?.registros[0].id).toBe(idOriginal);
    });

    it("não deve modificar outros registros durante uma atualização", () => {
        const { result } = renderHook(
            () => useContext(context),
            { wrapper }
        );

        act(() => {
            result.current?.adicionarRegistro({
                tipo: "receita",
                descricao: "Salário",
                valor: 3000,
            });

            result.current?.adicionarRegistro({
                tipo: "despesa",
                descricao: "Mercado",
                valor: 500,
            });
        });

        const segundoRegistro = result.current!.registros[1];

        act(() => {
            result.current?.atualizarRegistro(
                result.current!.registros[0].id,
                {
                    tipo: "receita",
                    descricao: "Novo salário",
                    valor: 4000,
                }
            );
        });

        expect(result.current?.registros[1]).toEqual(segundoRegistro);
    });

    // EXCLUIR REGISTRO
    it("deve excluir um registro existente", () => {
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

            result.current?.adicionarRegistro({
                tipo: "receita",
                descricao: "Salário",
                valor: 3000,
            });
        });

        const registroId = result.current!.registros[0].id;

        act(() => {
            result.current?.deletarRegistro(registroId);
        });

        expect(result.current?.registros).toHaveLength(1);
        expect(result.current?.registros[0].descricao).toBe("Salário");
    });

    it("não deve excluir registros quando o ID não existir", () => {
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

        act(() => {
            result.current?.deletarRegistro("id-inexistente");
        });

        expect(result.current?.registros).toHaveLength(1);
    });
});

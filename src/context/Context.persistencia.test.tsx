import { act, renderHook, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { Provider, context } from "./Context";
import type { ContextType, Registro } from "@/types/types";

const registro: Registro = { id: "r1", tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 3000, data: "2026-11-19" };

function montarProvider() {
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>;
    return renderHook(() => useContext(context), { wrapper });
}

async function esperarPronto(result: { current: ContextType | null }) {
    await waitFor(() => expect(result.current?.statusPersistencia).toBe("disponivel"));
}

describe("Provider e armazenamento local", () => {
    beforeEach(() => localStorage.clear());

    it("carrega dados no formato versionado atual", async () => {
        localStorage.setItem("controle-financeiro.registros", JSON.stringify({ versao: 3, registros: [registro] }));
        const hook = montarProvider();
        await waitFor(() => expect(hook.result.current?.registros).toEqual([registro]));
        expect(hook.result.current?.statusPersistencia).toBe("disponivel");
    });

    it("migra a lista da versão antiga e grava o novo envelope", async () => {
        const legado = [{ id: "r-antigo", tipo: "despesa", categoria: "outros", descricao: "Café", valor: 8, data: "2026-11-19" }];
        localStorage.setItem("registros", JSON.stringify(legado));
        const hook = montarProvider();
        await waitFor(() => expect(hook.result.current?.statusPersistencia).toBe("disponivel"));
        expect(hook.result.current?.registros).toMatchObject([{ id: "r-antigo", categoriaId: "outros-despesa" }]);
        expect(JSON.parse(localStorage.getItem("controle-financeiro.registros") ?? "null").versao).toBe(3);
    });

    it("não sobrescreve dados corrompidos e expõe status de erro", async () => {
        const corrompido = "{json incompleto";
        localStorage.setItem("controle-financeiro.registros", corrompido);
        const hook = montarProvider();
        await waitFor(() => expect(hook.result.current?.statusPersistencia).toBe("erro"));
        expect(hook.result.current?.erroPersistencia).toBeTruthy();
        expect(localStorage.getItem("controle-financeiro.registros")).toBe(corrompido);
    });

    it("bloqueia gravação se uma operação for chamada antes de carregar", async () => {
        let liberar!: (registros: Registro[]) => void;
        const repository = {
            carregar: () => new Promise<Registro[]>((resolve) => { liberar = resolve; }),
            salvar: jest.fn().mockResolvedValue(undefined),
        };
        const wrapper = ({ children }: { children: React.ReactNode }) => <Provider repository={repository}>{children}</Provider>;
        const hook = renderHook(() => useContext(context), { wrapper });
        let resultado!: { sucesso: boolean };
        await act(async () => {
            resultado = await hook.result.current!.adicionarRegistro({ tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 10, data: "2026-11-19" });
        });
        expect(resultado.sucesso).toBe(false);
        expect(repository.salvar).not.toHaveBeenCalled();
        await act(async () => { liberar([]); });
        await waitFor(() => expect(hook.result.current?.statusPersistencia).toBe("disponivel"));
    });

    it("falha com segurança se um registro referenciar categoria incompatível", async () => {
        const inválido = { ...registro, categoriaId: "alimentacao" };
        localStorage.setItem("controle-financeiro.registros", JSON.stringify({ versao: 3, registros: [inválido] }));
        const hook = montarProvider();
        await waitFor(() => expect(hook.result.current?.statusPersistencia).toBe("erro"));
        expect(hook.result.current?.registros).toEqual([]);
        expect(localStorage.getItem("controle-financeiro.registros")).toContain("alimentacao");
    });

    it("persiste operações nas chaves atuais e não na chave legada", async () => {
        const hook = montarProvider();
        await esperarPronto(hook.result);
        await act(async () => { await hook.result.current!.adicionarRegistro({ tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 100, data: "2026-11-19" }); });
        expect(JSON.parse(localStorage.getItem("controle-financeiro.registros") ?? "null").registros).toHaveLength(1);
        expect(localStorage.getItem("registros")).toBeNull();
    });
});

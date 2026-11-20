import { act, renderHook, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { Provider, context } from "./Context";
import { MemoryCategoriaRepository, MemoryMetaRepository, MemoryRegistroRepository } from "@/test/memoryRepositories";
import type { Categoria, ContextType, ResultadoCriacao } from "@/types/types";

function harness(categoriasRepository = new MemoryCategoriaRepository(), repository = new MemoryRegistroRepository(), metasRepository = new MemoryMetaRepository()) {
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider repository={repository} categoriasRepository={categoriasRepository} metasRepository={metasRepository}>{children}</Provider>;
    const hook = renderHook(() => useContext(context), { wrapper });
    return { ...hook, repository, categoriasRepository, metasRepository };
}

async function aguardarDisponibilidade(result: { current: ContextType | null }) {
    await waitFor(() => expect(result.current?.statusPersistencia).toBe("disponivel"));
}

describe("Provider: regras e operações", () => {
    it("carrega as três fontes antes de habilitar operações", async () => {
        const h = harness();
        expect(h.result.current?.statusPersistencia).toBe("carregando");
        await aguardarDisponibilidade(h.result);
        expect(h.result.current?.categorias.length).toBeGreaterThan(0);
    });

    it("cria lançamento válido, normaliza texto e gera ID", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        let resultado!: ResultadoCriacao;
        await act(async () => { resultado = await h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "alimentacao", descricao: " Mercado ", valor: 15, data: "2026-11-19" }); });
        expect(resultado.sucesso).toBe(true);
        expect(h.result.current?.registros[0]).toMatchObject({ id: expect.any(String), descricao: "Mercado", categoriaId: "alimentacao", valor: 15 });
        expect(h.repository.dados).toHaveLength(1);
    });

    it("rejeita dados inválidos e categoria que não corresponde ao tipo", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        let inválido!: { sucesso: boolean };
        let incompatível!: { sucesso: boolean; erro?: string };
        await act(async () => {
            inválido = await h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "alimentacao", descricao: "Ruim", valor: -2, data: "2026-11-19" });
            incompatível = await h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "salario", descricao: "Categoria errada", valor: 2, data: "2026-11-19" });
        });
        expect(inválido.sucesso).toBe(false);
        expect(incompatível).toMatchObject({ sucesso: false, erro: expect.stringContaining("categoria") });
        expect(h.result.current?.registros).toEqual([]);
    });

    it("serializa gravações concorrentes sem perder lançamentos", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        await act(async () => { await Promise.all([
            h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "alimentacao", descricao: "A", valor: 1, data: "2026-11-19" }),
            h.result.current!.adicionarRegistro({ tipo: "receita", categoriaId: "salario", descricao: "B", valor: 2, data: "2026-11-19" }),
        ]); });
        expect(h.result.current?.registros).toHaveLength(2);
        expect(h.repository.dados).toHaveLength(2);
    });

    it("atualiza preservando ID e rejeita alteração de registro inexistente", async () => {
        const repository = new MemoryRegistroRepository();
        repository.dados = [{ id: "r1", tipo: "despesa", categoriaId: "alimentacao", descricao: "Mercado", valor: 10, data: "2026-11-19" }];
        const h = harness(new MemoryCategoriaRepository(), repository); await aguardarDisponibilidade(h.result);
        let resultado!: { sucesso: boolean };
        let inexistente!: { sucesso: boolean };
        await act(async () => {
            resultado = await h.result.current!.atualizarRegistro("r1", { tipo: "despesa", categoriaId: "alimentacao", descricao: "Compras", valor: 20, data: "2026-11-20" });
            inexistente = await h.result.current!.atualizarRegistro("ausente", { tipo: "despesa", categoriaId: "alimentacao", descricao: "Compras", valor: 20, data: "2026-11-20" });
        });
        expect(resultado.sucesso).toBe(true);
        expect(h.result.current?.registros).toEqual([{ id: "r1", tipo: "despesa", categoriaId: "alimentacao", descricao: "Compras", valor: 20, data: "2026-11-20" }]);
        expect(inexistente.sucesso).toBe(false);
    });

    it("exclui apenas registro existente", async () => {
        const repository = new MemoryRegistroRepository();
        repository.dados = [{ id: "r1", tipo: "despesa", categoriaId: "alimentacao", descricao: "Mercado", valor: 10, data: "2026-11-19" }];
        const h = harness(new MemoryCategoriaRepository(), repository); await aguardarDisponibilidade(h.result);
        await act(async () => { await h.result.current!.deletarRegistro("r1"); });
        expect(h.result.current?.registros).toEqual([]);
        expect(repository.dados).toEqual([]);
    });

    it("cria categoria e impede nomes duplicados ignorando caixa e espaços", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        let criada!: { sucesso: boolean; categoria?: Categoria };
        let duplicada!: { sucesso: boolean };
        await act(async () => {
            criada = await h.result.current!.criarCategoria({ nome: "Pets", tipo: "despesa" });
            duplicada = await h.result.current!.criarCategoria({ nome: " pets ", tipo: "despesa" });
        });
        expect(criada.sucesso).toBe(true);
        expect(criada.categoria?.nome).toBe("Pets");
        expect(duplicada.sucesso).toBe(false);
    });

    it("renomeia categoria e impede conflito de nome", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        let renomeada!: { sucesso: boolean };
        let conflito!: { sucesso: boolean };
        await act(async () => {
            renomeada = await h.result.current!.renomearCategoria("alimentacao", "Comida");
            conflito = await h.result.current!.renomearCategoria("lazer", " moradia ");
        });
        expect(renomeada.sucesso).toBe(true);
        expect(h.result.current?.categorias.find((categoria) => categoria.id === "alimentacao")?.nome).toBe("Comida");
        expect(conflito.sucesso).toBe(false);
    });

    it("impede excluir categoria em uso ou a última do tipo", async () => {
        const categoriasRepository = new MemoryCategoriaRepository();
        const h = harness(categoriasRepository); await aguardarDisponibilidade(h.result);
        await act(async () => { await h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "alimentacao", descricao: "Compra", valor: 5, data: "2026-11-19" }); });
        let emUso!: { sucesso: boolean };
        await act(async () => { emUso = await h.result.current!.excluirCategoria("alimentacao"); });
        expect(emUso.sucesso).toBe(false);

        categoriasRepository.dados = [
            { id: "uma-despesa", nome: "Única despesa", tipo: "despesa" },
            { id: "uma-receita", nome: "Única receita", tipo: "receita" },
        ];
        const outro = harness(categoriasRepository); await aguardarDisponibilidade(outro.result);
        let ultima!: { sucesso: boolean };
        await act(async () => { ultima = await outro.result.current!.excluirCategoria("uma-despesa"); });
        expect(ultima.sucesso).toBe(false);
    });

    it("cria, substitui e remove metas mensais validando competência e centavos", async () => {
        const h = harness(); await aguardarDisponibilidade(h.result);
        await act(async () => { await h.result.current!.definirMeta("2026-11", 500.25); });
        expect(h.result.current?.metas).toEqual([{ competencia: "2026-11", valor: 500.25 }]);
        let inválida!: { sucesso: boolean };
        await act(async () => { inválida = await h.result.current!.definirMeta("2026-13", -1); });
        expect(inválida.sucesso).toBe(false);
        await act(async () => { await h.result.current!.definirMeta("2026-11", 0); });
        expect(h.result.current?.metas).toEqual([]);
    });

    it("mantém dados em memória sem declarar sucesso quando a gravação falha", async () => {
        const repository = new MemoryRegistroRepository();
        repository.salvar = async () => { throw new Error("Falha simulada"); };
        const h = harness(new MemoryCategoriaRepository(), repository); await aguardarDisponibilidade(h.result);
        let resultado!: { sucesso: boolean };
        await act(async () => { resultado = await h.result.current!.adicionarRegistro({ tipo: "despesa", categoriaId: "alimentacao", descricao: "Compra", valor: 5, data: "2026-11-19" }); });
        expect(resultado.sucesso).toBe(false);
        expect(h.result.current?.registros).toEqual([]);
        expect(h.result.current?.erroPersistencia).toBe("Falha simulada");
    });
});

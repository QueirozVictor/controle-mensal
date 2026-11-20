import { LocalStorageCategoriaRepository } from "./CategoriaRepository";
import { categoriasPadrao } from "@/utils/validarRegistro";
import type { Categoria } from "@/types/types";

describe("LocalStorageCategoriaRepository", () => {
    let repository: LocalStorageCategoriaRepository;
    beforeEach(() => { localStorage.clear(); repository = new LocalStorageCategoriaRepository(); });

    it("cria e persiste categorias iniciais se não houver dados", async () => {
        const categorias = await repository.carregar();
        expect(categorias).toEqual(categoriasPadrao());
        expect(JSON.parse(localStorage.getItem("controle-financeiro.categorias") ?? "null")).toEqual({ versao: 1, categorias });
    });

    it("recupera as categorias salvas", async () => {
        const categorias: Categoria[] = [
            { id: "c1", nome: "Casa", tipo: "despesa" },
            { id: "c2", nome: "Salário", tipo: "receita" },
        ];
        localStorage.setItem("controle-financeiro.categorias", JSON.stringify({ versao: 1, categorias }));
        await expect(repository.carregar()).resolves.toEqual(categorias);
    });

    it.each([
        ["IDs duplicados", [{ id: "x", nome: "Casa", tipo: "despesa" }, { id: "x", nome: "Outra", tipo: "receita" }, { id: "y", nome: "Salário", tipo: "receita" }]],
        ["nomes duplicados sem diferenciar caixa", [{ id: "x", nome: "Casa", tipo: "despesa" }, { id: "y", nome: " casa ", tipo: "despesa" }, { id: "z", nome: "Salário", tipo: "receita" }]],
        ["tipo obrigatório", [{ id: "x", nome: "Casa", tipo: "transferência" }, { id: "y", nome: "Salário", tipo: "receita" }]],
        ["pelo menos uma categoria por tipo", [{ id: "x", nome: "Casa", tipo: "despesa" }]],
    ])("rejeita %s sem substituir dados", async (_caso, categorias) => {
        const valorOriginal = JSON.stringify({ versao: 1, categorias });
        localStorage.setItem("controle-financeiro.categorias", valorOriginal);
        await expect(repository.carregar()).rejects.toThrow();
        expect(localStorage.getItem("controle-financeiro.categorias")).toBe(valorOriginal);
    });

    it("limita a quantidade de categorias ao salvar", async () => {
        const categorias = Array.from({ length: 201 }, (_, index) => ({ id: `c${index}`, nome: `Categoria ${index}`, tipo: index === 0 ? "receita" as const : "despesa" as const }));
        await expect(repository.salvar(categorias)).rejects.toThrow("Limite de categorias excedido");
    });
});

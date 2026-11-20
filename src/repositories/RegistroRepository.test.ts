import { LocalStorageRegistroRepository } from "./RegistroRepository";
import type { Registro } from "@/types/types";

const registro: Registro = { id: "r1", tipo: "despesa", categoriaId: "alimentacao", descricao: "Mercado", valor: 20.25, data: "2026-11-19" };

describe("LocalStorageRegistroRepository", () => {
    let repository: LocalStorageRegistroRepository;
    beforeEach(() => { localStorage.clear(); repository = new LocalStorageRegistroRepository(); });

    it("retorna vazio sem dados existentes", async () => {
        await expect(repository.carregar()).resolves.toEqual([]);
    });

    it("persiste e recupera envelope versionado", async () => {
        await repository.salvar([registro]);
        expect(JSON.parse(localStorage.getItem("controle-financeiro.registros") ?? "null")).toEqual({ versao: 3, registros: [registro] });
        await expect(repository.carregar()).resolves.toEqual([registro]);
    });

    it("migra registros da chave antiga sem apagá-la", async () => {
        const legado = [{ id: "old", tipo: "despesa", categoria: "outros", descricao: "Café", valor: 8, data: "2026-11-19" }];
        localStorage.setItem("registros", JSON.stringify(legado));
        await expect(repository.carregar()).resolves.toMatchObject([{ id: "old", categoriaId: "outros-despesa" }]);
        expect(localStorage.getItem("registros")).toBe(JSON.stringify(legado));
        expect(JSON.parse(localStorage.getItem("controle-financeiro.registros") ?? "null").versao).toBe(3);
    });

    it("migra envelope da versão 2", async () => {
        localStorage.setItem("controle-financeiro.registros", JSON.stringify({ versao: 2, registros: [{ id: "old", tipo: "receita", categoria: "outros", descricao: "Extra", valor: 30, data: "2026-11-19" }] }));
        await expect(repository.carregar()).resolves.toMatchObject([{ id: "old", categoriaId: "outros-receita" }]);
        expect(JSON.parse(localStorage.getItem("controle-financeiro.registros") ?? "null").versao).toBe(3);
    });

    it.each([
        ["JSON corrompido", "{bad"],
        ["versão desconhecida", JSON.stringify({ versao: 99, registros: [] })],
        ["IDs repetidos", JSON.stringify({ versao: 3, registros: [registro, registro] })],
        ["registros inválidos", JSON.stringify({ versao: 3, registros: [{ ...registro, valor: -1 }] })],
    ])("rejeita %s sem sobrescrever o conteúdo", async (_caso, valor) => {
        localStorage.setItem("controle-financeiro.registros", valor);
        await expect(repository.carregar()).rejects.toBeDefined();
        expect(localStorage.getItem("controle-financeiro.registros")).toBe(valor);
    });

    it("não grava registros inválidos", async () => {
        await expect(repository.salvar([{ ...registro, valor: Number.NaN }])).rejects.toThrow();
        expect(localStorage.getItem("controle-financeiro.registros")).toBeNull();
    });
});

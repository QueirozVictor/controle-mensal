import { LocalStorageMetaRepository } from "./MetaRepository";

describe("LocalStorageMetaRepository", () => {
    let repository: LocalStorageMetaRepository;
    beforeEach(() => { localStorage.clear(); repository = new LocalStorageMetaRepository(); });

    it("retorna lista vazia sem dados e persiste metas", async () => {
        await expect(repository.carregar()).resolves.toEqual([]);
        const metas = [{ competencia: "2026-11", valor: 500.25 }];
        await repository.salvar(metas);
        await expect(repository.carregar()).resolves.toEqual(metas);
    });

    it.each([
        { competencia: "2026-13", valor: 10 },
        { competencia: "2026-11", valor: -1 },
        { competencia: "2026-11", valor: Number.NaN },
        { competencia: "2026-11", valor: 10.123 },
    ])("rejeita meta inválida $competencia/$valor", async (meta) => {
        await expect(repository.salvar([meta])).rejects.toThrow("Meta inválida");
        expect(localStorage.getItem("controle-financeiro.metas")).toBeNull();
    });

    it("rejeita competências duplicadas ao carregar e preserva dados", async () => {
        const valor = JSON.stringify([{ competencia: "2026-11", valor: 100 }, { competencia: "2026-11", valor: 200 }]);
        localStorage.setItem("controle-financeiro.metas", valor);
        await expect(repository.carregar()).rejects.toThrow("Meta inválida");
        expect(localStorage.getItem("controle-financeiro.metas")).toBe(valor);
    });
});

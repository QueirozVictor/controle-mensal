import { categoriaValida, categoriasPadrao, dataISOValida, dadosTratados, migrarRegistroLegado, validarRegistro } from "./validarRegistro";

const entradaValida = {
    tipo: "despesa",
    categoriaId: "alimentacao",
    descricao: "Mercado",
    valor: 150.25,
    data: "2026-11-19",
};

describe("dadosTratados", () => {
    it("normaliza descrição e valor para centavos", () => {
        const resultado = dadosTratados({ ...entradaValida, descricao: "  Mercado  ", valor: 10.1 + 0.2 });
        expect(resultado).toEqual({
            valido: true,
            dados: { ...entradaValida, descricao: "Mercado", valor: 10.3 },
            erros: {},
        });
    });

    it.each(["", "   ", "x".repeat(151)])("rejeita descrição inválida (%s)", (descricao) => {
        const resultado = dadosTratados({ ...entradaValida, descricao });
        expect(resultado.valido).toBe(false);
        expect(resultado.erros.descricao).toBeDefined();
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 100_000_000, 1.001])("rejeita valor inválido %s", (valor) => {
        const resultado = dadosTratados({ ...entradaValida, valor });
        expect(resultado.valido).toBe(false);
        expect(resultado.erros.valor).toBeDefined();
    });

    it("rejeita tipo e categoria ausentes ou incompatíveis em formato", () => {
        expect(dadosTratados({ ...entradaValida, tipo: "transferencia" }).erros.tipo).toBeDefined();
        expect(dadosTratados({ ...entradaValida, categoriaId: "" }).erros.categoriaId).toBeDefined();
        expect(dadosTratados({ ...entradaValida, data: "2026-02-30" }).erros.data).toBeDefined();
    });

    it("rejeita entradas que não são objetos", () => {
        expect(dadosTratados(null).valido).toBe(false);
        expect(dadosTratados("entrada").valido).toBe(false);
    });
});

describe("validação de datas e categorias", () => {
    it.each([["2024-02-29", true], ["2025-02-29", false], ["2026-13-01", false], ["01/11/2026", false], ["2026-04-31", false]] as const)("valida data civil %s", (data, valida) => {
        expect(dataISOValida(data)).toBe(valida);
    });

    it("valida os limites de categorias e mantém categorias padrão para os dois tipos", () => {
        expect(categoriaValida({ id: "x", nome: " Casa ", tipo: "despesa" })).toBe(true);
        expect(categoriaValida({ id: "", nome: "Casa", tipo: "despesa" })).toBe(false);
        expect(categoriaValida({ id: "x", nome: " ", tipo: "despesa" })).toBe(false);
        expect(categoriasPadrao().some((categoria) => categoria.tipo === "receita")).toBe(true);
        expect(categoriasPadrao().some((categoria) => categoria.tipo === "despesa")).toBe(true);
    });
});

describe("registros armazenados e migração", () => {
    it("valida um registro com ID", () => {
        expect(validarRegistro({ id: "r1", ...entradaValida })).toBe(true);
        expect(validarRegistro({ id: " ", ...entradaValida })).toBe(false);
        expect(validarRegistro({ id: "r1", ...entradaValida, valor: -1 })).toBe(false);
    });

    it("migra categoria legada e fornece data para registros antigos", () => {
        const registro = migrarRegistroLegado({ id: "legado", tipo: "receita", categoria: "outros", descricao: "Bônus", valor: 100 });
        expect(registro).toMatchObject({ id: "legado", categoriaId: "outros-receita", descricao: "Bônus", valor: 100 });
        expect(dataISOValida(registro?.data)).toBe(true);
    });

    it("retorna null para registros legados inválidos", () => {
        expect(migrarRegistroLegado({ id: "sem valor", tipo: "despesa", descricao: "Inválido", valor: -2 })).toBeNull();
        expect(migrarRegistroLegado(null)).toBeNull();
    });
});

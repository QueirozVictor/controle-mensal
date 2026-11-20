import { calcularResumoMensal } from "./resumoFinanceiro";
import type { Registro } from "@/types/types";

const registros: Registro[] = [
    { id: "r1", tipo: "receita", categoriaId: "salario", descricao: "Salário", valor: 1000.1, data: "2026-11-01" },
    { id: "r2", tipo: "despesa", categoriaId: "moradia", descricao: "Aluguel", valor: 250.05, data: "2026-11-02" },
    { id: "r3", tipo: "despesa", categoriaId: "mercado", descricao: "Mercado", valor: 100.2, data: "2026-11-03" },
    { id: "r4", tipo: "receita", categoriaId: "salario", descricao: "Outro mês", valor: 300, data: "2026-10-31" },
];

describe("calcularResumoMensal", () => {
    it("soma receitas, despesas, saldo e despesas por categoria apenas na competência", () => {
        expect(calcularResumoMensal(registros, "2026-11")).toEqual({
            competencia: "2026-11",
            totalReceitas: 1000.1,
            totalDespesas: 350.25,
            saldo: 649.85,
            despesasPorCategoria: { moradia: 250.05, mercado: 100.2 },
        });
    });

    it("lida com lista vazia", () => {
        expect(calcularResumoMensal([], "2026-11")).toEqual({
            competencia: "2026-11", totalReceitas: 0, totalDespesas: 0, saldo: 0, despesasPorCategoria: {},
        });
    });

    it.each(["2026-00", "2026-13", "2026-1", " inválida "]) ("rejeita competência inválida %s", (competencia) => {
        expect(() => calcularResumoMensal([], competencia)).toThrow("Competência inválida");
    });
});

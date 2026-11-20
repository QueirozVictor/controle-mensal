import type { Registro } from "@/types/types";

export type ResumoMensal = {
    competencia: string;
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    despesasPorCategoria: Record<string, number>;
};

/** Calcula os totais em centavos para evitar deriva de ponto flutuante. */
export function calcularResumoMensal(registros: readonly Registro[], competencia: string): ResumoMensal {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error("Competência inválida; use YYYY-MM.");

    let receitasCentavos = 0;
    let despesasCentavos = 0;
    const categoriasCentavos: Record<string, number> = {};

    for (const registro of registros) {
        if (registro.data.slice(0, 7) !== competencia) continue;
        const centavos = Math.round(registro.valor * 100);
        if (registro.tipo === "receita") receitasCentavos += centavos;
        else {
            despesasCentavos += centavos;
            categoriasCentavos[registro.categoriaId] = (categoriasCentavos[registro.categoriaId] ?? 0) + centavos;
        }
    }

    const emReais = (valor: number) => valor / 100;
    return {
        competencia,
        totalReceitas: emReais(receitasCentavos),
        totalDespesas: emReais(despesasCentavos),
        saldo: emReais(receitasCentavos - despesasCentavos),
        despesasPorCategoria: Object.fromEntries(
            Object.entries(categoriasCentavos).map(([categoria, valor]) => [categoria, emReais(valor ?? 0)]),
        ),
    };
}

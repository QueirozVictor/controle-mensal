import type { Categoria, Entrada, ErrosRegistro, Registro, ResultadoValidacao } from "@/types/types";

const MAX_DESCRICAO = 150;
const MAX_VALOR = 99_999_999.99;

export function dataLocalISO(): string {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
}

export function dataISOValida(valor: unknown): valor is string {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function categoriaValida(dado: unknown): dado is Categoria {
    if (!dado || typeof dado !== "object") return false;
    const categoria = dado as Record<string, unknown>;
    return typeof categoria.id === "string" && categoria.id.trim().length > 0 && categoria.id.length <= 100 &&
        typeof categoria.nome === "string" && categoria.nome.trim().length > 0 && categoria.nome.trim().length <= 50 &&
        (categoria.tipo === "receita" || categoria.tipo === "despesa");
}

export function categoriasPadrao(): Categoria[] {
    return [
        { id: "moradia", nome: "Moradia", tipo: "despesa" },
        { id: "alimentacao", nome: "Alimentação", tipo: "despesa" },
        { id: "transporte", nome: "Transporte", tipo: "despesa" },
        { id: "saude", nome: "Saúde", tipo: "despesa" },
        { id: "educacao", nome: "Educação", tipo: "despesa" },
        { id: "lazer", nome: "Lazer", tipo: "despesa" },
        { id: "salario", nome: "Salário", tipo: "receita" },
        { id: "investimentos", nome: "Investimentos", tipo: "despesa" },
        { id: "investimentos-receita", nome: "Investimentos", tipo: "receita" },
        { id: "outros-despesa", nome: "Outros", tipo: "despesa" },
        { id: "outros-receita", nome: "Outros", tipo: "receita" },
    ];
}

export function dadosTratados(dados: unknown): ResultadoValidacao {
    const erros: ErrosRegistro = {};
    const objeto = typeof dados === "object" && dados !== null ? dados as Record<string, unknown> : {};
    const descricao = typeof objeto.descricao === "string" ? objeto.descricao.trim() : "";

    if (!descricao) erros.descricao = "A descrição é obrigatória.";
    else if (descricao.length > MAX_DESCRICAO) erros.descricao = `Use até ${MAX_DESCRICAO} caracteres.`;
    if (objeto.tipo !== "receita" && objeto.tipo !== "despesa") erros.tipo = "Selecione um tipo válido.";
    if (typeof objeto.categoriaId !== "string" || !objeto.categoriaId.trim() || objeto.categoriaId.length > 100) erros.categoriaId = "Selecione uma categoria válida.";
    if (typeof objeto.valor !== "number" || !Number.isFinite(objeto.valor) || objeto.valor <= 0 || objeto.valor > MAX_VALOR) {
        erros.valor = `Informe um valor maior que zero e até ${MAX_VALOR.toFixed(2)}.`;
    } else if (Math.abs(Math.round(objeto.valor * 100) - objeto.valor * 100) > 1e-7) {
        erros.valor = "Informe no máximo duas casas decimais.";
    }
    if (!dataISOValida(objeto.data)) erros.data = "Informe uma data válida.";

    if (Object.keys(erros).length) return { valido: false, dados: null, erros };
    return {
        valido: true,
        dados: {
            tipo: objeto.tipo as Entrada["tipo"],
            categoriaId: objeto.categoriaId as string,
            descricao,
            valor: Math.round((objeto.valor as number) * 100) / 100,
            data: objeto.data as string,
        },
        erros: {},
    };
}

export function validarRegistro(dado: unknown): dado is Registro {
    if (!dado || typeof dado !== "object") return false;
    const registro = dado as Record<string, unknown>;
    return typeof registro.id === "string" && registro.id.trim().length > 0 &&
        dadosTratados(registro as unknown as Entrada).valido;
}

/** Migra registros da primeira versão (categoria slug) e da versão seguinte. */
export function migrarRegistroLegado(dado: unknown): Registro | null {
    if (!dado || typeof dado !== "object") return null;
    const registro = dado as Record<string, unknown>;
    if (typeof registro.id !== "string" || !registro.id.trim()) return null;
    const categoriaId = typeof registro.categoriaId === "string"
        ? registro.categoriaId
        : typeof registro.categoria === "string"
            ? registro.categoria === "outros" ? (registro.tipo === "receita" ? "outros-receita" : "outros-despesa") : registro.categoria === "investimentos" && registro.tipo === "receita" ? "investimentos-receita" : registro.categoria
            : registro.tipo === "receita" ? "outros-receita" : "outros-despesa";
    const novo = { ...registro, categoriaId, data: registro.data ?? dataLocalISO() };
    if (!validarRegistro(novo)) return null;
    const validacao = dadosTratados(novo as unknown as Entrada);
    return validacao.valido ? { id: registro.id, ...validacao.dados } : null;
}

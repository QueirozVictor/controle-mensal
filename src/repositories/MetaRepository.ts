import type { MetaEconomia } from "@/types/types";

export interface MetaRepository {
    carregar(): Promise<MetaEconomia[]>;
    salvar(metas: MetaEconomia[]): Promise<void>;
}

const CHAVE = "controle-financeiro.metas";

export class LocalStorageMetaRepository implements MetaRepository {
    constructor(private readonly storage?: Storage) {}
    private get armazenamento(): Storage { return this.storage ?? window.localStorage; }

    async carregar(): Promise<MetaEconomia[]> {
        const salvo = this.armazenamento.getItem(CHAVE);
        if (salvo === null) return [];
        const dados: unknown = JSON.parse(salvo);
        if (!Array.isArray(dados)) throw new Error("Metas locais inválidas; os dados foram preservados.");
        return this.validar(dados);
    }

    async salvar(metas: MetaEconomia[]): Promise<void> {
        this.armazenamento.setItem(CHAVE, JSON.stringify(this.validar(metas)));
    }

    private validar(dados: unknown[]): MetaEconomia[] {
        const competencias = new Set<string>();
        return dados.map((dado) => {
            if (!dado || typeof dado !== "object") throw new Error("Meta inválida; os dados foram preservados.");
            const meta = dado as Record<string, unknown>;
            if (typeof meta.competencia !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(meta.competencia) ||
                typeof meta.valor !== "number" || !Number.isFinite(meta.valor) || meta.valor < 0 || meta.valor > 99_999_999.99 ||
                Math.abs(Math.round(meta.valor * 100) - meta.valor * 100) > 1e-7 || competencias.has(meta.competencia)) {
                throw new Error("Meta inválida; os dados foram preservados.");
            }
            competencias.add(meta.competencia);
            return { competencia: meta.competencia, valor: Math.round(meta.valor * 100) / 100 };
        });
    }
}

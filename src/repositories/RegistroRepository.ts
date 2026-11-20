import type { Registro } from "@/types/types";
import { migrarRegistroLegado, validarRegistro } from "@/utils/validarRegistro";

export interface RegistroRepository {
    carregar(): Promise<Registro[]>;
    salvar(registros: Registro[]): Promise<void>;
}

const STORAGE_KEY = "controle-financeiro.registros";
const VERSAO_SCHEMA = 3;

/** Adaptador local. A interface permite substituir por API sem alterar domínio ou UI. */
export class LocalStorageRegistroRepository implements RegistroRepository {
    constructor(private readonly storage?: Storage) {}

    private get armazenamento(): Storage {
        // Acessa window só durante operações no cliente, nunca durante renderização SSR.
        return this.storage ?? window.localStorage;
    }

    async carregar(): Promise<Registro[]> {
        const salvo = this.armazenamento.getItem(STORAGE_KEY);
        if (salvo === null) {
            // Migra a chave usada pela primeira versão sem apagar sua origem.
            const legado = this.armazenamento.getItem("registros");
            if (legado === null) return [];
            const registros = this.parseLista(legado);
            await this.salvar(registros);
            return registros;
        }

        const envelope: unknown = JSON.parse(salvo);
        if (Array.isArray(envelope)) return this.parseLista(salvo);
        if (typeof envelope !== "object" || envelope === null) throw new Error("Formato de armazenamento inválido.");
        const objeto = envelope as Record<string, unknown>;
        if (!Array.isArray(objeto.registros)) {
            throw new Error("Versão ou estrutura de dados não reconhecida. Os dados foram preservados.");
        }
        if (objeto.versao === 2) {
            const migrados = objeto.registros.map(migrarRegistroLegado);
            if (migrados.some((registro) => registro === null)) throw new Error("Há registros inválidos. Os dados foram preservados para recuperação.");
            const registros = this.validarLista(migrados);
            await this.salvar(registros);
            return registros;
        }
        if (objeto.versao !== VERSAO_SCHEMA) throw new Error("Versão de dados não reconhecida. Os dados foram preservados.");
        return this.validarLista(objeto.registros);
    }

    async salvar(registros: Registro[]): Promise<void> {
        const normalizados = this.validarLista(registros);
        const conteudo = JSON.stringify({ versao: VERSAO_SCHEMA, registros: normalizados });
        this.armazenamento.setItem(STORAGE_KEY, conteudo);
    }

    private parseLista(json: string): Registro[] {
        const dados: unknown = JSON.parse(json);
        if (!Array.isArray(dados)) throw new Error("Os dados armazenados não são uma lista. Os dados foram preservados.");
        const migrados = dados.map(migrarRegistroLegado);
        if (migrados.some((registro) => registro === null)) throw new Error("Há registros inválidos. Os dados foram preservados para recuperação.");
        return this.validarLista(migrados);
    }

    private validarLista(dados: unknown[]): Registro[] {
        const ids = new Set<string>();
        const resultado: Registro[] = [];
        for (const dado of dados) {
            const registro = validarRegistro(dado) ? migrarRegistroLegado(dado) : null;
            if (!registro) throw new Error("Há registros inválidos. Os dados foram preservados para recuperação.");
            if (ids.has(registro.id)) throw new Error("Há IDs duplicados. Os dados foram preservados para recuperação.");
            ids.add(registro.id);
            resultado.push(registro);
        }
        return resultado;
    }
}

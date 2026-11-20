import type { Categoria } from "@/types/types";
import { categoriaValida, categoriasPadrao } from "@/utils/validarRegistro";

export interface CategoriaRepository {
    carregar(): Promise<Categoria[]>;
    salvar(categorias: Categoria[]): Promise<void>;
}

const CHAVE = "controle-financeiro.categorias";
const VERSAO = 1;

export class LocalStorageCategoriaRepository implements CategoriaRepository {
    constructor(private readonly storage?: Storage) {}

    private get armazenamento(): Storage {
        return this.storage ?? window.localStorage;
    }

    async carregar(): Promise<Categoria[]> {
        const salvo = this.armazenamento.getItem(CHAVE);
        if (salvo === null) {
            const iniciais = categoriasPadrao();
            await this.salvar(iniciais);
            return iniciais;
        }

        const envelope: unknown = JSON.parse(salvo);
        if (!envelope || typeof envelope !== "object") throw new Error("Categorias locais inválidas; os dados foram preservados.");
        const dados = envelope as Record<string, unknown>;
        if (dados.versao !== VERSAO || !Array.isArray(dados.categorias)) throw new Error("Versão de categorias não reconhecida; os dados foram preservados.");
        return this.validar(dados.categorias);
    }

    async salvar(categorias: Categoria[]): Promise<void> {
        const validas = this.validar(categorias);
        this.armazenamento.setItem(CHAVE, JSON.stringify({ versao: VERSAO, categorias: validas }));
    }

    private validar(dados: unknown[]): Categoria[] {
        if (dados.length > 200) throw new Error("Limite de categorias excedido; os dados foram preservados.");
        const ids = new Set<string>();
        const nomes = new Set<string>();
        const categorias = dados.map((dado) => {
            if (!categoriaValida(dado)) throw new Error("Categoria inválida; os dados foram preservados.");
            const categoria: Categoria = { id: dado.id, nome: dado.nome.trim(), tipo: dado.tipo };
            const chaveNome = `${categoria.tipo}:${categoria.nome.normalize("NFKC").toLocaleLowerCase("pt-BR")}`;
            if (ids.has(categoria.id) || nomes.has(chaveNome)) throw new Error("Há categorias duplicadas; os dados foram preservados.");
            ids.add(categoria.id);
            nomes.add(chaveNome);
            return categoria;
        });
        if (!categorias.some((categoria) => categoria.tipo === "receita") || !categorias.some((categoria) => categoria.tipo === "despesa")) {
            throw new Error("Mantenha ao menos uma categoria para receitas e uma para despesas; os dados foram preservados.");
        }
        return categorias;
    }
}

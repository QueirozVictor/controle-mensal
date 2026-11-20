import type { Categoria, MetaEconomia, Registro } from "@/types/types";
import type { RegistroRepository } from "@/repositories/RegistroRepository";
import type { CategoriaRepository } from "@/repositories/CategoriaRepository";
import type { MetaRepository } from "@/repositories/MetaRepository";
import { categoriasPadrao } from "@/utils/validarRegistro";

export class MemoryRegistroRepository implements RegistroRepository {
    dados: Registro[] = [];
    async carregar() { return this.dados.map((registro) => ({ ...registro })); }
    async salvar(registros: Registro[]) { this.dados = registros.map((registro) => ({ ...registro })); }
}

export class MemoryCategoriaRepository implements CategoriaRepository {
    dados: Categoria[] = categoriasPadrao();
    async carregar() { return this.dados.map((categoria) => ({ ...categoria })); }
    async salvar(categorias: Categoria[]) { this.dados = categorias.map((categoria) => ({ ...categoria })); }
}

export class MemoryMetaRepository implements MetaRepository {
    dados: MetaEconomia[] = [];
    async carregar() { return this.dados.map((meta) => ({ ...meta })); }
    async salvar(metas: MetaEconomia[]) { this.dados = metas.map((meta) => ({ ...meta })); }
}

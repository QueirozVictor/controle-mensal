export type TipoRegistro = "receita" | "despesa";

export type Categoria = {
    id: string;
    nome: string;
    tipo: TipoRegistro;
};

export type MetaEconomia = { competencia: string; valor: number };

export type EntradaCategoria = Pick<Categoria, "nome" | "tipo">;

export type Entrada = {
    tipo: TipoRegistro;
    categoriaId: string;
    descricao: string;
    valor: number;
    data: string; // Data civil ISO (YYYY-MM-DD), sem conversão de fuso horário.
};

export type Registro = Entrada & { id: string };

export type ResultadoOperacao =
    | { sucesso: true }
    | { sucesso: false; erro: string };

export type ResultadoCriacao = ResultadoOperacao & { registro?: Registro };
export type ResultadoCategoria = ResultadoOperacao & { categoria?: Categoria };
export type StatusPersistencia = "carregando" | "disponivel" | "erro";

export type ContextType = {
    registros: Registro[];
    categorias: Categoria[];
    metas: MetaEconomia[];
    statusPersistencia: StatusPersistencia;
    erroPersistencia: string | null;
    adicionarRegistro: (novoRegistro: unknown) => Promise<ResultadoCriacao>;
    atualizarRegistro: (id: string, novosDados: unknown) => Promise<ResultadoOperacao>;
    deletarRegistro: (id: string) => Promise<ResultadoOperacao>;
    criarCategoria: (dados: EntradaCategoria) => Promise<ResultadoCategoria>;
    renomearCategoria: (id: string, nome: string) => Promise<ResultadoCategoria>;
    excluirCategoria: (id: string) => Promise<ResultadoOperacao>;
    definirMeta: (competencia: string, valor: number) => Promise<ResultadoOperacao>;
};

export type ErrosRegistro = {
    descricao?: string;
    valor?: string;
    tipo?: string;
    categoriaId?: string;
    data?: string;
};

export type ResultadoValidacao =
    | { valido: true; dados: Entrada; erros: ErrosRegistro }
    | { valido: false; dados: null; erros: ErrosRegistro };

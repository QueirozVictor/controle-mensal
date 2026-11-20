"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { Categoria, ContextType, EntradaCategoria, MetaEconomia, Registro, ResultadoCategoria, ResultadoCriacao, ResultadoOperacao, StatusPersistencia } from "@/types/types";
import { categoriaValida, dadosTratados } from "@/utils/validarRegistro";
import { LocalStorageCategoriaRepository, type CategoriaRepository } from "@/repositories/CategoriaRepository";
import { LocalStorageRegistroRepository, type RegistroRepository } from "@/repositories/RegistroRepository";
import { LocalStorageMetaRepository, type MetaRepository } from "@/repositories/MetaRepository";

export const context = createContext<ContextType | null>(null);

export function Provider({
    children,
    repository,
    categoriasRepository,
    metasRepository,
}: {
    children: React.ReactNode;
    repository?: RegistroRepository;
    categoriasRepository?: CategoriaRepository;
    metasRepository?: MetaRepository;
}) {
    const registrosRepoRef = useRef<RegistroRepository | null>(null);
    const categoriasRepoRef = useRef<CategoriaRepository | null>(null);
    const metasRepoRef = useRef<MetaRepository | null>(null);
    if (!registrosRepoRef.current) registrosRepoRef.current = repository ?? new LocalStorageRegistroRepository();
    if (!categoriasRepoRef.current) categoriasRepoRef.current = categoriasRepository ?? new LocalStorageCategoriaRepository();
    if (!metasRepoRef.current) metasRepoRef.current = metasRepository ?? new LocalStorageMetaRepository();
    const registrosRepo = registrosRepoRef.current;
    const categoriasRepo = categoriasRepoRef.current;
    const metasRepo = metasRepoRef.current;

    const [registros, setRegistros] = useState<Registro[]>([]);
    const registrosRef = useRef<Registro[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const categoriasRef = useRef<Categoria[]>([]);
    const [metas, setMetas] = useState<MetaEconomia[]>([]);
    const metasRef = useRef<MetaEconomia[]>([]);
    const filaOperacoesRef = useRef<Promise<void>>(Promise.resolve());
    const [statusPersistencia, setStatusPersistencia] = useState<StatusPersistencia>("carregando");
    const [erroPersistencia, setErroPersistencia] = useState<string | null>(null);

    useEffect(() => {
        let ativo = true;
        Promise.all([registrosRepo.carregar(), categoriasRepo.carregar(), metasRepo.carregar()]).then(([registrosCarregados, categoriasCarregadas, metasCarregadas]) => {
            if (!ativo) return;
            const categoriasPorId = new Map(categoriasCarregadas.map((categoria) => [categoria.id, categoria]));
            const registrosConsistentes = registrosCarregados.every((registro) => {
                const categoria = categoriasPorId.get(registro.categoriaId);
                return categoria && categoria.tipo === registro.tipo;
            });
            if (!registrosConsistentes) throw new Error("Existem lançamentos ligados a categorias ausentes ou incompatíveis. Os dados foram preservados.");
            registrosRef.current = registrosCarregados;
            categoriasRef.current = categoriasCarregadas;
            metasRef.current = metasCarregadas;
            setRegistros(registrosCarregados);
            setCategorias(categoriasCarregadas);
            setMetas(metasCarregadas);
            setStatusPersistencia("disponivel");
        }).catch((erro: unknown) => {
            if (!ativo) return;
            setErroPersistencia(erro instanceof Error ? erro.message : "Não foi possível ler os dados locais.");
            setStatusPersistencia("erro");
        });
        return () => { ativo = false; };
    }, [registrosRepo, categoriasRepo, metasRepo]);

    function enfileirar<T>(operacao: () => Promise<T>): Promise<T> {
        const proxima = filaOperacoesRef.current.then(operacao, operacao);
        filaOperacoesRef.current = proxima.then(() => undefined, () => undefined);
        return proxima;
    }

    function verificarDisponibilidade(): ResultadoOperacao | null {
        return statusPersistencia === "disponivel" ? null : {
            sucesso: false,
            erro: erroPersistencia ?? "O armazenamento ainda não está disponível.",
        };
    }

    function persistirRegistros(transformar: (atuais: Registro[]) => Registro[] | string): Promise<ResultadoOperacao> {
        return enfileirar(async () => {
            const indisponivel = verificarDisponibilidade();
            if (indisponivel) return indisponivel;
            const proximoOuErro = transformar(registrosRef.current);
            if (typeof proximoOuErro === "string") return { sucesso: false, erro: proximoOuErro };
            try {
                await registrosRepo.salvar(proximoOuErro);
                registrosRef.current = proximoOuErro;
                setRegistros(proximoOuErro);
                setErroPersistencia(null);
                return { sucesso: true };
            } catch (erro) {
                const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar os registros.";
                setErroPersistencia(mensagem);
                return { sucesso: false, erro: mensagem };
            }
        });
    }

    async function adicionarRegistro(entrada: unknown): Promise<ResultadoCriacao> {
        const validacao = dadosTratados(entrada);
        if (!validacao.valido) return { sucesso: false, erro: "Os dados do registro são inválidos." };
        const registro: Registro = { ...validacao.dados, id: crypto.randomUUID() };
        const resultado = await persistirRegistros((atuais) => {
            const categoria = categoriasRef.current.find((item) => item.id === registro.categoriaId);
            if (!categoria || categoria.tipo !== registro.tipo) return "A categoria não existe ou não corresponde ao tipo do lançamento.";
            return [...atuais, registro];
        });
        return resultado.sucesso ? { ...resultado, registro } : resultado;
    }

    async function atualizarRegistro(id: string, entrada: unknown): Promise<ResultadoOperacao> {
        if (typeof id !== "string" || !id.trim()) return { sucesso: false, erro: "ID inválido." };
        const validacao = dadosTratados(entrada);
        if (!validacao.valido) return { sucesso: false, erro: "Os dados do registro são inválidos." };
        return persistirRegistros((atuais) => {
            const categoria = categoriasRef.current.find((item) => item.id === validacao.dados.categoriaId);
            if (!categoria || categoria.tipo !== validacao.dados.tipo) return "A categoria não existe ou não corresponde ao tipo do lançamento.";
            return atuais.some((registro) => registro.id === id)
                ? atuais.map((registro) => registro.id === id ? { ...validacao.dados, id } : registro)
                : "Registro não encontrado.";
        });
    }

    async function deletarRegistro(id: string): Promise<ResultadoOperacao> {
        if (typeof id !== "string" || !id.trim()) return { sucesso: false, erro: "ID inválido." };
        return persistirRegistros((atuais) => atuais.some((registro) => registro.id === id)
            ? atuais.filter((registro) => registro.id !== id)
            : "Registro não encontrado.");
    }

    function persistirCategorias(transformar: (atuais: Categoria[]) => Categoria[] | string): Promise<ResultadoCategoria> {
        return enfileirar(async () => {
            const indisponivel = verificarDisponibilidade();
            if (indisponivel) return indisponivel;
            const proximaOuErro = transformar(categoriasRef.current);
            if (typeof proximaOuErro === "string") return { sucesso: false, erro: proximaOuErro };
            try {
                await categoriasRepo.salvar(proximaOuErro);
                categoriasRef.current = proximaOuErro;
                setCategorias(proximaOuErro);
                setErroPersistencia(null);
                return { sucesso: true };
            } catch (erro) {
                const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar as categorias.";
                setErroPersistencia(mensagem);
                return { sucesso: false, erro: mensagem };
            }
        });
    }

    function nomeDuplicado(lista: Categoria[], nome: string, tipo: EntradaCategoria["tipo"], idIgnorado?: string): boolean {
        const chave = nome.normalize("NFKC").toLocaleLowerCase("pt-BR");
        return lista.some((categoria) => categoria.id !== idIgnorado && categoria.tipo === tipo && categoria.nome.normalize("NFKC").toLocaleLowerCase("pt-BR") === chave);
    }

    async function criarCategoria(dados: EntradaCategoria): Promise<ResultadoCategoria> {
        const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";
        const candidata = { id: "pending", nome, tipo: dados?.tipo };
        if (!categoriaValida(candidata)) return { sucesso: false, erro: "Informe nome e tipo válidos para a categoria." };
        const categoria: Categoria = { ...candidata, id: crypto.randomUUID() };
        const resultado = await persistirCategorias((atuais) => nomeDuplicado(atuais, nome, categoria.tipo)
            ? "Já existe uma categoria com esse nome para este tipo."
            : [...atuais, categoria]);
        return resultado.sucesso ? { ...resultado, categoria } : resultado;
    }

    async function renomearCategoria(id: string, nomeInformado: string): Promise<ResultadoCategoria> {
        const nome = typeof nomeInformado === "string" ? nomeInformado.trim() : "";
        if (!nome || nome.length > 50) return { sucesso: false, erro: "O nome deve ter entre 1 e 50 caracteres." };
        let categoriaAtualizada: Categoria | undefined;
        const resultado = await persistirCategorias((atuais) => {
            const atual = atuais.find((categoria) => categoria.id === id);
            if (!atual) return "Categoria não encontrada.";
            if (nomeDuplicado(atuais, nome, atual.tipo, id)) return "Já existe uma categoria com esse nome para este tipo.";
            categoriaAtualizada = { ...atual, nome };
            return atuais.map((categoria) => categoria.id === id ? categoriaAtualizada! : categoria);
        });
        return resultado.sucesso && categoriaAtualizada ? { ...resultado, categoria: categoriaAtualizada } : resultado;
    }

    async function excluirCategoria(id: string): Promise<ResultadoOperacao> {
        return persistirCategorias((atuais) => {
            const categoria = atuais.find((item) => item.id === id);
            if (!categoria) return "Categoria não encontrada.";
            if (registrosRef.current.some((registro) => registro.categoriaId === id)) return "Não é possível excluir uma categoria vinculada a lançamentos.";
            if (atuais.filter((item) => item.tipo === categoria.tipo).length <= 1) return "Mantenha pelo menos uma categoria para cada tipo.";
            return atuais.filter((item) => item.id !== id);
        });
    }

    async function definirMeta(competencia: string, valor: number): Promise<ResultadoOperacao> {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia) || !Number.isFinite(valor) || valor < 0 || valor > 99_999_999.99 || Math.abs(Math.round(valor * 100) - valor * 100) > 1e-7) {
            return { sucesso: false, erro: "Informe uma meta mensal válida, com até duas casas decimais." };
        }
        return enfileirar(async () => {
            const indisponivel = verificarDisponibilidade();
            if (indisponivel) return indisponivel;
            const metasAtuais = metasRef.current.filter((meta) => meta.competencia !== competencia);
            const proximas = valor === 0 ? metasAtuais : [...metasAtuais, { competencia, valor: Math.round(valor * 100) / 100 }];
            try {
                await metasRepo.salvar(proximas);
                metasRef.current = proximas;
                setMetas(proximas);
                setErroPersistencia(null);
                return { sucesso: true };
            } catch (erro) {
                const mensagem = erro instanceof Error ? erro.message : "Não foi possível salvar a meta.";
                setErroPersistencia(mensagem);
                return { sucesso: false, erro: mensagem };
            }
        });
    }

    return <context.Provider value={{ registros, categorias, metas, statusPersistencia, erroPersistencia, adicionarRegistro, atualizarRegistro, deletarRegistro, criarCategoria, renomearCategoria, excluirCategoria, definirMeta }}>{children}</context.Provider>;
}

"use client";

import { useContext, useState, type FormEvent } from "react";
import { context } from "@/context/Context";
import { dadosTratados, dataLocalISO } from "@/utils/validarRegistro";
import { useDataLocalISO } from "@/hooks/useDataLocalISO";
import type { Entrada, ErrosRegistro, Registro, TipoRegistro } from "@/types/types";
import styles from "./Formulario.module.css";

function dadosIniciais(categoriaId = "outros-despesa", data = ""): Entrada {
    return { tipo: "despesa", categoriaId, descricao: "", valor: 0, data };
}

export default function Formulario({ registroEditar, onFinalizarEdicao, recolhivel = false, inicialmenteAberto = true }: { registroEditar?: Registro | null; onFinalizarEdicao?: () => void; recolhivel?: boolean; inicialmenteAberto?: boolean }) {
    const registroContext = useContext(context);
    if (!registroContext) throw new Error("Formulario precisa estar dentro do Provider");
    const { adicionarRegistro, atualizarRegistro, categorias, statusPersistencia, erroPersistencia } = registroContext;
    const dataAtual = useDataLocalISO();
    const primeiraDespesa = categorias.find((categoria) => categoria.tipo === "despesa")?.id ?? "";
    const [dados, setDados] = useState<Entrada>(() => registroEditar
        ? { tipo: registroEditar.tipo, categoriaId: registroEditar.categoriaId, descricao: registroEditar.descricao, valor: registroEditar.valor, data: registroEditar.data }
        : dadosIniciais(primeiraDespesa));
    const [erros, setErros] = useState<ErrosRegistro>({});
    const [erroOperacao, setErroOperacao] = useState<string | null>(null);
    const [aberto, setAberto] = useState(inicialmenteAberto || Boolean(registroEditar));
    const categoriasDisponiveis = categorias.filter((categoria) => categoria.tipo === dados.tipo);
    const categoriaSelecionada = categoriasDisponiveis.some((categoria) => categoria.id === dados.categoriaId)
        ? dados.categoriaId
        : categoriasDisponiveis[0]?.id ?? "";

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const validacao = dadosTratados({ ...dados, data: dados.data || dataAtual, categoriaId: categoriaSelecionada });
        setErros(validacao.erros);
        setErroOperacao(null);
        if (!validacao.valido) return;

        const resultado = registroEditar
            ? await atualizarRegistro(registroEditar.id, validacao.dados)
            : await adicionarRegistro(validacao.dados);
        if (!resultado.sucesso) {
            setErroOperacao(resultado.erro);
            return;
        }
        setDados(dadosIniciais(primeiraDespesa, dataLocalISO()));
        setErros({});
        onFinalizarEdicao?.();
    }

    function alterarTipo(tipo: TipoRegistro) {
        const categoriaId = categorias.find((categoria) => categoria.tipo === tipo)?.id ?? "";
        setDados({ ...dados, tipo, categoriaId });
    }

    function cancelarEdicao() {
        setDados(dadosIniciais(primeiraDespesa, dataLocalISO()));
        setErros({});
        setErroOperacao(null);
        onFinalizarEdicao?.();
    }

    return <>
        {recolhivel && <button className={styles.toggleButton} type="button" aria-expanded={aberto} aria-controls="formulario-lancamento" onClick={() => setAberto((valorAtual) => !valorAtual)}>
            <span aria-hidden="true">{aberto ? "−" : "+"}</span>{aberto ? "Fechar formulário" : "Adicionar lançamento"}
        </button>}
        {(!recolhivel || aberto) && <form id="formulario-lancamento" className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}><label htmlFor="tipo">Tipo de registro</label><select id="tipo" name="tipo" value={dados.tipo} onChange={(e) => alterarTipo(e.target.value as TipoRegistro)}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></div>
            <div className={styles.field}><label htmlFor="categoriaId">Categoria</label><select id="categoriaId" name="categoriaId" value={categoriaSelecionada} onChange={(e) => setDados({ ...dados, categoriaId: e.target.value })}>{categoriasDisponiveis.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select>{erros.categoriaId && <span role="alert">{erros.categoriaId}</span>}</div>
            <div className={`${styles.field} ${styles.fullField}`}><label htmlFor="descricao">Descrição</label><input id="descricao" name="descricao" value={dados.descricao} type="text" maxLength={150} placeholder="Ex.: Mercado, salário…" onChange={(e) => setDados({ ...dados, descricao: e.target.value })} aria-invalid={Boolean(erros.descricao)} />{erros.descricao && <span role="alert">{erros.descricao}</span>}</div>
            <div className={styles.field}><label htmlFor="valor">Valor</label><input id="valor" name="valor" value={dados.valor || ""} min="0.01" max="99999999.99" step="0.01" placeholder="0,00" type="number" onChange={(e) => setDados({ ...dados, valor: e.target.value === "" ? 0 : Number(e.target.value) })} aria-invalid={Boolean(erros.valor)} />{erros.valor && <span role="alert">{erros.valor}</span>}</div>
            <div className={styles.field}><label htmlFor="data">Data</label><input id="data" name="data" value={dados.data || dataAtual} type="date" onChange={(e) => setDados({ ...dados, data: e.target.value })} aria-invalid={Boolean(erros.data)} />{erros.data && <span role="alert">{erros.data}</span>}</div>
            {erros.tipo && <span className={styles.fullField} role="alert">{erros.tipo}</span>}
            {statusPersistencia === "carregando" && <p className={styles.fullField} role="status">Carregando seus registros…</p>}
            {(erroOperacao || erroPersistencia) && <p className={styles.fullField} role="alert">{erroOperacao || erroPersistencia}</p>}
            <button className={styles.submitButton} type="submit" disabled={statusPersistencia !== "disponivel" || !categoriasDisponiveis.length}>{registroEditar ? "Salvar alterações" : "Adicionar registro"}</button>
            {registroEditar && <button type="button" className={`${styles.cancelButton} ${styles.fullField}`} onClick={cancelarEdicao}>Cancelar edição</button>}
        </form>}
    </>;
}

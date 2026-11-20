"use client";

import { useContext, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { context } from "@/context/Context";
import Formulario from "@/components/Formulario/Formulario";
import GerenciarCategorias from "@/components/Categorias/GerenciarCategorias";
import { calcularResumoMensal } from "@/domain/resumoFinanceiro";
import { useDataLocalISO } from "@/hooks/useDataLocalISO";
import type { Registro } from "@/types/types";
import styles from "./PainelFinanceiro.module.css";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
type Pagina = "inicio" | "lancamentos" | "resumo";
let temaEmMemoria: "claro" | "escuro" | null = null;

function lerTema(): "claro" | "escuro" {
    try {
        const salvo = window.localStorage.getItem("controle-mensal:tema");
        if (salvo === "claro" || salvo === "escuro") return salvo;
    } catch { /* Usa a preferência do sistema se o armazenamento estiver indisponível. */ }
    return temaEmMemoria ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
}

function assinarTema(atualizar: () => void) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener("storage", atualizar);
    window.addEventListener("controle-mensal:tema-alterado", atualizar);
    media.addEventListener("change", atualizar);
    return () => {
        window.removeEventListener("storage", atualizar);
        window.removeEventListener("controle-mensal:tema-alterado", atualizar);
        media.removeEventListener("change", atualizar);
    };
}

export default function PainelFinanceiro({ pagina }: { pagina: Pagina }) {
    const dados = useContext(context);
    if (!dados) throw new Error("PainelFinanceiro precisa estar dentro do Provider");
    const { registros, categorias, metas, statusPersistencia, erroPersistencia, deletarRegistro, definirMeta } = dados;
    const dataAtual = useDataLocalISO();
    const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string | null>(null);
    const competencia = competenciaSelecionada ?? (dataAtual ? dataAtual.slice(0, 7) : "2000-01");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [filtroCategoria, setFiltroCategoria] = useState("todas");
    const [registroEditar, setRegistroEditar] = useState<Registro | null>(null);
    const [metaInput, setMetaInput] = useState("");
    const [mensagemMeta, setMensagemMeta] = useState<string | null>(null);
    const tema = useSyncExternalStore(assinarTema, lerTema, (): "claro" | "escuro" => "claro");
    const seletorMesRef = useRef<HTMLInputElement>(null);
    const metaAtual = metas.find((meta) => meta.competencia === competencia)?.valor ?? 0;
    const resumo = calcularResumoMensal(registros, competencia);
    const categoriaPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));
    const despesasOrdenadas = Object.entries(resumo.despesasPorCategoria).sort((a, b) => b[1] - a[1]);
    const progressoMeta = metaAtual > 0 ? Math.min(100, Math.max(0, (resumo.saldo / metaAtual) * 100)) : 0;
    const registrosOrdenados = [...registros]
        .filter((registro) => registro.data.startsWith(competencia))
        .filter((registro) => filtroTipo === "todos" || registro.tipo === filtroTipo)
        .filter((registro) => filtroCategoria === "todas" || registro.categoriaId === filtroCategoria)
        .sort((a, b) => b.data.localeCompare(a.data));
    const competenciaLegivel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${competencia}-02T12:00:00`));

    useEffect(() => {
        document.documentElement.dataset.tema = tema;
    }, [tema]);

    function alternarTema() {
        const novoTema = tema === "claro" ? "escuro" : "claro";
        temaEmMemoria = novoTema;
        try { window.localStorage.setItem("controle-mensal:tema", novoTema); } catch { /* Mantém o tema durante esta sessão. */ }
        window.dispatchEvent(new Event("controle-mensal:tema-alterado"));
    }

    function abrirSeletorMes() {
        const seletor = seletorMesRef.current;
        if (!seletor) return;
        try {
            if (typeof seletor.showPicker === "function") seletor.showPicker();
            else seletor.click();
        } catch {
            seletor.click();
        }
    }

    function alterarCompetencia(valor: string) {
        const competenciaValida = /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
        setCompetenciaSelecionada(competenciaValida ? valor : null);
        setMensagemMeta(null);
    }

    async function excluir(id: string, descricao: string) {
        if (!window.confirm(`Excluir o lançamento “${descricao}”?`)) return;
        await deletarRegistro(id);
    }

    async function salvarMeta(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const valor = metaInput === "" ? metaAtual : Number(metaInput);
        const resultado = await definirMeta(competencia, valor);
        setMensagemMeta(resultado.sucesso ? (valor === 0 ? "Meta removida." : "Meta salva.") : resultado.erro);
        if (resultado.sucesso) setMetaInput("");
    }

    const titulo = pagina === "inicio" ? "Seu mês com mais clareza" : pagina === "lancamentos" ? "Seus lançamentos" : "Resumo do mês";

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>CONTROLE FINANCEIRO PESSOAL</p>
                    <h1>{titulo}</h1>
                    <p className={styles.subtitle}>{pagina === "inicio" ? "Um retrato simples do que entrou, saiu e ficou." : pagina === "lancamentos" ? "Registre e organize suas movimentações." : "Acompanhe para onde seu dinheiro está indo."}</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.themeButton} type="button" onClick={alternarTema} aria-label={`Ativar tema ${tema === "claro" ? "escuro" : "claro"}`}>
                        {tema === "claro" ? "☾ Tema escuro" : "☀ Tema claro"}
                    </button>
                    <div className={`${styles.status} ${styles[`status_${statusPersistencia}`]}`} role="status">
                        <span className={styles.statusDot} />
                        {statusPersistencia === "carregando" ? "Carregando" : statusPersistencia === "erro" ? "Armazenamento indisponível" : "Salvo neste dispositivo"}
                    </div>
                </div>
            </header>

            {erroPersistencia && <p className={styles.warning} role="alert">{erroPersistencia}</p>}

            {(pagina === "inicio" || pagina === "resumo") && <label className={styles.monthSelector}>
                <span>Período</span>
                <span className={styles.monthControl}>
                    <button className={styles.monthButton} type="button" onClick={abrirSeletorMes} aria-label={`Selecionar período, atual ${competenciaLegivel}`}>
                    <span className={styles.monthIcon} aria-hidden="true">📅</span>
                    <span className={styles.monthDisplay}>{competenciaLegivel}</span>
                    </button>
                    <input ref={seletorMesRef} className={styles.monthInput} aria-label="Selecionar mês" type="month" value={competencia} onChange={(e) => alterarCompetencia(e.target.value)} />
                </span>
            </label>}

            {pagina === "inicio" && <>
                <section className={`${styles.summary} ${styles.homeSummary}`} aria-label={`Resumo financeiro de ${competencia}`}>
                    <article className={`${styles.summaryCard} ${styles.balanceCard}`}><span>Disponível neste mês</span><strong>{moeda.format(resumo.saldo)}</strong><small>Receitas menos despesas</small></article>
                    <article className={`${styles.summaryCard} ${styles.expenseCard}`}><span>Gasto até agora</span><strong>{moeda.format(resumo.totalDespesas)}</strong><small>{resumo.totalReceitas ? `Entraram ${moeda.format(resumo.totalReceitas)}` : "Despesas registradas"}</small></article>
                </section>
                <section className={styles.panel} aria-labelledby="inicio-lancamento-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>MOVIMENTAÇÃO</p><h2 id="inicio-lancamento-titulo">Adicionar entrada ou saída</h2></div></div>
                    <Formulario recolhivel inicialmenteAberto={false} />
                </section>
                <section className={`${styles.panel} ${styles.homeRecent}`} aria-labelledby="inicio-recentes-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>ATIVIDADE</p><h2 id="inicio-recentes-titulo">Últimos lançamentos</h2></div><span className={styles.count}>{Math.min(registrosOrdenados.length, 3)}</span></div>
                    <ListaRegistros registros={registrosOrdenados.slice(0, 3)} categoriaPorId={categoriaPorId} />
                </section>
            </>}

            {pagina === "lancamentos" && <>
                <section className={styles.panel} aria-labelledby="lancamento-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>MOVIMENTAÇÃO</p><h2 id="lancamento-titulo">{registroEditar ? "Editar lançamento" : "Novo lançamento"}</h2></div></div>
                    <Formulario key={registroEditar?.id ?? "novo"} registroEditar={registroEditar} onFinalizarEdicao={() => setRegistroEditar(null)} recolhivel inicialmenteAberto />
                    <details className={styles.categoryShortcut}><summary>＋ Criar ou organizar categorias</summary><div><GerenciarCategorias /></div></details>
                </section>
                <section className={`${styles.panel} ${styles.fullHistory}`} aria-labelledby="historico-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>SEU HISTÓRICO</p><h2 id="historico-titulo">Lançamentos do mês</h2></div><span className={styles.count}>{registrosOrdenados.length}</span></div>
                    <Filtros filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} filtroCategoria={filtroCategoria} setFiltroCategoria={setFiltroCategoria} categorias={categorias} />
                    <ListaRegistros registros={registrosOrdenados} categoriaPorId={categoriaPorId} onEditar={setRegistroEditar} onExcluir={(registro) => void excluir(registro.id, registro.descricao)} />
                </section>
            </>}

            {pagina === "resumo" && <>
                <section className={styles.summary} aria-label={`Resumo financeiro de ${competencia}`}>
                    <article className={`${styles.summaryCard} ${styles.incomeCard}`}><span>Receitas</span><strong>{moeda.format(resumo.totalReceitas)}</strong><small>Total recebido no período</small></article>
                    <article className={`${styles.summaryCard} ${styles.expenseCard}`}><span>Despesas</span><strong>{moeda.format(resumo.totalDespesas)}</strong><small>Total gasto no período</small></article>
                    <article className={`${styles.summaryCard} ${styles.balanceCard}`}><span>Saldo disponível</span><strong>{moeda.format(resumo.saldo)}</strong><small>O que ficou com você</small></article>
                </section>
                <section className={styles.goalPanel} aria-labelledby="meta-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>SEU OBJETIVO</p><h2 id="meta-titulo">Guardar em {new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${competencia}-02T12:00:00`))}</h2></div><strong className={styles.goalValue}>{metaAtual > 0 ? moeda.format(metaAtual) : "Defina sua meta"}</strong></div>
                    {metaAtual > 0 && <div className={styles.goalProgress}><div className={styles.goalTrack} role="progressbar" aria-label="Progresso da meta mensal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressoMeta)}><span style={{ width: `${progressoMeta}%` }} /></div><small>{moeda.format(Math.max(0, resumo.saldo))} de {moeda.format(metaAtual)} · {Math.round(progressoMeta)}%</small></div>}
                    <form className={styles.goalForm} onSubmit={salvarMeta}><label htmlFor="meta-valor">Definir objetivo mensal</label><div className={styles.goalControls}><div className={styles.currencyInput}><span>R$</span><input id="meta-valor" type="number" min="0" max="99999999.99" step="0.01" placeholder={metaAtual ? metaAtual.toFixed(2) : "500,00"} value={metaInput} onChange={(e) => setMetaInput(e.target.value)} /></div><button type="submit" disabled={statusPersistencia !== "disponivel"}>{metaInput === "0" ? "Remover meta" : "Salvar objetivo"}</button></div></form>
                    {mensagemMeta && <p className={styles.feedback} role="status">{mensagemMeta}</p>}
                </section>
                <section className={`${styles.panel} ${styles.breakdown}`} aria-labelledby="despesas-categoria-titulo">
                    <div className={styles.panelHeader}><div><p className={styles.eyebrow}>PARA ONDE FOI</p><h2 id="despesas-categoria-titulo">Despesas por categoria</h2></div></div>
                    {despesasOrdenadas.length ? <ul className={styles.breakdownList}>{despesasOrdenadas.map(([id, valor], index) => {
                        const percentual = resumo.totalDespesas ? (valor / resumo.totalDespesas) * 100 : 0;
                        return <li className={styles.breakdownItem} key={id}><div><span>{categoriaPorId.get(id)?.nome ?? "Categoria indisponível"}</span><strong>{moeda.format(valor)}</strong></div><div className={styles.categoryTrack}><span className={styles[`categoryColor${index % 4}`]} style={{ width: `${percentual}%` }} /></div></li>;
                    })}</ul> : <p className={styles.muted}>Ainda não há despesas neste mês.</p>}
                </section>
            </>}
        </main>
    );
}

function Filtros({ filtroTipo, setFiltroTipo, filtroCategoria, setFiltroCategoria, categorias }: { filtroTipo: string; setFiltroTipo: (value: string) => void; filtroCategoria: string; setFiltroCategoria: (value: string) => void; categorias: { id: string; nome: string }[] }) {
    return <div className={styles.filters}><label htmlFor="filtro-tipo">Tipo</label><select id="filtro-tipo" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option value="todos">Todos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select><label htmlFor="filtro-categoria">Categoria</label><select id="filtro-categoria" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}><option value="todas">Todas</option>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}</select></div>;
}

function ListaRegistros({ registros, categoriaPorId, onEditar, onExcluir }: { registros: Registro[]; categoriaPorId: Map<string, { nome: string }>; onEditar?: (registro: Registro) => void; onExcluir?: (registro: Registro) => void }) {
    if (!registros.length) return <div className={styles.empty}><span aria-hidden="true">＋</span><p>Nenhum lançamento para este período.</p></div>;
    return <ul className={styles.transactionList}>{registros.map((registro) => <li className={styles.transaction} key={registro.id}>
        <div className={styles.transactionInfo}><strong>{registro.descricao}</strong><span>{categoriaPorId.get(registro.categoriaId)?.nome ?? "Categoria indisponível"} · {new Date(`${registro.data}T12:00:00`).toLocaleDateString("pt-BR")}</span></div>
        <strong className={`${styles.amount} ${registro.tipo === "receita" ? styles.amountIncome : styles.amountExpense}`}>{registro.tipo === "receita" ? "+" : "−"}{moeda.format(registro.valor)}</strong>
        {onEditar && onExcluir && <div className={styles.transactionActions}><button type="button" className={styles.secondaryButton} onClick={() => onEditar(registro)}>Editar</button><button type="button" className={styles.deleteButton} aria-label={`Excluir ${registro.descricao}`} onClick={() => onExcluir(registro)}>Excluir</button></div>}
    </li>)}</ul>;
}

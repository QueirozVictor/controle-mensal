"use client";

import { useContext, useState, type FormEvent } from "react";
import { context } from "@/context/Context";
import type { TipoRegistro } from "@/types/types";
import styles from "./GerenciarCategorias.module.css";

export default function GerenciarCategorias() {
    const dados = useContext(context);
    if (!dados) throw new Error("GerenciarCategorias precisa estar dentro do Provider");
    const { categorias, registros, criarCategoria, renomearCategoria, excluirCategoria, statusPersistencia } = dados;
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState<TipoRegistro>("despesa");
    const [edicaoId, setEdicaoId] = useState<string | null>(null);
    const [nomeEdicao, setNomeEdicao] = useState("");
    const [mensagem, setMensagem] = useState<string | null>(null);

    async function handleCriar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMensagem(null);
        const resultado = await criarCategoria({ nome, tipo });
        if (!resultado.sucesso) return setMensagem(resultado.erro);
        setNome("");
        setMensagem("Categoria criada.");
    }

    async function handleRenomear(e: FormEvent<HTMLFormElement>, id: string) {
        e.preventDefault();
        setMensagem(null);
        const resultado = await renomearCategoria(id, nomeEdicao);
        if (!resultado.sucesso) return setMensagem(resultado.erro);
        setEdicaoId(null);
        setMensagem("Categoria atualizada.");
    }

    async function handleExcluir(id: string) {
        setMensagem(null);
        const resultado = await excluirCategoria(id);
        setMensagem(resultado.sucesso ? "Categoria excluída." : resultado.erro);
    }

    return (
        <section className={styles.panel} aria-labelledby="categorias-titulo">
            <div className={styles.panelHeader}>
                <div><p className={styles.eyebrow}>ORGANIZAÇÃO</p><h2 id="categorias-titulo">Suas categorias</h2></div>
                <span className={styles.count}>{categorias.length}</span>
            </div>

            <form className={styles.createForm} onSubmit={handleCriar}>
                <label htmlFor="nova-categoria">Nome da categoria</label>
                <input id="nova-categoria" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={50} required placeholder="Ex.: Pets, academia, freelas" />
                <label htmlFor="tipo-categoria">Tipo</label>
                <select id="tipo-categoria" value={tipo} onChange={(e) => setTipo(e.target.value as TipoRegistro)}>
                    <option value="despesa">Despesa</option><option value="receita">Receita</option>
                </select>
                <button type="submit" disabled={statusPersistencia !== "disponivel"}>Adicionar categoria</button>
            </form>

            <ul className={styles.categoryGroups}>
                {(["despesa", "receita"] as const).map((tipoLista) => (
                    <li className={styles.categoryGroup} key={tipoLista}>
                        <h3>{tipoLista === "despesa" ? "Despesas" : "Receitas"}</h3>
                        {categorias.filter((categoria) => categoria.tipo === tipoLista).map((categoria) => {
                            const emUso = registros.filter((registro) => registro.categoriaId === categoria.id).length;
                            return (
                                <div className={styles.categoryRow} key={categoria.id}>
                                    {edicaoId === categoria.id ? (
                                        <form className={styles.renameForm} onSubmit={(e) => handleRenomear(e, categoria.id)}>
                                            <label className={styles.visuallyHidden} htmlFor={`editar-${categoria.id}`}>Novo nome para {categoria.nome}</label>
                                            <input id={`editar-${categoria.id}`} value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} maxLength={50} required autoFocus />
                                            <button type="submit" disabled={statusPersistencia !== "disponivel"}>Salvar</button>
                                            <button type="button" className={styles.secondaryButton} onClick={() => setEdicaoId(null)}>Cancelar</button>
                                        </form>
                                    ) : (
                                        <>
                                            <span>{categoria.nome}</span>
                                            <small>{emUso} {emUso === 1 ? "lançamento" : "lançamentos"}</small>
                                            <div className={styles.actions}>
                                                <button type="button" className={styles.secondaryButton} disabled={statusPersistencia !== "disponivel"} onClick={() => { setEdicaoId(categoria.id); setNomeEdicao(categoria.nome); }}>Renomear</button>
                                                <button type="button" className={styles.deleteButton} disabled={statusPersistencia !== "disponivel" || emUso > 0 || categorias.filter((item) => item.tipo === tipoLista).length <= 1} title={emUso > 0 ? "Esta categoria tem lançamentos associados" : undefined} onClick={() => void handleExcluir(categoria.id)}>Excluir</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </li>
                ))}
            </ul>
            {mensagem && <p className={styles.feedback} role="status">{mensagem}</p>}
        </section>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./NavegacaoApp.module.css";

const itens = [
    { href: "/", rotulo: "Início", icone: "⌂" },
    { href: "/lancamentos", rotulo: "Lançamentos", icone: "＋" },
    { href: "/resumo", rotulo: "Resumo", icone: "▥" },
];

export default function NavegacaoApp({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return <>
        {children}
        <nav className={styles.navigation} aria-label="Navegação principal">
            {itens.map((item) => <Link key={item.href} href={item.href} className={styles.link} aria-current={pathname === item.href ? "page" : undefined}>
                <span className={styles.icon} aria-hidden="true">{item.icone}</span><span>{item.rotulo}</span>
            </Link>)}
        </nav>
    </>;
}

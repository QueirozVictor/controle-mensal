"use client";

import { startTransition, useEffect, useState } from "react";
import { dataLocalISO } from "@/utils/validarRegistro";

/** Lê a data do dispositivo depois da hidratação para manter a pré-renderização determinística. */
export function useDataLocalISO() {
    const [data, setData] = useState("");

    useEffect(() => {
        startTransition(() => setData(dataLocalISO()));
    }, []);

    return data;
}

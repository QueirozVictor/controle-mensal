import { useContext } from "react";
import { context } from "@/context/Context";

export function useRegistros() {
    const dados = useContext(context);

    if (!dados) {
        throw new Error("useRegistros deve ser utilizado dentro de Provider");
    }

    return dados;
}
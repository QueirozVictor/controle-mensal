import { dadosTratados } from "./validarRegistro";

describe("dadosTratados", () => {
    it("deve aceitar um registro valido", () =>{
        const resultado = dadosTratados({
            tipo: "receita",
            descricao: "Salario",
            valor: 3000
        });

        expect(resultado.valido).toBe(true);
    });

    it("Deve remover espaços desnecessarios da descrição", () => {
        const resultado = dadosTratados({
            tipo: "despesa",
            descricao: "  Mercado  ",
            valor: 150
        });

        expect(resultado.valido).toBe(true);

        if(resultado.valido){
            expect(resultado.dados.descricao).toBe("Mercado");
        }
    });

    it("Deve rejeitar uma descrição vazia", () => {
        const resultado = dadosTratados({
            tipo: "despesa",
            descricao: "",
            valor: 150
        });

        expect(resultado.valido).toBe(false);
        expect(resultado.erros.descricao).toBeDefined();
    });

    it("Deve rejeitar um valor igual a 0", () =>{
        const resultado = dadosTratados({
            tipo: "despesa",
            descricao: "Combustivel",
            valor: 0
        });

        expect(resultado.valido).toBe(false);
        expect(resultado.erros.valor).toBeDefined();
    });

    it("Deve rejeitar valor negativo", () => {
        const resultado = dadosTratados({
            tipo: "despesa",
            descricao: "Mercado",
            valor: -50
        });

        expect(resultado.valido).toBe(false);
        expect(resultado.erros.valor).toBeDefined();
    });

    it("Deve rejeitar um tipo invalido", () => {
        const resultado = dadosTratados({
            tipo: "transferencia" as "despesa",
            descricao: "Transferencia",
            valor: 1000
        });

        expect(resultado.valido).toBe(false);
        expect(resultado.erros.tipo).toBeDefined();
    })
})
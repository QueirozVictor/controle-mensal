import { renderHook, waitFor } from "@testing-library/react";
import { useRegistros } from "./useRegistros";
import { useDataLocalISO } from "./useDataLocalISO";
import { Provider } from "@/context/Context";
import { MemoryCategoriaRepository, MemoryMetaRepository, MemoryRegistroRepository } from "@/test/memoryRepositories";

describe("useRegistros", () => {
    it("exige que o hook seja usado dentro do Provider", () => {
        expect(() => renderHook(() => useRegistros())).toThrow("useRegistros deve ser utilizado dentro de Provider");
    });

    it("expõe o contexto e operações do Provider", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => <Provider repository={new MemoryRegistroRepository()} categoriasRepository={new MemoryCategoriaRepository()} metasRepository={new MemoryMetaRepository()}>{children}</Provider>;
        const { result } = renderHook(() => useRegistros(), { wrapper });
        expect(result.current.registros).toEqual([]);
        expect(result.current.statusPersistencia).toBe("carregando");
        expect(result.current.adicionarRegistro).toEqual(expect.any(Function));
    });
});

describe("useDataLocalISO", () => {
    it("preenche a data do dispositivo depois da hidratação", async () => {
        const { result } = renderHook(() => useDataLocalISO());
        await waitFor(() => expect(result.current).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    });
});

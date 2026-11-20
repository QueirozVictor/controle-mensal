import "@testing-library/jest-dom";

if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((media: string) => ({
            matches: false,
            media,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
}

if (!crypto.randomUUID) {
    let nextId = 0;
    Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: () => `test-id-${++nextId}`,
    });
}

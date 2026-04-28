import '@testing-library/jest-dom';

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string): string | null => store[key] ?? null,
  setItem: (key: string, value: string): void => { store[key] = value; },
  removeItem: (key: string): void => { delete store[key]; },
  clear: (): void => { store = {}; },
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => { store = {}; });

import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import React from 'react';

// Bulletproof axios mock
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: mockAxios,
    ...mockAxios
  };
});

// Mock react-quill
vi.mock('react-quill', () => ({
  default: ({ defaultValue, value, onChange }) => (
    <textarea data-testid="quill-mock" defaultValue={defaultValue || value} onChange={(e) => onChange && onChange(e.target.value)} />
  )
}));

// Mock Google Auth
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  useGoogleLogin: vi.fn(() => vi.fn()),
  googleLogout: vi.fn(),
}));

// Mock Database
vi.mock('../../backend/db.js', () => ({
  db: {
    query: vi.fn(async () => [[{ id: 1, name: 'Test User' }]]),
    execute: vi.fn(async () => [[{ affectedRows: 1 }]]),
  },
}));


const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() { return Object.keys(store).length; }
  };
};

const storageMock = createStorageMock();
const sessionMock = createStorageMock();

if (typeof window !== 'undefined') {
  vi.stubGlobal('localStorage', storageMock);
  vi.stubGlobal('sessionStorage', sessionMock);
  window.localStorage = storageMock;
  window.sessionStorage = sessionMock;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  window.scrollTo = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.load = vi.fn();

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(), clearRect: vi.fn(), getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
    putImageData: vi.fn(), createImageData: vi.fn(), setTransform: vi.fn(), drawImage: vi.fn(),
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    closePath: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
    arc: vi.fn(), fill: vi.fn(), measureText: vi.fn(() => ({ width: 0 })), transform: vi.fn(),
    rect: vi.fn(), clip: vi.fn(),
  }));
}

beforeEach(() => {
  storageMock.clear();
  sessionMock.clear();
  vi.clearAllMocks();
});

// Polyfills
vi.stubGlobal('scrollTo', vi.fn());
const fetchMock = vi.fn().mockResolvedValue({
  ok: true, status: 200, json: async () => ({}), text: async () => '', blob: async () => ({}),
  headers: { get: (key) => ({ 'content-type': 'application/json' }[key.toLowerCase()]) },
  body: { pipe: vi.fn((dest) => dest.end()) }
});
vi.mock('node-fetch', () => ({ default: fetchMock, fetch: fetchMock }));
vi.stubGlobal('fetch', fetchMock);
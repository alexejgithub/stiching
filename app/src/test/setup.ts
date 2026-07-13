import '@testing-library/jest-dom/vitest';
// jsdom has no native IndexedDB; installs a global in-memory fake for every
// test (src/persistence/db.test.ts swaps in a fresh IDBFactory per test for
// isolation between its own cases).
import 'fake-indexeddb/auto';

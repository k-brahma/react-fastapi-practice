import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import { resetUsersStore } from './mocks/handlers';

// Establish API mocking before all tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
// Also reset the mock data store before each test.
afterEach(() => {
    server.resetHandlers();
    resetUsersStore();
});

// Clean up after the tests are finished.
afterAll(() => server.close()); 
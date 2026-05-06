// testing the auth context
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../../frontend/src/contexts/AuthContext';
import axios from 'axios';
const TestComponent = () => {
  const { user } = useAuth();
  return <div data-testid="user-name">{user ? user.name : 'No User'}</div>;
};
describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });
// let's see if it gets the user data from token
  it('provides user data when token exists', async () => {
    localStorage.setItem('token', 'mock-token');
    axios.get.mockResolvedValueOnce({ 
      data: { id: 1, name: 'Test User', email: 'test@test.com' } 
    });
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(getByTestId('user-name').textContent).toBe('Test User');
    });
  });
// no token means no user
  it('defaults to null user when no token is present', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(getByTestId('user-name').textContent).toBe('User');
    });
  });
});

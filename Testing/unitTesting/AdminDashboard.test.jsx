// testing the admin dashboard
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminDashboard from '../../frontend/src/admin/AdminDashboard';
import axios from 'axios';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(() => ({ exp: Date.now() / 1000 + 3600 }))
}));

describe('AdminDashboard Component', () => {
  // setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('adminToken', 'fake-token');
    
    axios.get.mockImplementation((url) => {
      if (url.includes('/admin/profile')) return Promise.resolve({ data: { name: 'Admin User', avatar: null } });
      if (url.includes('/admin/users')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // check if the dashboard renders at all
  test('renders admin dashboard basics', async () => {
    render(
      <MemoryRouter initialEntries={['/admin?tab=overview']}>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Admin User/i)).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});

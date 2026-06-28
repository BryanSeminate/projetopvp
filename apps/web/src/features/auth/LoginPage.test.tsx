import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders the form', () => {
    renderLogin();
    expect(screen.getByText('Sistema Mateus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('shows validation errors for invalid input (no network call)', async () => {
    const { container } = renderLogin();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'invalido' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(await screen.findByText(/inválido/i)).toBeInTheDocument();
    expect(await screen.findByText(/mínimo 6/i)).toBeInTheDocument();
  });
});

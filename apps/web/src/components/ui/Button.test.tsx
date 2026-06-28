import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and handles click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    fireEvent.click(screen.getByText('Salvar'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled while loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Enviar</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

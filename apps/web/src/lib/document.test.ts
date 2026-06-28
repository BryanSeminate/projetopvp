import { describe, it, expect } from 'vitest';
import { isValidCPF, isValidCNPJ, isValidDocument } from './document';

describe('document (frontend)', () => {
  it('valida CPF', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('12345678901')).toBe(false);
  });
  it('valida CNPJ', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000100')).toBe(false);
  });
  it('isValidDocument por tamanho', () => {
    expect(isValidDocument('52998224725')).toBe(true);
    expect(isValidDocument('11222333000181')).toBe(true);
    expect(isValidDocument('xyz')).toBe(false);
  });
});

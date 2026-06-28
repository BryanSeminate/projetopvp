import { describe, it, expect } from 'vitest';
import { isValidCPF, isValidCNPJ, isValidDocument } from '../src/shared/validators/document.js';

describe('validador de CPF/CNPJ', () => {
  it('aceita CPF válido', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
    expect(isValidCPF('52998224725')).toBe(true);
  });
  it('rejeita CPF inválido', () => {
    expect(isValidCPF('12345678901')).toBe(false);
    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });
  it('aceita CNPJ válido', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    expect(isValidCNPJ('11222333000181')).toBe(true);
  });
  it('rejeita CNPJ inválido', () => {
    expect(isValidCNPJ('11222333000100')).toBe(false);
    expect(isValidCNPJ('00000000000000')).toBe(false);
  });
  it('isValidDocument distingue por tamanho', () => {
    expect(isValidDocument('52998224725')).toBe(true);
    expect(isValidDocument('11222333000181')).toBe(true);
    expect(isValidDocument('123')).toBe(false);
  });
});

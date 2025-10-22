/**
 * 📱 PhoneInput Component - INTERNACIONAL
 * Frontend: 11 dígitos (formato brasileiro)
 * Backend: 13 dígitos (+55 + número)
 */

'use client';

import React, { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Phone, COUNTRY_CODES, type CountryCode } from '@/core/value-objects/phone';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  country?: CountryCode;
  showCountryCode?: boolean;
  className?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, country = 'BR', showCountryCode = false, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => {
      if (!value) return '';
      
      try {
        // Se valor tem 13 dígitos (com DDI), extrair apenas nacional
        if (value.length === 13 && value.startsWith('55')) {
          const nationalNumber = value.substring(2);
          return formatBrazilianPhone(nationalNumber);
        }
        
        // Se valor tem 11 dígitos, formatar diretamente
        if (value.length === 11) {
          return formatBrazilianPhone(value);
        }
        
        // Tentar criar Phone object e formatar
        const phone = Phone.create(value, country);
        return phone.format();
      } catch {
        return value;
      }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleanValue = inputValue.replace(/\D/g, '');
      
      // Limitar a 11 dígitos (formato brasileiro)
      const limitedValue = cleanValue.slice(0, 11);
      
      // Formatar para exibição
      const formatted = formatBrazilianPhone(limitedValue);
      setDisplayValue(formatted);
      
      // Callback com valor limpo (11 dígitos)
      if (onChange) {
        onChange(limitedValue);
      }
    };

    const countryPrefix = showCountryCode ? `+${COUNTRY_CODES[country]} ` : '';

    return (
      <div className="relative">
        {showCountryCode && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            +{COUNTRY_CODES[country]}
          </span>
        )}
        <Input
          ref={ref}
          type="tel"
          inputMode="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={showCountryCode ? "(XX) XXXXX-XXXX" : "(XX) XXXXX-XXXX"}
          className={cn(showCountryCode && "pl-12", className)}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

// Função para formatar número brasileiro
function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  
  // 11 dígitos (celular)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Hook para usar com react-hook-form
export function usePhoneInput(country: CountryCode = 'BR') {
  return {
    parse: (value: string) => {
      if (!value) return '';
      
      try {
        const phone = Phone.create(value, country);
        return phone.raw; // Frontend: 11 dígitos
      } catch {
        return value.replace(/\D/g, '').slice(0, 11);
      }
    },
    
    format: (value: string) => {
      if (!value) return '';
      
      try {
        const phone = Phone.create(value, country);
        return phone.format();
      } catch {
        return formatBrazilianPhone(value);
      }
    },
    
    // Para salvar no backend (13 dígitos)
    toBackend: (value: string) => {
      if (!value) return '';
      
      try {
        const phone = Phone.create(value, country);
        return phone.fullRaw; // Backend: 13 dígitos
      } catch {
        const clean = value.replace(/\D/g, '');
        return clean.length >= 10 ? `${COUNTRY_CODES[country]}${clean}` : '';
      }
    },
    
    // Para carregar do backend (13 dígitos -> 11 dígitos)
    fromBackend: (value: string | number) => {
      if (!value) return '';
      
      const strValue = String(value);
      
      try {
        // Se tem 13 dígitos e começa com 55, extrair nacional
        if (strValue.length === 13 && strValue.startsWith('55')) {
          return strValue.substring(2);
        }
        
        const phone = Phone.create(strValue, country);
        return phone.raw; // 11 dígitos
      } catch {
        return strValue.replace(/\D/g, '').slice(-11);
      }
    }
  };
}

export default PhoneInput;

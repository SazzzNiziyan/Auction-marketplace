'use client';

import React, { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './ui';
import { cn } from '../lib/format';

// Mirrors backend/src/modules/auth/auth.schemas.ts
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export const passwordIsStrong = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

export function PasswordField({ showRules, value, ...props }: InputProps & { showRules?: boolean; value: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Input
        {...props}
        value={value}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex size-9 items-center justify-center rounded-md text-muted hover:text-ink"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
      {showRules && value.length > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li key={r.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-success' : 'text-muted')}>
                <Check className={cn('size-3.5', !ok && 'opacity-30')} aria-hidden />
                {r.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Vinted-style profile section wrapper */
export default function ProfileSection({ title, description, action, children, className }: Props) {
  return (
    <section className={cn('mb-8', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {description ? (
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

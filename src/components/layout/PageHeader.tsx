'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  action?: React.ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  className,
  action,
}: Props) {
  return (
    <header className={cn('mb-4 md:mb-5', className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#007782]"
        >
          ← {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

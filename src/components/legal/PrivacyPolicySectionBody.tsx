import type { PrivacyDetailBlock, PrivacySection } from '@/content/legal/privacyPolicyTypes';

function DetailBlock({ block }: { block: PrivacyDetailBlock }) {
  return (
    <div id={block.id} className="mt-6 scroll-mt-24 border-t border-[#27363d] pt-5 first:mt-4 first:border-0 first:pt-0">
      <h3 className="text-base font-semibold text-[#e7edf0]">{block.title}</h3>
      {block.paragraphs?.map((p) => (
        <p key={p.slice(0, 48)} className="mt-2 text-sm leading-relaxed text-[#b2c0c6]">
          {p}
        </p>
      ))}
      {block.bullets?.length ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#b2c0c6]">
          {block.bullets.map((item) => (
            <li key={item.slice(0, 56)}>{item}</li>
          ))}
        </ul>
      ) : null}
      {block.why ? (
        <p className="mt-3 text-sm leading-relaxed text-[#b2c0c6]">
          <span className="font-semibold text-[#e7edf0]">Miért használjuk?</span> {block.why}
        </p>
      ) : null}
      {block.dataCategories?.length ? (
        <p className="mt-2 text-sm leading-relaxed text-[#b2c0c6]">
          <span className="font-semibold text-[#e7edf0]">Adatkategóriák:</span>{' '}
          {block.dataCategories.join(', ')}.
        </p>
      ) : null}
      {block.legalBasis ? (
        <p className="mt-2 text-sm leading-relaxed text-[#b2c0c6]">
          <span className="font-semibold text-[#e7edf0]">Jogalap:</span> {block.legalBasis}
        </p>
      ) : null}
      {block.retention ? (
        <p className="mt-2 text-sm leading-relaxed text-[#b2c0c6]">
          <span className="font-semibold text-[#e7edf0]">Megőrzés:</span> {block.retention}
        </p>
      ) : null}
    </div>
  );
}

export function PrivacySectionBody({ section }: { section: PrivacySection }) {
  return (
    <>
      {section.paragraphs?.map((p) => (
        <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-[#b2c0c6]">
          {p}
        </p>
      ))}
      {section.bullets?.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#b2c0c6]">
          {section.bullets.map((item) => (
            <li key={item.slice(0, 48)}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.map((block) => (
        <DetailBlock key={block.id ?? block.title} block={block} />
      ))}
    </>
  );
}

export default PrivacySectionBody;

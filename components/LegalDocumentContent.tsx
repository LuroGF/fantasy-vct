import type { LegalSection } from "@/lib/i18n/legal";

export function LegalDocumentContent({ sections }: { sections: LegalSection[] }) {
  return sections.map((section) => (
    <section key={section.heading} className="space-y-2">
      <h2>{section.heading}</h2>
      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {section.bullets && (
        <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
      )}
      {section.warning && <p className="text-v-red">{section.warning}</p>}
    </section>
  ));
}

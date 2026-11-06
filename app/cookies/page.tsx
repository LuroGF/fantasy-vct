import { LegalPage } from "@/components/LegalPage";
import { LegalDocumentContent } from "@/components/LegalDocumentContent";
import { legalCatalog } from "@/lib/i18n/legal";
import { getServerLocale } from "@/lib/i18n/server";

export default async function CookiesPage() {
  const locale = await getServerLocale();
  const document = legalCatalog[locale].cookies;
  return (
    <LegalPage title={document.title} subtitle={document.subtitle}>
      <LegalDocumentContent sections={document.sections} />
    </LegalPage>
  );
}

"use client";

import { StudentPreviewProvider } from "@/components/student-preview";
import { InlineAlert } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <StudentPreviewProvider>
      <div className="grid gap-6">
        <InlineAlert tone="warning" title={t.studentArea.previewTitle}>
          {t.studentArea.previewText}
        </InlineAlert>
        {children}
      </div>
    </StudentPreviewProvider>
  );
}

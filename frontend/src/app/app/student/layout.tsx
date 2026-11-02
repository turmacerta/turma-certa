"use client";

import { UserRound } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { StudentPortalProvider, useStudentPortal } from "@/components/student-portal";
import { EmptyState, ErrorState, LoadingList, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudentPortalProvider>
      <PortalGate>{children}</PortalGate>
    </StudentPortalProvider>
  );
}

function PortalGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const org = useOrg();
  const portal = useStudentPortal();

  if (portal.error) return <ErrorState message={portal.error} onRetry={() => void portal.reload()} />;
  if (portal.loading) return <LoadingList rows={4} />;
  if (!portal.studentId) {
    return <EmptyState icon={<UserRound />} title={t.studentArea.noStudentTitle} description={org.realPersona === "student" ? t.studentArea.noStudentText : t.studentArea.noStudentsInSchool} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {portal.students.length > 1 ? (
        <div className="max-w-xs">
          <Select
            label={org.realPersona === "student" ? t.studentArea.whichChild : t.studentArea.previewStudent}
            searchable={portal.students.length > 8}
            value={portal.studentId}
            onChange={portal.setStudentId}
            options={portal.students.map((student) => ({ value: student.id, label: student.full_name }))}
          />
        </div>
      ) : null}
      {children}
    </div>
  );
}

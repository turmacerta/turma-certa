export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        isPlatformAdmin?: boolean;
        isStaff?: boolean;
        actingRole?: "owner" | "admin" | "teacher" | "student";
        actingTeacherId?: string;
      };
      accessToken?: string;
      orgRole?: "owner" | "admin" | "teacher" | "student";
      permissions?: Set<string>;
      memberships?: Array<{
        organizationId: string;
        role: "owner" | "admin" | "teacher" | "student";
        roleId: string | null;
      }>;
    }
  }
}

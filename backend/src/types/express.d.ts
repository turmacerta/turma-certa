export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        isPlatformAdmin?: boolean;
      };
      memberships?: Array<{
        organizationId: string;
        role: "owner" | "admin" | "teacher" | "student";
      }>;
    }
  }
}

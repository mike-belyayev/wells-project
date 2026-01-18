// types/next-auth.d.ts
declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
  }

  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}
import 'next-auth';
import 'next-auth/jwt';

interface UserRole {
  id: number;
  name: string;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: number | null;
      organization: string | null;
      roles: UserRole[];

    } & DefaultSession['user']; 
  }

  interface User {
    organizationId: number | null;
    organization: string | null; 
    roles: UserRole[]; 
  }
}

declare module 'next-auth/jwt' {

  interface JWT {
    organizationId: number | null;
    organization: string | null;
    roles: UserRole[]; 
  }
}
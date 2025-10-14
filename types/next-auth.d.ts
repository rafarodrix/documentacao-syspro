import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: number | null;
      organization: string | null; // 
      roles: number[];
    } & DefaultSession['user'];
  }


  interface User {
    organizationId: number | null;
    organization: string | null; 
    roles: number[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    organizationId: number | null;
    organization: string | null; //
    roles: number[];
  }
}
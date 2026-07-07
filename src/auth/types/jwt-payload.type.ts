import { Role } from '../../../generated/prisma/client';

export type JwtPayload = {
  id: string;
  email: string;
  role: Role;
  businessId: string;
};

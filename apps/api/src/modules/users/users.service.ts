import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Busca todos os usuários e inclui os dados das empresas vinculadas
  async findAll() {
    return this.prisma.user.findMany({
      include: {
        memberships: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cria o usuário e já realiza o vínculo com a empresa caso seja informado
  async create(data: { email: string; name: string; role?: Role; companyId?: string }) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictException('Este email já está em uso.');
    }

    // Usamos uma transação para garantir que se o vínculo falhar, o usuário não seja criado órfão
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: data.role || 'CLIENTE_USER',
        },
      });

      // Se foi enviado um companyId, cria o Membership na mesma hora
      if (data.companyId) {
        await tx.membership.create({
          data: {
            userId: user.id,
            companyId: data.companyId,
            role: data.role || 'CLIENTE_USER',
          },
        });
      }

      // Retorna o usuário já com a nova associação para atualizar o frontend
      return tx.user.findUnique({
        where: { id: user.id },
        include: { memberships: { include: { company: true } } },
      });
    });
  }
}
import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { DashboardTarefasOverdueItem } from '@dosc-syspro/contracts/dashboard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { toSeries } from '../dashboard.shared';

@Injectable()
export class TarefasDashboardQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async execute(rawHeaders?: IncomingHttpHeaders) {
    await this.authorizationService.assertPermission(rawHeaders, 'dashboard:view');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const tasks = await this.prisma.task.findMany({
      where: { year, month, status: { not: 'CANCELED' } },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        completedAt: true,
        receivedAt: true,
        company: { select: { nomeFantasia: true, razaoSocial: true } },
        assignedTo: { select: { name: true } },
      },
    });

    let total = 0;
    let pending = 0;
    let waitingCustomer = 0;
    let received = 0;
    let sentToAccounting = 0;
    let completed = 0;
    let overdue = 0;
    let canceled = 0;

    const overdueRaw: Array<{ id: string; title: string; companyName: string; dueDate: Date; assignedToName: string | null }> = [];
    const completedDates: Date[] = [];
    const receivedDates: Date[] = [];

    for (const task of tasks) {
      total++;
      switch (task.status) {
        case 'PENDING': pending++; break;
        case 'WAITING_CUSTOMER': waitingCustomer++; break;
        case 'RECEIVED': received++; break;
        case 'SENT_TO_ACCOUNTING': sentToAccounting++; break;
        case 'COMPLETED': completed++; break;
        case 'OVERDUE': overdue++; break;
        case 'CANCELED': canceled++; break;
      }

      if (task.status === 'OVERDUE') {
        overdueRaw.push({
          id: task.id,
          title: task.title,
          companyName: task.company.nomeFantasia ?? task.company.razaoSocial,
          dueDate: task.dueDate,
          assignedToName: task.assignedTo?.name ?? null,
        });
      }

      if (task.completedAt) completedDates.push(task.completedAt);
      if (task.receivedAt) receivedDates.push(task.receivedAt);
    }

    const activity = toSeries([...completedDates, ...receivedDates]);
    const overdueItems: DashboardTarefasOverdueItem[] = overdueRaw
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        companyName: item.companyName,
        dueDate: item.dueDate.toISOString(),
        assignedToName: item.assignedToName,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - item.dueDate.getTime()) / 86_400_000)),
      }));

    return {
      success: true as const,
      data: {
        year,
        month,
        summary: { total, pending, waitingCustomer, received, sentToAccounting, completed, overdue, canceled },
        activity,
        overdueItems,
      },
    };
  }
}

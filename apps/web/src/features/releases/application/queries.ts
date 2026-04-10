import { Release } from "@dosc-syspro/core";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ConversationStatus as TicketStatus, Prisma } from "@prisma/client";

async function fetchReleases(): Promise<Release[]> {
    try {
        const tickets = (await prisma.conversation.findMany({
            where: {
                publishToReleases: true,
                resolutionSummary: { not: null },
                releaseType: { not: null },
                status: { in: [TicketStatus.RESOLVED, TicketStatus.ARCHIVED] },
            },
            orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
            select: {
                id: true,
                ticketNumber: true,
                subject: true,
                resolutionSummary: true,
                resolutionVideoUrl: true,
                releaseType: true,
                releaseModule: true,
                closedAt: true,
                updatedAt: true,
            },
        })) as Array<{
            id: string;
            ticketNumber: string | null;
            subject: string | null;
            resolutionSummary: string | null;
            resolutionVideoUrl: string | null;
            releaseType: string | null;
            releaseModule: string | null;
            closedAt: Date | null;
            updatedAt: Date;
        }>;

        return tickets
            .filter((ticket) => typeof ticket.resolutionSummary === "string" && ticket.resolutionSummary.trim().length > 0)
            .map((ticket) => ({
                id: ticket.ticketNumber || ticket.id,
                type: ticket.releaseType === "BUG" ? "Bug" : "Melhoria",
                isoDate: (ticket.closedAt || ticket.updatedAt).toISOString().slice(0, 10),
                title: ticket.subject || "Atualizacao sem titulo",
                summary:
                    (typeof ticket.resolutionSummary === "string" ? ticket.resolutionSummary.trim() : "") ||
                    ticket.subject ||
                    "Atualizacao interna",
                link: `/portal/tickets/${ticket.id}`,
                videoLink: ticket.resolutionVideoUrl || null,
                tags: ticket.releaseModule ? [ticket.releaseModule] : [],
            }));
    } catch (error) {
        if (isReleaseQueryDatabaseError(error)) {
            console.warn("[releases] database unavailable during build/runtime; returning empty release list");
            return [];
        }

        throw error;
    }
}

function isReleaseQueryDatabaseError(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientInitializationError ||
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError
    );
}

const getReleasesCached = unstable_cache(fetchReleases, ["releases-tickets-v1"], {
    revalidate: 1800,
    tags: ["releases"],
});

export async function getReleases(): Promise<Release[]> {
    return getReleasesCached();
}




import { Release } from "@/core/domain/entities/release.entity";
import { searchZammadTickets } from "@/core/infrastructure/gateways/zammad-release-service";

const ZAMMAD_RELEASE_STATE_ID = 4;
const ZAMMAD_RELEASE_GROUP_ID = 3;

export async function getReleases(): Promise<Release[]> {
    const query = `(type:"Melhoria" OR type:"Bug") AND state_id:${ZAMMAD_RELEASE_STATE_ID} AND group_id:${ZAMMAD_RELEASE_GROUP_ID}`;

    const tickets = await searchZammadTickets(query);

    return tickets.map((t) => {
        const mainModule = t.modulo?.split("::")[0] || "Geral";

        return {
            id: t.number,
            type: t.type || "Indefinido",
            isoDate: (t.close_at || t.updated_at).split("T")[0],
            title: t.title,
            summary: t.release_summary?.trim() || t.title,
            link: `${process.env.ZAMMAD_URL}/#ticket/zoom/${t.id}`,
            videoLink: t.video_link || null,
            tags: [mainModule]
        };
    });
}

import { Release } from "@dosc-syspro/core";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { unstable_cache } from "next/cache";

const ZAMMAD_RELEASE_STATE_ID = 4;
const ZAMMAD_RELEASE_GROUP_ID = 3;

async function fetchReleases(): Promise<Release[]> {
    const query = `(type:"Melhoria" OR type:"Bug") AND state_id:${ZAMMAD_RELEASE_STATE_ID} AND group_id:${ZAMMAD_RELEASE_GROUP_ID}`;

    const tickets = await ZammadGateway.searchTickets(query, 100, "releases");

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
            tags: [mainModule],
        };
    });
}

const getReleasesCached = unstable_cache(fetchReleases, ["releases-zammad-v1"], {
    revalidate: 1800,
    tags: ["releases"],
});

export async function getReleases(): Promise<Release[]> {
    return getReleasesCached();
}

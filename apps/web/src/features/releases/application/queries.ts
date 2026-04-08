import { Release } from "@dosc-syspro/core";
import { unstable_cache } from "next/cache";

async function fetchReleases(): Promise<Release[]> {
    return [];
}

const getReleasesCached = unstable_cache(fetchReleases, ["releases-tickets-v1"], {
    revalidate: 1800,
    tags: ["releases"],
});

export async function getReleases(): Promise<Release[]> {
    return getReleasesCached();
}




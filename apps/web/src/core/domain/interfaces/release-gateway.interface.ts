import type { Release } from "@dosc-syspro/core";

export interface IReleaseGateway {
    getAll(): Promise<Release[]>;
}
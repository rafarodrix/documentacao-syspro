import { Release } from "../entities/release.entity";

export interface IReleaseGateway {
    getAll(): Promise<Release[]>;
}
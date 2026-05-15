"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";

export type InternalUserOption = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive?: boolean;
};

let cachedUsers: InternalUserOption[] | null = null;
let pendingUsersRequest: Promise<InternalUserOption[]> | null = null;

export function invalidateInternalUsersCache() {
    cachedUsers = null;
    pendingUsersRequest = null;
}

async function fetchInternalUsers(): Promise<InternalUserOption[]> {
    if (cachedUsers) return cachedUsers;

    if (pendingUsersRequest) return pendingUsersRequest;

    const request = trpc.users.list
        .query({})
        .then((users) => {
            const filtered = users.filter((user) => user.isActive !== false);
            cachedUsers = filtered;
            return filtered;
        })
        .catch((): InternalUserOption[] => [])
        .finally(() => {
            pendingUsersRequest = null;
        });

    pendingUsersRequest = request;
    return request;
}

export function useInternalUsers() {
    const [users, setUsers] = useState<InternalUserOption[]>(cachedUsers ?? []);

    useEffect(() => {
        let active = true;

        if (cachedUsers) {
            setUsers(cachedUsers);
            return;
        }

        fetchInternalUsers()
            .then((result) => {
                if (active) setUsers(result);
            })
            .catch(() => {
                if (active) {
                    setUsers([]);
                    toast.error("Nao foi possivel carregar a lista de usuarios.");
                }
            });

        return () => {
            active = false;
        };
    }, []);

    return users;
}

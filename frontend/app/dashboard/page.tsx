"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsers } from "@/services/users";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
    const [users, setUsers] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
            return;
        }

        getUsers()
            .then((data) => setUsers(data))
            .catch(() => {
                alert("Sesión inválida");
                router.push("/login");
            });
    }, []);

    return (
        <div className="p-10 space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            {users.length === 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    {users.map((user, index) => (
                        <Card key={index} className="rounded-2xl shadow-sm">
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>
                                        {user.email[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex flex-col">
                                    <CardTitle className="text-base">
                                        {user.email}
                                    </CardTitle>
                                    <Badge variant="secondary">Usuario</Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="text-sm text-muted-foreground">
                                Cuenta activa en el sistema
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
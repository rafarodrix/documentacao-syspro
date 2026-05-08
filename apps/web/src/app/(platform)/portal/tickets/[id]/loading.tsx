import { Card, CardContent, CardHeader, Skeleton } from "@dosc-syspro/ui";

export default function TicketDetailsLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse">
      <div className="mb-4 flex items-center gap-3 px-4 md:px-0">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-6 w-52" />
      </div>

      <div className="mb-6 space-y-2 px-4 md:px-0">
        <Skeleton className="h-7 w-full max-w-3xl" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 gap-6 px-4 pb-10 md:px-0 lg:grid-cols-12">
        <Card className="min-w-0 overflow-hidden border-border/60 lg:col-span-8">
          <CardHeader className="border-b border-border/50 bg-muted/20 py-3">
            <Skeleton className="h-8 w-56" />
          </CardHeader>
          <CardContent className="space-y-6 p-4">
            <Skeleton className="h-20 w-3/4 rounded-2xl" />
            <Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" />
            <Skeleton className="h-20 w-4/5 rounded-2xl" />
            <Skeleton className="mt-8 h-32 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border/60 lg:col-span-4">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

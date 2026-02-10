
export default function Loading() {
    return (
        <div className="flex flex-col gap-8 animate-pulse p-4 mx-auto
  w-full
  max-w-md sm:max-w-xl lg:max-w-4xl">
            {/* Header Skeleton */}
            {/* <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-v-white/5 rounded" />
                <div className="h-6 w-20 bg-v-white/5 rounded" />
            </div> */}

            {/* HUD Skeleton */}
            {/* <div className="grid grid-cols-3 gap-2 h-24">
                <div className="bg-v-white/5 rounded col-span-1" />
                <div className="bg-v-white/5 rounded col-span-1" />
                <div className="bg-v-white/5 rounded col-span-1" />
            </div> */}

            {/* Stats Skeleton */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-v-white/5 h-20 rounded" />
                <div className="bg-v-white/5 h-20 rounded" />
                <div className="bg-v-white/5 h-20 rounded" />
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                <div className="h-8 w-40 bg-v-white/5 rounded" />
                <div className="h-40 bg-v-white/5 rounded-xl border-l-4 border-v-white/10" />
                <div className="h-40 bg-v-white/5 rounded-xl border-l-4 border-v-white/10" />
            </div>
        </div>
    );
}

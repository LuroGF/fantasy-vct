export default function ActivityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-md animate-pulse flex-col gap-6 px-4 py-6 sm:max-w-xl sm:px-6 lg:max-w-4xl">
      <div className="h-12 w-56 bg-white/10" />
      <div className="v-panel h-20 bg-white/[0.04]" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-8 w-20 bg-white/[0.05]" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="v-panel h-20 bg-white/[0.04]" />
      ))}
    </div>
  );
}

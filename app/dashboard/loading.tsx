export default function Loading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full max-w-sm bg-gray-200 rounded-lg animate-pulse mb-8" />

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-border-blue p-5 animate-pulse"
          >
            {/* Top row: name + badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-5 w-14 bg-gray-200 rounded-full ml-3" />
            </div>

            <div className="border-t border-border-blue my-4" />

            {/* Metrics */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Button */}
            <div className="h-9 w-full bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

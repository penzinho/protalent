export default function KlijentiLoading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="space-y-3">
          <div className="h-8 w-40 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-72 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-11 w-52 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#0A2B50]">
        <div className="h-12 w-full rounded-xl bg-gray-100 dark:bg-[#05182d]" />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-[#0A2B50]">
        <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-[#05182d] mb-3" />
        <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-[#05182d] mb-3" />
        <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-[#05182d] mb-3" />
        <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-[#05182d]" />
      </div>
    </div>
  );
}

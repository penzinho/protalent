export default function KlijentDetaljiLoading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse space-y-8">
      <div className="h-6 w-56 rounded-lg bg-gray-200 dark:bg-gray-700" />

      <div className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-gray-800 dark:bg-[#0A2B50]">
        <div className="mb-6 h-10 w-80 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-52 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-[#05182d]" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-[#05182d]" />
          <div className="h-24 rounded-xl bg-gray-100 dark:bg-[#05182d]" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-[#0A2B50]">
        <div className="mb-4 h-8 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-12 rounded-lg bg-gray-100 dark:bg-[#05182d]" />
      </div>
    </div>
  );
}

import { Pencil, Trash2 } from "lucide-react";

export default function LeadTable({
  leads,
  onEdit,
  onDelete,
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case "New":
        return "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200";

      case "Contacted":
        return "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200";

      case "Qualified":
        return "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200";

      case "Converted":
        return "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200";

      case "Lost":
        return "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200";

      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200";
    }
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="text-5xl mb-4">
          🔍
        </div>

        <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
          No leads found
        </h3>

        <p className="text-slate-500 dark:text-slate-400">
          Try changing your search or filter.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto hidden lg:block">
      <table className="w-full min-w-full">
        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Name</th>
            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Company</th>
            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Phone</th>
            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Status</th>
            <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Actions</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead._id}
              className="border-t border-slate-200 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-all duration-200"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center font-semibold text-indigo-600 dark:text-indigo-400">
                    {lead.name.charAt(0)}
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {lead.name}
                    </p>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {lead.email}
                    </p>
                  </div>
                </div>
              </td>

              <td className="p-4">{lead.company}</td>

              <td className="p-4">{lead.phone}</td>

              <td className="p-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${getStatusColor(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </td>

              <td className="p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onEdit(lead)
                    }
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-400 transition"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() =>
                      onDelete(lead)
                    }
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-slate-800 hover:border-red-200 dark:hover:border-red-600 text-red-500 dark:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

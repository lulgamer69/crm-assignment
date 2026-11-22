import { Pencil, Trash2 } from "lucide-react";

export default function LeadCard({
  lead,
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {lead.name}
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lead.email}
          </p>
        </div>

        <span
          className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 ${getStatusColor(
            lead.status
          )}`}
        >
          {lead.status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 mb-4">
        <p>
          Company: {lead.company}
        </p>

        <p>
          Phone: {lead.phone}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(lead)}
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-600 text-indigo-600 dark:text-indigo-400 transition-all duration-200"
        >
          <Pencil size={16} className="mx-auto" />
        </button>

        <button
          onClick={() => onDelete(lead)}
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 hover:border-red-200 dark:hover:border-red-600 transition-all duration-200"
        >
          <Trash2 size={16} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}

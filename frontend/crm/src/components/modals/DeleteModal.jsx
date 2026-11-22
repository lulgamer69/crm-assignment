import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export default function DeleteModal({
  onClose,
  onConfirm,
  lead,
  loading = false,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="presentation"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        exit={{
          opacity: 0,
          scale: 0.95
        }}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-lead-title"
        aria-describedby="delete-lead-description"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Trash2 size={22} />
        </div>

        <h2 id="delete-lead-title" className="text-xl font-bold mb-2 text-slate-900 dark:text-white text-center">
          Delete Lead?
        </h2>

        <p id="delete-lead-description" className="text-slate-600 dark:text-slate-400 mb-4 text-center">
          This action cannot be undone.
        </p>

        {lead && (
          <div className="mb-6 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900 dark:text-white">{lead.name}</p>
            {lead.email && <p className="mt-1 text-slate-600 dark:text-slate-300">{lead.email}</p>}
            {lead.phone && <p className="mt-1 text-slate-600 dark:text-slate-300">{lead.phone}</p>}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Deleting…" : "Delete Lead"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

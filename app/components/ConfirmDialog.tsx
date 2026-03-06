'use client'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  neutralLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
  onNeutral?: () => void
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Voltar',
  neutralLabel,
  destructive = false,
  onConfirm,
  onCancel,
  onNeutral,
}: ConfirmDialogProps) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="text-4xl text-center mb-3">{destructive ? '⚠️' : 'ℹ️'}</div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors ${
              destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
        {neutralLabel && onNeutral && (
          <button
            onClick={onNeutral}
            className="mt-3 w-full py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            {neutralLabel}
          </button>
        )}
      </div>
    </div>
  )
}

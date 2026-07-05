import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useCharacters } from '../hooks/useCharacters'

interface CharacterUploadProps {
  onClose: () => void
}

const DEFAULT_PROMPT =
  "Transform the person into the character in the reference image. Preserve their movements and expressions. Match the character's skin tone, hairstyle, facial features, and clothing."

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function Spinner(): React.JSX.Element {
  return (
    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CharacterUpload({ onClose }: CharacterUploadProps): React.JSX.Element {
  const { uploadCharacter } = useCharacters()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [dragging, setDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectFile = (selected: File | undefined): void => {
    setError(null)
    if (!selected) return

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Use a JPG, PNG, or WEBP image.')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('Image must be under 5MB. Try a smaller file.')
      return
    }

    setFile(selected)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragging(false)
    selectFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!file) {
      setError('Choose an image first.')
      return
    }
    if (!name.trim()) {
      setError('Give your character a name.')
      return
    }

    setLoading(true)
    try {
      await uploadCharacter({ file, name: name.trim(), prompt: prompt.trim() || DEFAULT_PROMPT })
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl border border-[#2A2A2A] bg-surface p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">New Character</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A0A0A0] transition-colors hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Image drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors ${
              dragging ? 'border-accent bg-surface-raised' : 'border-[#2A2A2A] bg-[#1E1E1E]'
            }`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="px-4 text-center text-sm text-[#525252]">
                <p>Drag &amp; drop an image here</p>
                <p className="mt-1">or click to browse</p>
                <p className="mt-2 text-xs">JPG, PNG, WEBP · max 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="char-name" className="text-sm font-medium text-white">
              Name
            </label>
            <input
              id="char-name"
              type="text"
              value={name}
              maxLength={30}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cyber Ninja"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-2.5 text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label htmlFor="char-prompt" className="text-sm font-medium text-white">
                Transformation Prompt
              </label>
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-[#525252] text-[10px] text-[#A0A0A0]"
                  aria-label="Prompt help"
                >
                  ?
                </button>
                {showTooltip && (
                  <div className="absolute bottom-6 left-1/2 z-10 w-56 -translate-x-1/2 rounded-lg border border-[#2A2A2A] bg-surface-raised p-2 text-xs text-[#A0A0A0] shadow-lg">
                    This tells the AI how to transform you. The default works well for most
                    characters.
                  </div>
                )}
              </div>
            </div>
            <textarea
              id="char-prompt"
              value={prompt}
              rows={4}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full resize-none rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-2.5 text-sm text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            {loading ? <Spinner /> : 'Save Character'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CharacterUpload

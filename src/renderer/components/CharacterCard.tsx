import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useAppStore } from '../store/appStore'
import type { Character } from '../types/character'

interface CharacterCardProps {
  character: Character
  onDelete: (id: string) => void
}

const LONG_PRESS_MS = 500

function CharacterCard({ character, onDelete }: CharacterCardProps): React.JSX.Element {
  const activeCharacter = useAppStore((s) => s.activeCharacter)
  const setActiveCharacter = useAppStore((s) => s.setActiveCharacter)
  const isActive = activeCharacter?.id === character.id

  const [menuOpen, setMenuOpen] = useState(false)
  const longPressTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (): void => setMenuOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuOpen])

  const handleSelect = (): void => {
    if (menuOpen) return
    setActiveCharacter(character)
  }

  const handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    setMenuOpen(true)
  }

  const startLongPress = (): void => {
    longPressTimer.current = window.setTimeout(() => setMenuOpen(true), LONG_PRESS_MS)
  }

  const cancelLongPress = (): void => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleDelete = (e: MouseEvent): void => {
    e.stopPropagation()
    onDelete(character.id)
  }

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        className={`relative h-40 w-40 overflow-hidden rounded-xl border bg-[#1E1E1E] transition-all hover:brightness-110 ${
          isActive
            ? 'border-2 border-accent shadow-[0_0_12px_#FF6B0033]'
            : 'border border-[#2A2A2A]'
        }`}
      >
        {character.thumbnail_url ? (
          <img
            src={character.thumbnail_url}
            alt={character.name}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-[#525252]">
            {character.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5">
          <span className="block truncate text-left text-xs font-medium text-white">
            {character.name}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleDelete}
        aria-label={`Delete ${character.name}`}
        title="Delete character"
        className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-[#EF4444] group-hover:opacity-100 focus:opacity-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="h-3.5 w-3.5"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-2 top-2 z-10 overflow-hidden rounded-lg border border-[#2A2A2A] bg-surface-raised shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onDelete(character.id)
            }}
            className="block w-full px-4 py-2 text-left text-sm text-[#EF4444] transition-colors hover:bg-[#2A2A2A]"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default CharacterCard

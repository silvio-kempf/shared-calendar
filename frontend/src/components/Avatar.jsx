import { useState } from 'react'

/**
 * Reusable avatar component.
 * Shows the uploaded profile image if available, otherwise a colored
 * circle with the first letter of the user's name.
 *
 * Props:
 *   user       – user object with { full_name, color, avatar_url? }
 *   className  – size + any extra classes (e.g. "w-9 h-9")
 *   textSize   – Tailwind text size for the fallback letter (e.g. "text-sm")
 */
export default function Avatar({ user, className = 'w-8 h-8', textSize = 'text-sm' }) {
  const [imgError, setImgError] = useState(false)
  const src = user.avatar_url && !imgError ? `/api${user.avatar_url}` : null

  return (
    <div
      className={`${className} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-white select-none`}
      style={!src ? { backgroundColor: user.color } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={user.full_name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textSize}>{user.full_name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

/** Simulates the document preview shown in the colored card header */
export function DocumentThumbnail({ color = '#fff' }: { color?: string }) {
  const lineColor = `${color}55`
  return (
    <svg width="72" height="90" viewBox="0 0 72 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Paper */}
      <rect x="4" y="0" width="64" height="84" rx="4" fill="white" fillOpacity="0.92" />
      {/* Lines */}
      <rect x="12" y="12" width="40" height="4" rx="2" fill={lineColor} />
      <rect x="12" y="22" width="48" height="3" rx="1.5" fill={lineColor} />
      <rect x="12" y="30" width="44" height="3" rx="1.5" fill={lineColor} />
      <rect x="12" y="38" width="48" height="3" rx="1.5" fill={lineColor} />
      <rect x="12" y="46" width="36" height="3" rx="1.5" fill={lineColor} />
      <rect x="12" y="58" width="48" height="3" rx="1.5" fill={lineColor} />
      <rect x="12" y="66" width="40" height="3" rx="1.5" fill={lineColor} />
      {/* Bookmark icon top-right corner */}
      <path d="M58 0H68V14L63 10L58 14V0Z" fill="white" fillOpacity="0.6" />
    </svg>
  )
}

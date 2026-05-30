import type { CSSProperties, ReactNode } from 'react'

interface XpWindowProps {
  title: string
  icon?: string
  children: ReactNode
  width?: string | number
  onClose?: () => void
  style?: CSSProperties
}

export function XpWindow({ title, icon = '🖥️', children, width = 480, onClose, style }: XpWindowProps) {
  return (
    <div className="xp-window" style={{ width, ...style }}>
      <div className="xp-titlebar">
        <div className="xp-titlebar-left">
          <span className="xp-titlebar-icon">{icon}</span>
          <span>{title}</span>
        </div>
        <div className="xp-titlebar-buttons">
          <button className="xp-titlebar-btn minimize" aria-label="Minimize">_</button>
          <button className="xp-titlebar-btn maximize" aria-label="Maximize">□</button>
          <button className="xp-titlebar-btn close" aria-label="Close" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="xp-content">
        {children}
      </div>
    </div>
  )
}

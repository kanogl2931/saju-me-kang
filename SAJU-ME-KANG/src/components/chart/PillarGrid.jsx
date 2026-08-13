export default function PillarGrid({ pillars }) {
  if (!pillars.length) return null

  return (
    <div className="pillar-grid" aria-label="사주 네 기둥">
      {pillars.map((pillar) => (
        <div key={pillar.label} className="pillar-card">
          <span className="pillar-label">{pillar.label}</span>
          <span className="pillar-value">{pillar.value}</span>
        </div>
      ))}
    </div>
  )
}

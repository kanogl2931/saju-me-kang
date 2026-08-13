export default function ChartRows({ rows, title, fallbackText }) {
  if (rows.length > 0) {
    return (
      <div className={title ? 'chart-detail' : undefined}>
        {title && <h3>{title}</h3>}
        <dl className="chart-rows">
          {rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="chart-row">
              {row.label && <dt>{row.label}</dt>}
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  if (!fallbackText) return null

  return (
    <div className={title ? 'chart-detail' : undefined}>
      {title && <h3>{title}</h3>}
      <div className="result-text chart-text">{fallbackText}</div>
    </div>
  )
}

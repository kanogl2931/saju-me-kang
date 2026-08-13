import ChartRows from './ChartRows'
import PillarGrid from './PillarGrid'

export default function ChartSection({ resultRef, pillars, chartRows, sajuChart }) {
  return (
    <section className="result-section chart-section" ref={resultRef}>
      <h2>사주 명식</h2>
      <PillarGrid pillars={pillars} />
      {chartRows.length > 0 ? (
        <ChartRows rows={chartRows} />
      ) : (
        <div className="result-text chart-text">{sajuChart.formatted}</div>
      )}
    </section>
  )
}

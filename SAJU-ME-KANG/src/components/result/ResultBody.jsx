export default function ResultBody({ blocks }) {
  if (!blocks.length) return null

  return (
    <div className="interpretation-body">
      {blocks.map((block, index) => {
        if (block.type === 'divider') {
          return <hr key={`divider-${index}`} className="result-divider" />
        }

        if (block.type === 'heading') {
          return (
            <h4 key={`heading-${index}`} className="result-subtitle">
              {block.text}
            </h4>
          )
        }

        return (
          <p key={`paragraph-${index}`} className="result-paragraph">
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

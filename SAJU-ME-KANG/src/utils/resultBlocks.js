import { PREVIEW_CUTOFF_HEADING } from '../constants/saju'

function stripMarkdownMarkers(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()
}

export function parseResultBlocks(text) {
  if (!text) return []

  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (/^---+$/.test(line)) {
        return [{ type: 'divider' }]
      }

      const boldHeading = line.match(/^\*\*(.+?)\*\*$/)
      if (boldHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(boldHeading[1]) }]
      }

      const bracketHeading = line.match(/^\[(.+?)\]$/)
      if (bracketHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(bracketHeading[1]) }]
      }

      const numberedHeading = line.match(/^\*\*\s*(\d+\.\s*.+?)\s*\*\*$/)
      if (numberedHeading) {
        return [{ type: 'heading', text: stripMarkdownMarkers(numberedHeading[1]) }]
      }

      return [{ type: 'paragraph', text: stripMarkdownMarkers(line) }]
    })
}

function blockTextLength(block) {
  if (block.type === 'divider') return 0
  return block.text?.length ?? 0
}

function restHasContent(blocks, fromIndex) {
  return blocks.slice(fromIndex).some((block) => block.type !== 'divider')
}

/** 로그인 전 미리보기: [사주에서 가장 특이하고 눈에 띄는 점] 섹션까지만 공개 */
export function splitBlocksForPreview(blocks) {
  if (!blocks.length) {
    return { visible: [], locked: false }
  }

  const cutoffHeadingIndex = blocks.findIndex(
    (block) => block.type === 'heading' && PREVIEW_CUTOFF_HEADING.test(block.text),
  )

  if (cutoffHeadingIndex !== -1) {
    let endIndex = blocks.length
    for (let index = cutoffHeadingIndex + 1; index < blocks.length; index += 1) {
      if (blocks[index].type === 'heading') {
        endIndex = index
        break
      }
    }

    return {
      visible: blocks.slice(0, endIndex),
      locked: restHasContent(blocks, endIndex),
    }
  }

  // 구형/비정형 결과: 앞쪽 절반만 공개
  const totalLength = blocks.reduce((sum, block) => sum + blockTextLength(block), 0)
  if (totalLength === 0) {
    return { visible: blocks, locked: false }
  }

  const targetLength = Math.max(1, Math.floor(totalLength * 0.45))
  let visibleCount = 0
  let accumulated = 0

  for (let index = 0; index < blocks.length; index += 1) {
    accumulated += blockTextLength(blocks[index])
    visibleCount = index + 1
    if (accumulated >= targetLength) break
  }

  if (visibleCount >= blocks.length && blocks.length > 1) {
    visibleCount = Math.max(1, Math.floor(blocks.length * 0.45))
  }

  if (visibleCount >= blocks.length) {
    const [first] = blocks
    if (first?.type === 'paragraph' && first.text.length > 80) {
      const cut = Math.floor(first.text.length * 0.45)
      return {
        visible: [{ ...first, text: `${first.text.slice(0, cut).trimEnd()}…` }],
        locked: true,
      }
    }
    return { visible: blocks, locked: false }
  }

  return {
    visible: blocks.slice(0, visibleCount),
    locked: restHasContent(blocks, visibleCount),
  }
}

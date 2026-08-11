// 괄호 안 내용이 앞 용어와 동일하면 괄호를 제거 (예: 목욕(목욕) → 목욕)
export function removeTautologicalParentheses(text) {
  if (!text) return text

  return text.replace(/([^\s(,，]+)\(\s*([^)]+?)\s*\)/g, (match, term, inner) => {
    const normalize = (value) => value.replace(/\s+/g, '')
    if (normalize(term) === normalize(inner)) {
      return term
    }
    return match
  })
}

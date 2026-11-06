import { useEffect } from 'react'

interface DocumentMeta {
  title: string
  description?: string
  robots?: string
}

function upsertMeta(name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('name', name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function useDocumentMeta({ title, description, robots }: DocumentMeta) {
  useEffect(() => {
    document.title = title
    if (description) {
      upsertMeta('description', description)
    }
    if (robots) {
      upsertMeta('robots', robots)
    }
  }, [title, description, robots])
}

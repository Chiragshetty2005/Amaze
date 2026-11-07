import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

const STAGGER_MS = 55
const MAX_STAGGER_MS = 240
const CONTENT_TAGS = new Set([
  'SECTION',
  'ARTICLE',
  'FORM',
  'FIELDSET',
  'TABLE',
  'UL',
  'OL',
  'DL',
  'NAV',
  'HEADER',
  'FOOTER',
  'MAIN',
])

const CARD_SURFACE_CLASS =
  /(?:^|\s)(?:rounded-(?:lg|xl|2xl|3xl)|card(?:-flat)?)(?:\s|$)/
const CARD_CHROME_CLASS =
  /(?:^|\s)(?:border|bg-(?:surface|paper|mint|line))(?:\s|$)/

function elementChildren(element: Element): HTMLElement[] {
  return Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
}

function isCardLike(element: HTMLElement): boolean {
  if (element.matches('section, article')) return true
  if (element.hasAttribute('data-scroll-card')) return true

  const className =
    typeof element.className === 'string' ? element.className : ''
  if (/\bcard-flat\b/.test(className)) return true

  return (
    CARD_SURFACE_CLASS.test(className) && CARD_CHROME_CLASS.test(className)
  )
}

function isGenericWrapper(element: HTMLElement): boolean {
  return (
    !CONTENT_TAGS.has(element.tagName) &&
    !isCardLike(element) &&
    !element.hasAttribute('data-scroll-ignore')
  )
}

function isRevealCandidate(element: HTMLElement): boolean {
  if (element.matches('section, article, form, fieldset')) return true
  if (element.hasAttribute('data-scroll-card')) return true

  return (
    element.matches('div, li, aside, ul, ol, dl') && isCardLike(element)
  )
}

function collectBlocks(scope: HTMLElement): HTMLElement[] {
  let blocks = elementChildren(scope)

  while (blocks.length === 1 && isGenericWrapper(blocks[0])) {
    const children = elementChildren(blocks[0])
    if (children.length === 0) break
    blocks = children
  }

  return blocks
}

function collectCandidates(scope: HTMLElement): HTMLElement[] {
  const blocks = collectBlocks(scope)
  const allElements = Array.from(scope.querySelectorAll<HTMLElement>('*'))
  const candidateElements = allElements.filter(isRevealCandidate)
  const candidateSet = new Set(candidateElements)

  // Page-level blocks are useful fallbacks when they contain no cards or
  // sections of their own, such as page headers and back links.
  blocks.forEach((block) => {
    const hasCandidateInside = candidateElements.some(
      (candidate) => block === candidate || block.contains(candidate),
    )
    if (!hasCandidateInside) candidateSet.add(block)
  })

  return allElements.filter((element) => candidateSet.has(element))
}

function selectViewportTargets(
  candidates: HTMLElement[],
  scope: HTMLElement,
  viewportEdge: number,
): HTMLElement[] {
  const belowFold = candidates.filter(
    (candidate) => candidate.getBoundingClientRect().top >= viewportEdge,
  )
  const selected = new Set<HTMLElement>()
  const targets: HTMLElement[] = []

  belowFold.forEach((candidate) => {
    let ancestor = candidate.parentElement
    while (ancestor && ancestor !== scope) {
      if (selected.has(ancestor)) return
      ancestor = ancestor.parentElement
    }

    selected.add(candidate)
    targets.push(candidate)
  })

  candidates.forEach((candidate) => {
    if (selected.has(candidate)) return
    candidate.removeAttribute('data-scroll-reveal')
    candidate.removeAttribute('data-scroll-reveal-visible')
    candidate.style.removeProperty('--scroll-reveal-delay')
  })

  return targets
}

function revealNow(targets: HTMLElement[]) {
  targets.forEach((target) => {
    target.setAttribute('data-scroll-reveal-visible', '')
  })
}

/**
 * Reveals sections and cards as they enter the viewport. Content that is
 * already on screen is left untouched so route changes never hide the first
 * paint. The CSS handles reduced motion and print output.
 */
export function useScrollRevealScope(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const { pathname } = useLocation()

  useEffect(() => {
    const scope = ref.current
    if (!scope || !enabled) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )

    if (reducedMotion.matches || typeof IntersectionObserver === 'undefined') {
      return
    }

    // Keep a buffer below the fold so late font or layout shifts cannot hide
    // a sliver of content that has already entered the viewport.
    const viewportEdge = window.innerHeight + 40
    const candidates = collectCandidates(scope)
    const targets = selectViewportTargets(
      candidates,
      scope,
      viewportEdge,
    )
    if (targets.length === 0) return

    targets.forEach((target, index) => {
      target.removeAttribute('data-scroll-reveal-visible')
      target.setAttribute('data-scroll-reveal', '')
      target.style.setProperty(
        '--scroll-reveal-delay',
        `${Math.min(index * STAGGER_MS, MAX_STAGGER_MS)}ms`,
      )
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.setAttribute('data-scroll-reveal-visible', '')
          observer.unobserve(entry.target)
        })
      },
      {
        threshold: 0.01,
        rootMargin: '0px',
      },
    )

    targets.forEach((target) => observer.observe(target))

    const handleMotionChange = () => {
      if (!reducedMotion.matches) return
      revealNow(targets)
      observer.disconnect()
    }

    reducedMotion.addEventListener('change', handleMotionChange)

    return () => {
      observer.disconnect()
      reducedMotion.removeEventListener('change', handleMotionChange)
    }
  }, [enabled, pathname, ref])
}

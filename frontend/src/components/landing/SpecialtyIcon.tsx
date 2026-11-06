import {
  Baby,
  Bone,
  Brain,
  Drop,
  Ear,
  GenderFemale,
  Heartbeat,
  Stethoscope,
} from '@phosphor-icons/react'

export function SpecialtyIcon({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  switch (id) {
    case 's1':
      return <Heartbeat className={className} aria-hidden="true" />
    case 's2':
      return <GenderFemale className={className} aria-hidden="true" />
    case 's3':
      return <Drop className={className} aria-hidden="true" />
    case 's4':
      return <Bone className={className} aria-hidden="true" />
    case 's5':
      return <Baby className={className} aria-hidden="true" />
    case 's6':
      return <Stethoscope className={className} aria-hidden="true" />
    case 's7':
      return <Ear className={className} aria-hidden="true" />
    case 's8':
      return <Brain className={className} aria-hidden="true" />
    default:
      return <Stethoscope className={className} aria-hidden="true" />
  }
}

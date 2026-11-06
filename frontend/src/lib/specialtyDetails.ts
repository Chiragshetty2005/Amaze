const areasOfCare: Record<string, string[]> = {
  s1: [
    'Blood pressure and cholesterol reviews',
    'Palpitations and chest discomfort',
    'Follow up after a cardiac procedure',
  ],
  s2: [
    'Pregnancy and antenatal care',
    'Menstrual health and contraception',
    'Menopause and hormone support',
  ],
  s3: [
    'Acne, eczema, and psoriasis',
    'Hair and nail concerns',
    'Allergy related rashes',
  ],
  s4: [
    'Back, neck, and shoulder pain',
    'Knee and joint injuries',
    'Sports recovery and mobility',
  ],
  s5: [
    'Newborn and infant care',
    'Growth, nutrition, and vaccination',
    'Childhood infections and asthma',
  ],
  s6: [
    'Fever, infection, and fatigue',
    'Diabetes and blood pressure',
    'Annual health checks',
  ],
  s7: [
    'Hearing loss and ear pain',
    'Sinus, tonsils, and allergies',
    'Voice changes and swallowing',
  ],
  s8: [
    'Migraine and recurring headache',
    'Nerve pain and numbness',
    'Tremor, balance, and memory concerns',
  ],
}

export function getAreasOfCare(specializationId: string): string[] {
  return areasOfCare[specializationId] ?? areasOfCare.s6
}

export const clinicAddress = {
  name: 'AmazeCare Clinic',
  lines: ['4th Floor, 12th Main Road', 'Indiranagar, Bengaluru 560038'],
}

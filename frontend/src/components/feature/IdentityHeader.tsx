/** Cabecera de identidad reutilizable (SC-05 / SC-17): etiqueta + descriptor, nunca sola. */

import type { SubjectDto, SubjectListItemDto } from '@/api/subjects';
import { displayNameOf } from '@/api/subjects';

type Props = {
  subject: SubjectDto | SubjectListItemDto;
  compact?: boolean;
};

function isDto(s: SubjectDto | SubjectListItemDto): s is SubjectDto {
  return 'activeLabel' in s || 'descriptor' in s;
}

export default function IdentityHeader({ subject, compact }: Props) {
  const label = isDto(subject)
    ? subject.activeLabel?.operationalLabel
    : subject.operationalLabel;
  const descriptorParts: string[] = [];

  if (isDto(subject)) {
    if (subject.descriptor?.apparentSex) descriptorParts.push(subject.descriptor.apparentSex);
    if (subject.descriptor?.apparentAgeRange) descriptorParts.push(subject.descriptor.apparentAgeRange);
    if (subject.descriptor?.arrivalAtUtc) {
      const t = new Date(subject.descriptor.arrivalAtUtc);
      descriptorParts.push(
        t.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      );
    }
    if (subject.descriptor?.freeText) descriptorParts.push(subject.descriptor.freeText);
  } else {
    if (subject.apparentSex) descriptorParts.push(subject.apparentSex);
    if (subject.apparentAgeRange) descriptorParts.push(subject.apparentAgeRange);
    if (subject.descriptorFreeText) descriptorParts.push(subject.descriptorFreeText);
  }

  const name = displayNameOf(subject);
  const state = subject.identificationState;
  const isUnidentified = state === 'no_identificado';

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
      data-testid="identity-header"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {label ? (
          <span className="font-heading text-lg font-semibold tracking-wide text-slate-900">
            {label}
          </span>
        ) : (
          <span className="font-heading text-lg font-semibold text-slate-900">{name}</span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {state.replaceAll('_', ' ')}
        </span>
        {subject.recordNumber && (
          <span className="text-xs text-slate-500">Exp. {subject.recordNumber}</span>
        )}
      </div>
      {(isUnidentified || descriptorParts.length > 0) && (
        <p className="mt-1 text-sm text-slate-600" data-testid="identity-descriptor">
          {descriptorParts.length > 0
            ? descriptorParts.join(' · ')
            : 'Sin descriptor capturado'}
        </p>
      )}
      {label && name !== label && !isUnidentified && (
        <p className="mt-0.5 text-sm text-slate-500">{name}</p>
      )}
      {isDto(subject) && subject.biologicalSex && (
        <p className="mt-1 text-xs text-slate-500">
          Sexo: {subject.biologicalSex}
          {subject.sexSource ? ` (${subject.sexSource})` : ''}
          {subject.genderIdentity
            ? ` · Género (trato): ${subject.genderIdentity}`
            : ''}
          {subject.estimatedAge
            ? ` · Edad estimada: ${subject.estimatedAge.valor} ${subject.estimatedAge.unidad}`
            : subject.birthDate
              ? ` · Nac. ${subject.birthDate}`
              : ' · Edad no registrada'}
        </p>
      )}
      {isDto(subject) && !subject.biologicalSex && subject.genderIdentity && (
        <p className="mt-1 text-xs text-slate-500">
          Género (trato): {subject.genderIdentity} · Sexo biológico no capturado
        </p>
      )}
    </div>
  );
}

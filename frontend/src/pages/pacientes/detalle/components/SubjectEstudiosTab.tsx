import EstudiosModulePlaceholder from '@/components/feature/EstudiosModulePlaceholder';

type Props = {
  subjectId: string;
};

export default function SubjectEstudiosTab({ subjectId }: Props) {
  return (
    <EstudiosModulePlaceholder
      subjectId={subjectId}
      testId="subject-estudios-tab"
      title="Estudios del sujeto"
    />
  );
}

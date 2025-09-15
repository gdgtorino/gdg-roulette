import DrawPageServer from './DrawPageServer';

interface DrawPageProps {
  params: {
    eventId: string;
  };
}

export default function DrawPage({ params }: DrawPageProps) {
  return <DrawPageServer eventId={params.eventId} />;
}

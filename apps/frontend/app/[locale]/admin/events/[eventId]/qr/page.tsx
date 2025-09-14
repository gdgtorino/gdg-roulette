import QRPageServer from './QRPageServer';

interface EventQRPageProps {
  params: {
    eventId: string;
  };
}

export default function EventQRPage({ params }: EventQRPageProps) {
  return <QRPageServer eventId={params.eventId} />;
}
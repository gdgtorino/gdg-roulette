'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Event {
  id: string;
  name: string;
  qrCode: string;
  registrationOpen: boolean;
}

interface QRCodeDisplayProps {
  event: Event;
}

export function QRCodeDisplay({ event }: QRCodeDisplayProps) {
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'success'
  });

  const registrationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register/${event.id}`;

  const copyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(registrationUrl);
      setModal({
        open: true,
        title: 'Success',
        message: 'Link copied to clipboard!',
        type: 'success'
      });
    }
  };

  return (
    <>
      <div className="text-center">
        {/* QR Code Image */}
        <div className="mb-6 flex justify-center">
          <Image
            src={event.qrCode}
            alt="Registration QR Code"
            width={300}
            height={300}
            className="max-w-xs w-full border rounded-lg shadow-sm"
            unoptimized
          />
        </div>

        {/* Registration Link */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Registration Link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded text-sm break-all">
              {registrationUrl}
            </code>
            <Button size="sm" onClick={copyLink}>
              Copy
            </Button>
          </div>
        </div>

        {/* Registration Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            event.registrationOpen
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            Registration {event.registrationOpen ? 'Open' : 'Closed'}
          </div>
        </div>
      </div>

      {/* Modal for notifications */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className={modal.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              {modal.title}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
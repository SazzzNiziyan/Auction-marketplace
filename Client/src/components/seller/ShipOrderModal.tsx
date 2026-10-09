'use client';

import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { Button, Input, Modal, Select } from '../ui';
import { api } from '../../lib/api';
import { useToast } from '../../lib/toast';

const CARRIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ecom Express', 'Xpressbees', 'Shadowfax', 'Other'].map((c) => ({ value: c, label: c }));

export default function ShipOrderModal({ orderId, open, onClose, onShipped }: { orderId: string | null; open: boolean; onClose: () => void; onShipped: () => void }) {
  const toast = useToast();
  const [carrier, setCarrier] = useState('Delhivery');
  const [otherCarrier, setOtherCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [eta, setEta] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTracking('');
      setTrackingUrl('');
      setEta('');
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    setBusy(true);
    const res = await api.post(`/commerce/orders/${orderId}/fulfill`, {
      carrier: carrier === 'Other' ? otherCarrier.trim() : carrier,
      trackingNumber: tracking.trim(),
      trackingUrl: trackingUrl.trim() || undefined,
      estimatedDelivery: eta ? new Date(`${eta}T12:00:00`).toISOString() : undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success('Marked as shipped', 'The buyer can now track the package.');
      onShipped();
      onClose();
    } else toast.error('Couldn’t update order', res.message);
  };

  const today = new Date().toISOString().slice(0, 10);
  const valid = tracking.trim().length >= 4 && (carrier !== 'Other' || otherCarrier.trim().length >= 2);

  return (
    <Modal open={open} onClose={onClose} title="Ship order" description="Add courier details. The buyer is updated instantly.">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Courier" options={CARRIERS} value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        {carrier === 'Other' && <Input label="Courier name" required value={otherCarrier} onChange={(e) => setOtherCarrier(e.target.value)} />}
        <Input label="Tracking number" required minLength={4} value={tracking} onChange={(e) => setTracking(e.target.value)} />
        <Input label="Tracking link" type="url" placeholder="https://" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} hint="Optional" />
        <Input label="Estimated delivery" type="date" min={today} value={eta} onChange={(e) => setEta(e.target.value)} hint="Optional" />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Truck} loading={busy} disabled={!valid}>Mark as shipped</Button>
        </div>
      </form>
    </Modal>
  );
}

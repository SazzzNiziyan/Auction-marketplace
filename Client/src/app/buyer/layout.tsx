import React from 'react';
import DashboardShell from '../../components/layout/DashboardShell';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell area="buyer">{children}</DashboardShell>;
}

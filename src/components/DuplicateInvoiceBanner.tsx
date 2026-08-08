import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DuplicateInvoiceBannerProps {
  supplierName?: string;
  invoiceNumber?: string;
  className?: string;
}

export const DuplicateInvoiceBanner: React.FC<DuplicateInvoiceBannerProps> = ({
  className = ''
}) => {
  return (
    <div className={`bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 my-3 text-amber-950 shadow-2xs ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-amber-100 rounded-md text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-amber-900 text-sm tracking-tight flex items-center gap-2">
            <span>Possible Duplicate Invoice Detected</span>
          </h4>
          
          <div className="space-y-0.5">
            <span className="font-bold text-amber-900 block uppercase tracking-wider text-[10px]">Reason:</span>
            <p className="text-amber-900/90 font-medium leading-relaxed">
              A similar invoice already exists in the Accounts Payable database.
            </p>
          </div>

          <div className="space-y-0.5 pt-0.5">
            <span className="font-bold text-amber-900 block uppercase tracking-wider text-[10px]">Recommendation:</span>
            <p className="text-amber-900 font-semibold leading-relaxed">
              Please review the invoice before approving payment.
            </p>
            <p className="text-amber-800 text-[11px] font-bold italic pt-0.5">
              Do not reject or pay the invoice automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface MissingBankBannerProps {
  className?: string;
}

export const MissingBankBanner: React.FC<MissingBankBannerProps> = ({
  className = ''
}) => {
  return (
    <div className={`bg-rose-50 border-l-4 border-rose-500 rounded-r-lg p-4 my-3 text-rose-950 shadow-2xs ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-rose-100 rounded-md text-rose-700 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-extrabold text-xs tracking-wide uppercase">
              Payment On Hold
            </span>
          </div>
          
          <div className="space-y-0.5">
            <span className="font-bold text-rose-900 block uppercase tracking-wider text-[10px]">Reason:</span>
            <p className="text-rose-900 font-medium leading-relaxed">
              Supplier bank account information is missing.
            </p>
          </div>

          <div className="space-y-0.5 pt-0.5">
            <span className="font-bold text-rose-900 block uppercase tracking-wider text-[10px]">Recommendation:</span>
            <p className="text-rose-950 font-semibold leading-relaxed">
              Please verify the supplier's payment details before approving payment.
            </p>
            <p className="text-rose-800 text-[11px] font-bold italic pt-0.5">
              Do not update Payment Status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

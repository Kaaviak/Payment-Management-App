import React, { useState } from 'react';
import { MasterLedgerRow } from '../types';
import { calculatePriority, evaluateDuplicates, CURRENT_DATE } from '../utils/paymentRules';
import { X, Plus, Building2, Lock, FileCheck2 } from 'lucide-react';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddInvoice: (newRow: MasterLedgerRow) => void;
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  isOpen,
  onClose,
  onAddInvoice
}) => {
  const [supplierName, setSupplierName] = useState('Guan Seng Steel Pte Ltd');
  const [invoiceNumber, setInvoiceNumber] = useState(`GS-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [poReference, setPoReference] = useState(`PO-BH-${Math.floor(8800 + Math.random() * 100)}`);
  const [invoiceDate, setInvoiceDate] = useState('2026-08-01');
  const [dueDate, setDueDate] = useState('2026-08-05');
  const [description, setDescription] = useState('Heavy Duty Stainless Steel Plates (10mm x 4ft x 8ft)');
  const [quantity, setQuantity] = useState(10);
  const [unitPrice, setUnitPrice] = useState(320);
  const [bankAccount, setBankAccount] = useState('DBS Current 003-902841-2');

  if (!isOpen) return null;

  const totalAmount = quantity * unitPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRow: MasterLedgerRow = {
      id: `BH-INV-${Date.now().toString().slice(-4)}`,
      supplierName,
      invoiceNumber,
      poReference,
      invoiceDate,
      dueDate,
      description,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalAmount,
      extractionStatus: 'Completed',
      matchStatus: '3-Way Matched',
      humanReview: 'Verified',
      confidenceLevel: 98,
      bankAccount,
      paymentStatus: 'Payment On Hold',
      paymentDate: '',
      paymentMethod: 'N/A',
      approvedBy: '',
      paymentPriority: calculatePriority(dueDate, CURRENT_DATE),
      duplicateCheck: 'No Duplicate',
      notes: 'Imported from pre-extracted & 3-way matched pipeline.',
      auditTrail: [
        {
          id: `a-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: 'System Pipeline',
          action: 'Extracted & Matched',
          details: `Invoice ${invoiceNumber} arrived from Extraction & 3-Way Match application.`
        }
      ]
    };

    onAddInvoice(newRow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded text-white">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Simulate Extracted Invoice Entry
              </h2>
              <p className="text-xs text-slate-300">
                Insert pre-extracted invoice into Master Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col A: Supplier Name</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col B: Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-blue-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col C: PO Ref</label>
              <input
                type="text"
                value={poReference}
                onChange={(e) => setPoReference(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col D: Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col E: Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Col F: Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col G: Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                min="1"
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col H: Unit Price ($)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
                min="0"
                step="0.01"
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Col I: Total Amount</label>
              <div className="p-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 text-sm">
                ${totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Col O: Bank Account Number</label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
            <span className="text-emerald-700 font-bold">Pre-set Pipeline Attributes:</span> Extraction Status: Completed (98%), 3-Way Match Status: 3-Way Matched, Human Review: Verified.
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Insert Into Master Ledger</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

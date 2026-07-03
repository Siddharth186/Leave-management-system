import React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export const ConfirmationModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none px-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-lg mx-auto my-6 z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative flex flex-col w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl outline-none focus:outline-none">
          <div className="flex items-center justify-between p-6 border-b border-solid border-slate-800 rounded-t-xl">
            <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
            <button
              className="p-2 ml-auto bg-transparent border-0 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-full transition-colors outline-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative p-6 flex-auto text-slate-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

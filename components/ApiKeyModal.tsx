import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useApiKey } from '../hooks/useApiKey';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { selectKey } = useApiKey();

  const handleSelectKey = async () => {
    await selectKey();
    onClose(); // Close the modal after the selection dialog is triggered
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="API Key Required">
      <div className="text-center p-4">
        <h4 className="font-semibold text-lg mb-2">Connect to Google AI</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          To use this AI-powered feature, you need to select a Google AI API key. Your key is stored securely in your browser and is never shared with us.
        </p>
        <Button onClick={handleSelectKey} size="lg">
          Select API Key
        </Button>
        <p className="text-xs text-slate-500 mt-4">
          For more information, see the{' '}
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline text-emerald-500 hover:text-emerald-400">
            Gemini API billing documentation
          </a>.
        </p>
      </div>
    </Modal>
  );
};

export default ApiKeyModal;

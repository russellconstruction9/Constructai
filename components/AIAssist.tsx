import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from './ui/Button';
import { WandSparklesIcon, XIcon } from './Icons';
import { getAIAgentResponse, ApiKeyError } from '../services/geminiService';
import { useApiKey } from '../hooks/useApiKey';
import { useEstimate } from './Layout';
import { CostCategory } from '../types';

const AIAssist: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const { isKeySelected, selectKey, resetKeyState } = useApiKey();
  const estimateContext = useEstimate();
  const location = useLocation();

  // The agent is only fully active on the estimate builder page
  const isAgentActive = location.pathname === '/estimate-builder';

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !estimateContext) return;
    setIsLoading(true);
    setResponse('');
    
    try {
      const result = await getAIAgentResponse(prompt);
      
      if (result.functionCalls && result.functionCalls.length > 0) {
        for (const funcCall of result.functionCalls) {
          if (funcCall.name === 'addLineItemToEstimate') {
            const { description, category, quantity, unit, unitCost } = funcCall.args;
            // Validate category before adding
            const validCategories: CostCategory[] = ['Labor', 'Material', 'Subcontractor', 'Equipment', 'Other'];
            const validatedCategory = validCategories.includes(category as CostCategory) ? category as CostCategory : 'Other';

            estimateContext.addLineItem({
                description: description as string,
                category: validatedCategory,
                quantity: quantity as number,
                unit: unit as string,
                unitCost: unitCost as number,
            });
          }
        }
      }
      setResponse(result.text);

    } catch (error) {
      if (error instanceof ApiKeyError) {
        resetKeyState();
        setResponse(`${error.message} Please select a valid key to continue.`);
      } else {
        setResponse(error instanceof Error ? error.message : 'An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
      setPrompt('');
    }
  };
  
  const renderContent = () => {
    if (!isKeySelected) {
      return (
        <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <h4 className="font-semibold text-lg mb-2">API Key Required</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            To use AI features, you need to select a Google AI API key.
          </p>
          <Button onClick={selectKey}>Select API Key</Button>
          <p className="text-xs text-slate-500 mt-4">
            For more information, see the{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline text-emerald-500 hover:text-emerald-400">
              Gemini API billing documentation
            </a>.
          </p>
        </div>
      );
    }
    
    if (!isAgentActive) {
         return (
             <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <h4 className="font-semibold text-lg mb-2">Agent is standing by</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Navigate to the <span className="font-semibold text-emerald-600 dark:text-emerald-500">Estimate Builder</span> to have the AI agent automatically build an estimate for you.
                </p>
             </div>
         );
    }
    
    return (
      <>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Describe the job, and I'll research pricing and add line items to your estimate.
        </p>
        <form onSubmit={handleSubmit}>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'Install a 36-inch bathroom vanity with a single-hole faucet'"
                className="w-full p-2 border rounded-md bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-emerald-500"
                rows={4}
                disabled={isLoading}
            />
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? 'Building...' : 'Build Estimate'}
            </Button>
        </form>
        {response && (
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-md">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Agent Summary:</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{response}</p>
            </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          size="lg"
          className="rounded-full shadow-lg !p-4"
          onClick={handleToggle}
          aria-label="Toggle AI Assist"
        >
          <WandSparklesIcon className="h-6 w-6" />
        </Button>
      </div>
      
      <div className={`fixed top-0 right-0 h-full bg-white dark:bg-slate-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-full max-w-md border-l dark:border-slate-700`}>
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    <WandSparklesIcon className="h-5 w-5 mr-2 text-emerald-500" />
                    AI Estimating Agent
                </h3>
                <Button variant="ghost" size="sm" onClick={handleToggle} className="!p-2">
                    <XIcon className="h-5 w-5" />
                </Button>
            </div>
            
            <div className="flex-grow p-4 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
      </div>
    </>
  );
};

export default AIAssist;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { AppState } from '../types';

interface Props {
  state: AppState;
}

const getMessages = (state: AppState) => {
  switch(state) {
    case AppState.ORCHESTRATING: 
      return ["ORCHESTRATOR: Analyzing strategy...", "Structuring the campaign...", "Extracting core vision..."];
    case AppState.MARKETING: 
      return ["MARKETER: Analyzing target platform...", "Drafting compelling copy...", "Applying viral hooks..."];
    case AppState.DIRECTING: 
      return ["DIRECTOR: Planning the visual execution...", "Mapping variables for Blotato...", "Creating the cinematic blueprint..."];
    case AppState.MEDIA_GEN: 
      return ["MEDIA CREATOR: Generating assets via Blotato...", "Applying template logic...", "Waiting for async rendering..."];
    case AppState.VALIDATION: 
      return ["VALIDATOR: Running QA score...", "Checking brand consistency...", "Verifying message alignment..."];
    default: 
      return ["System processing...", "Please hold..."];
  }
};

const LoadingIndicator: React.FC<Props> = ({ state }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const messages = getMessages(state);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32 mb-10">
        <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500/10 scale-110"></div>
        <div className="absolute inset-0 rounded-full border-t-[3px] border-indigo-500 animate-[spin_1.5s_linear_infinite]"></div>
        <div className="absolute inset-4 rounded-full border-b-[3px] border-purple-500 animate-[spin_2s_linear_infinite_reverse]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
        </div>
      </div>
      <p className="text-indigo-400 font-mono text-xs uppercase tracking-[0.5em] animate-pulse">
        {messages[msgIdx]}
      </p>
    </div>
  );
};

export default LoadingIndicator;

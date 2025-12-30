
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
      return ["ORCHESTRATOR: Analyzing requirements...", "Building visual hierarchy...", "Enhancing cinematic prompts..."];
    case AppState.IMAGING: 
      return ["ARTIST: Generating high-fidelity assets...", "Applying global illumination...", "Rendering cinematic textures..."];
    case AppState.MARKETING: 
      return ["MARKETER: Analyzing visual impact...", "Drafting advertising copy...", "Defining brand voice..."];
    case AppState.SCRIPTING: 
      return ["DIRECTOR: Planning camera motion...", "Blocking the shot...", "Preparing cinematography..."];
    case AppState.VIDEO_GEN: 
      return ["VEO: Rendering the master clip...", "Applying temporal stability...", "Finalizing production..."];
    default: 
      return ["Workflow processing..."];
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

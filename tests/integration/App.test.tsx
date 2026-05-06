import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';
import * as openRouterService from '../../services/openRouterService';

// Mock all services
vi.mock('../../services/openRouterService', () => ({
  orchestrate: vi.fn(),
  marketAnalysis: vi.fn(),
  directorAgent: vi.fn(),
  validationAgent: vi.fn()
}));

vi.mock('../../services/blotatoService', () => ({
  generateMediaBlotato: vi.fn(),
  publishBlotato: vi.fn(),
  scheduleBlotato: vi.fn()
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders SETTINGS state if keys are missing', () => {
    render(<App />);
    expect(screen.getByText(/Paramètres/i)).toBeInTheDocument();
  });

  it('renders IDLE state and handles form submission if keys are present', async () => {
    localStorage.setItem('astromedia_settings', JSON.stringify({
      apiKey: 'test-key',
      blotatoApiKey: 'test-key-blotato'
    }));

    (openRouterService.orchestrate as any).mockResolvedValue({
      enhancedPrompt: 'Enhanced', musicMood: 'Happy', recommendedGenre: 'cinematic', strategy: 'Test'
    });
    
    // We mock the other stages loosely so it doesn't crash during transition
    // But since the orchestrate is async, just testing the first transition is fine.

    render(<App />);
    expect(screen.getByText(/AI CAMPAIGN STUDIO/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Décrivez votre vision.../i);
    fireEvent.change(textarea, { target: { value: 'A test prompt' } });

    const submitBtn = screen.getByRole('button', { name: /Lancer la production/i });
    fireEvent.click(submitBtn);

    // It should transition to ORCHESTRATING and show the loading text
    await waitFor(() => {
      expect(screen.getByText(/STATE: ORCHESTRATING/i)).toBeInTheDocument();
    });
  });
});

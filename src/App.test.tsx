import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import summary from '../public/data/summary.json';
import acre from '../public/data/states/AC.json';
import saoPaulo from '../public/data/states/SP.json';
import App from './App';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('election dashboard', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/data/summary.json')) return Promise.resolve(jsonResponse(summary));
      if (url.endsWith('/data/states/AC.json')) return Promise.resolve(jsonResponse(acre));
      if (url.endsWith('/data/states/SP.json')) return Promise.resolve(jsonResponse(saoPaulo));
      return Promise.resolve(jsonResponse({ message: 'Not found' }, 404));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches only the national summary initially and switches across the four areas', async () => {
    render(<App />);
    expect(await screen.findByText('Comparativo entre turnos')).toBeInTheDocument();
    expect(screen.getByText('Dados sintéticos')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/summary.json');

    fireEvent.click(screen.getByRole('button', { name: 'Abstenções' }));
    expect(screen.getByText('Comparecimento e votos não válidos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Viradas' }));
    expect(screen.getByText('Mudança de vencedor')).toBeInTheDocument();
    expect(screen.getByText('Selecione um estado para consultar as viradas municipais.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Pós-17h' }));
    expect(screen.getByText('Seções com geração após as 17h')).toBeInTheDocument();
  });

  it('loads a selected state on demand and filters its data by municipality', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    const stateDialog = screen.getByRole('dialog', { name: 'Selecionar estado' });
    fireEvent.click(within(stateDialog).getByRole('button', { name: /Acre/ }));

    fireEvent.click(await screen.findByRole('button', { name: 'Viradas' }));
    expect(await screen.findByText('Mudança de vencedor')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/data/states/AC.json',
    ));
    expect(await screen.findByText('MUNICÍPIO DEMO A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar município' }));
    const municipalityDialog = screen.getByRole('dialog', { name: 'Selecionar município' });
    fireEvent.click(within(municipalityDialog).getByRole('button', { name: /MUNICÍPIO DEMO A/ }));
    expect(screen.getByRole('heading', { level: 3, name: /MUNICÍPIO DEMO A/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/data/states/'))).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /São Paulo/ }));
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /Acre/ }));
    expect(await screen.findByRole('heading', { name: 'Acre' })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/data/states/'))).toHaveLength(2);
  });

  it('deduplicates the initial request when React Strict Mode replays effects', async () => {
    render(<StrictMode><App /></StrictMode>);
    expect(await screen.findByText('Comparativo entre turnos')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/data/summary.json'))).toHaveLength(1);
  });

  it('offers a retry when the national summary request fails', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse({}, 503)));
    render(<App />);

    expect(await screen.findByText('Não foi possível carregar os dados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Comparativo entre turnos')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a national response that does not match the data contract', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse({ data_source: 'demo' })));
    render(<App />);

    expect(await screen.findByText('Não foi possível carregar os dados')).toBeInTheDocument();
    expect(screen.getByText('O resumo recebido não corresponde ao contrato de dados esperado.')).toBeInTheDocument();
    expect(screen.queryByText('Comparativo entre turnos')).not.toBeInTheDocument();
  });

  it('reports malformed JSON from the national endpoint', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('not-json', { status: 200 })));
    render(<App />);

    expect(await screen.findByText('Não foi possível carregar os dados')).toBeInTheDocument();
    expect(screen.getByText('O servidor retornou um JSON inválido. Gere novamente os arquivos de dados.')).toBeInTheDocument();
  });

  it('rejects an empty national response instead of rendering zeroed metrics', async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse({
      ...summary,
      ufs: [],
    })));
    render(<App />);

    expect(await screen.findByText('Não foi possível carregar os dados')).toBeInTheDocument();
    expect(screen.queryByText('Comparativo entre turnos')).not.toBeInTheDocument();
  });

  it('offers a retry when an on-demand state request fails', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse({}, 404)));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /Acre/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Viradas' }));
    expect(await screen.findByText('Não foi possível carregar AC')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Mudança de vencedor')).toBeInTheDocument();
    expect(await screen.findByText('MUNICÍPIO DEMO A')).toBeInTheDocument();
  });

  it('rejects an empty state file rather than showing empty metrics as valid data', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse({
      ...acre,
      municipios: [],
    })));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /Acre/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Viradas' }));

    expect(await screen.findByText('Não foi possível carregar AC')).toBeInTheDocument();
    expect(screen.queryByText('MUNICÍPIO DEMO A')).not.toBeInTheDocument();
  });

  it('rejects a state response whose UF does not match the requested file', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse(acre)));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /São Paulo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Viradas' }));

    expect(await screen.findByText('Não foi possível carregar SP')).toBeInTheDocument();
    expect(screen.getByText('O arquivo estadual de SP não corresponde ao contrato de dados.')).toBeInTheDocument();
  });

  it('closes a bottom sheet on Escape and restores focus to its trigger', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    const stateButton = screen.getByRole('button', { name: 'Selecionar estado' });
    await userEvent.click(stateButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar seleção' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stateButton).toHaveFocus();
  });

  it('keeps keyboard focus within the bottom sheet', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    await userEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    const dialog = screen.getByRole('dialog', { name: 'Selecionar estado' });
    const buttons = within(dialog).getAllByRole('button');
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(buttons[buttons.length - 1], { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
  });

  it('announces offline mode and clearly reports when an uncached state cannot load', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('status')).toHaveTextContent('Você está offline');

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Network unavailable')));
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar estado' })).getByRole('button', { name: /Acre/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Viradas' }));

    expect(await screen.findByText(/Você está offline e não há uma cópia deste arquivo disponível no cache/)).toBeInTheDocument();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
  });

  it('labels navigation buttons accessibly and preserves touch target sizing', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });
    for (const label of ['Visão geral', 'Abstenções', 'Viradas', 'Pós-17h']) {
      const button = within(navigation).getByRole('button', { name: label });
      expect(button).toHaveAttribute('aria-label', label);
      expect(button.className).toContain('min-h-12');
    }
  });
});

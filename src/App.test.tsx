import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(fetchMock).toHaveBeenCalledWith('/data/summary.json', expect.objectContaining({ signal: expect.any(AbortSignal) }));

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
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(await screen.findByText('MUNICÍPIO DEMO A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Selecionar município' }));
    const municipalityDialog = screen.getByRole('dialog', { name: 'Selecionar município' });
    fireEvent.click(within(municipalityDialog).getByRole('button', { name: /MUNICÍPIO DEMO A/ }));
    expect(screen.getByRole('heading', { level: 3, name: /MUNICÍPIO DEMO A/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/data/states/'))).toHaveLength(1);
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

  it('closes a bottom sheet when Escape is pressed', async () => {
    render(<App />);
    await screen.findByText('Comparativo entre turnos');
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar estado' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

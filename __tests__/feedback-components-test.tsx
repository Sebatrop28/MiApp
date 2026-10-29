import { fireEvent, render, screen } from '@testing-library/react-native';

import { Banner } from '@/components/feedback/banner';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { SettingsProvider } from '@/context/settings-context';

const wrapper = ({ children }: { children: React.ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;

describe('componentes de estado', () => {
  it('LoadingState muestra el mensaje', async () => {
    await render(<LoadingState message="Cargando datos…" />, { wrapper });
    expect(await screen.findByText('Cargando datos…')).toBeTruthy();
  });

  it('ErrorState muestra el error y ejecuta el reintento', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState title="Error" message="Sin conexión" onRetry={onRetry} />, { wrapper });
    expect(await screen.findByText('Sin conexión')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('Banner se puede cerrar', async () => {
    const onDismiss = jest.fn();
    await render(<Banner tone="error" message="No se pudo guardar" onDismiss={onDismiss} />, { wrapper });
    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar aviso' }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEY } from './storage';
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const navigate = async (label: string) => {
  await userEvent.click(
    within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(label) }),
  );
};
describe('Interfaz funcional', () => {
  it('crea, consulta, busca, edita y elimina un personaje con confirmación', async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigate('Archivo del canon');
    await user.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    let dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nombre o título'), 'Luma del Viento');
    await user.type(within(dialog).getByLabelText('Descripción'), 'Exploradora de las nubes.');
    await user.type(within(dialog).getByLabelText('Rol en el universo'), 'Exploradora');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar personaje' }));
    expect(screen.getByRole('heading', { name: 'Luma del Viento' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /^Luma del Viento$/ }));
    expect(within(screen.getByRole('dialog')).getByText('Exploradora de las nubes.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
    await user.type(screen.getByRole('textbox', { name: 'Buscar en el archivo' }), 'Luma');
    expect(screen.queryByRole('heading', { name: 'Ira de la Sal' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Editar Luma del Viento' }));
    dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Nombre o título'));
    await user.type(within(dialog).getByLabelText('Nombre o título'), 'Luma de la Brisa');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar personaje' }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).records.some(
        (r: { title: string }) => r.title === 'Luma de la Brisa',
      ),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Eliminar Luma de la Brisa' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { name: 'Luma de la Brisa' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Eliminar Luma de la Brisa' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.queryByRole('heading', { name: 'Luma de la Brisa' })).toBeNull();
  });
  it('guarda una resolución y la recupera al montar de nuevo', async () => {
    const first = render(<App />);
    await navigate('Prueba de Canon');
    const select = screen.getByRole('combobox', { name: /Estado de La noche/ });
    await userEvent.selectOptions(select, 'resolved');
    first.unmount();
    render(<App />);
    await navigate('Prueba de Canon');
    expect(
      (screen.getByRole('combobox', { name: /Estado de La noche/ }) as HTMLSelectElement).value,
    ).toBe('resolved');
    expect(screen.getByText(/Decisión humana: Resuelta/)).toBeTruthy();
  });
  it('crea una regla y un evento incompatibles; editar el evento elimina la alerta', async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigate('Archivo del canon');
    await user.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Regla$/ }));
    let dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre o título'), {
      target: { value: 'La marca de Ira' },
    });
    fireEvent.change(within(dialog).getByLabelText('Descripción'), {
      target: { value: 'La marca de Ira es plateada.' },
    });
    await user.selectOptions(within(dialog).getByLabelText('Sujeto'), 'demo-char-ira');
    fireEvent.change(within(dialog).getByLabelText('Propiedad o acción'), {
      target: { value: 'color_de_marca' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor esperado'), {
      target: { value: 'plata' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar regla' }));
    await user.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^Acontecimiento$/ }),
    );
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre o título'), {
      target: { value: 'Una marca dorada' },
    });
    fireEvent.change(within(dialog).getByLabelText('Descripción'), {
      target: { value: 'Ira muestra su marca.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Fecha dentro de la historia'), {
      target: { value: '0800-01-01' },
    });
    fireEvent.change(within(dialog).getByLabelText('Propiedad 1'), {
      target: { value: 'color_de_marca' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor 1'), { target: { value: 'oro' } });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar acontecimiento' }));
    await navigate('Prueba de Canon');
    expect(screen.getByRole('combobox', { name: /Estado de Una marca dorada/ })).toBeTruthy();
    await navigate('Línea temporal');
    expect(screen.getAllByRole('heading', { level: 3 })[0].textContent).toBe('Una marca dorada');
    await navigate('Archivo del canon');
    await user.click(screen.getByRole('button', { name: 'Editar Una marca dorada' }));
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Valor 1'), { target: { value: 'plata' } });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar acontecimiento' }));
    await navigate('Prueba de Canon');
    expect(screen.queryByRole('combobox', { name: /Estado de Una marca dorada/ })).toBeNull();
    await navigate('Archivo del canon');
    await user.click(screen.getByRole('button', { name: 'Editar La marca de Ira' }));
    dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Valor esperado'), { target: { value: 'oro' } });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar regla' }));
    await navigate('Prueba de Canon');
    expect(screen.getByRole('combobox', { name: /Estado de Una marca dorada/ })).toBeTruthy();
    await navigate('Archivo del canon');
    for (const title of ['Una marca dorada', 'La marca de Ira']) {
      await user.click(screen.getByRole('button', { name: `Eliminar ${title}` }));
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));
      expect(screen.queryByRole('heading', { name: title })).toBeNull();
    }
  });
  it('muestra errores de validación sin guardar claves inválidas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigate('Archivo del canon');
    await user.click(screen.getByRole('button', { name: 'Nuevo registro' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Regla$/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Nombre o título'), {
      target: { value: 'Regla inválida' },
    });
    fireEvent.change(within(dialog).getByLabelText('Descripción'), {
      target: { value: 'Una prueba de validación.' },
    });
    fireEvent.change(within(dialog).getByLabelText('Propiedad o acción'), {
      target: { value: 'No es una clave' },
    });
    fireEvent.change(within(dialog).getByLabelText('Valor esperado'), {
      target: { value: 'azul' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Guardar regla' }));
    expect(within(dialog).getByRole('alert').textContent).toContain('Usa una clave');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toHaveLength(9);
  });
  it('filtra por origen y protege personajes vinculados', async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigate('Archivo del canon');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por origen' }), 'user');
    expect(screen.getByRole('heading', { name: 'Aquí comienza otra historia' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por origen' }), 'demo');
    await user.click(screen.getByRole('button', { name: 'Eliminar Ira de la Sal' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByRole('alert').textContent).toContain('vinculado');
    expect(screen.getByRole('heading', { name: 'Ira de la Sal' })).toBeTruthy();
  });
});

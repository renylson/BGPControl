import { render, screen, fireEvent } from '@testing-library/react';
import ReusableForm from '../components/ReusableForm';
import type { FormField } from '../components/ReusableForm';

describe('ReusableForm', () => {
  const fields: FormField[] = [
    { name: 'foo', label: 'Foo', required: true },
    { name: 'bar', label: 'Bar', required: false },
  ];
  const values = { foo: '', bar: '' };
  const errors = { foo: 'Campo obrigatório' };
  const onChange = jest.fn();
  const onSubmit = jest.fn((e) => e.preventDefault());

  it('renderiza campos e exibe erro', () => {
    render(
      <ReusableForm
        title="Formulário Teste"
        fields={fields}
        values={values}
        errors={errors}
        onChange={onChange}
        onSubmit={onSubmit}
      >
        <div>Extra</div>
      </ReusableForm>
    );
    expect(screen.getByLabelText(/foo/i)).toBeInTheDocument();
    expect(screen.getByText(/campo obrigatório/i)).toBeInTheDocument();
    expect(screen.getByText('Extra')).toBeInTheDocument();
  });

  it('chama onChange e onSubmit', () => {
    render(
      <ReusableForm
        fields={fields}
        values={values}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );
    fireEvent.change(screen.getByLabelText(/foo/i), { target: { value: 'abc' } });
    expect(onChange).toHaveBeenCalledWith('foo', 'abc');
    fireEvent.submit(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalled();
  });
});

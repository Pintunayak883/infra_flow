import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/routes';
import { cn } from '../utils/cn';

const departments = ['Electrical', 'Mechanical', 'Civil', 'IT', 'Management'];

type RegisterForm = {
  name: string;
  rollNumber: string;
  department: string;
  email: string;
  password: string;
};

type RegisterErrors = Partial<Record<keyof RegisterForm, string>>;

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    rollNumber: '',
    department: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyles = useMemo(
    () =>
      'block w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-soft placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary',
    [],
  );

  const validate = () => {
    const nextErrors: RegisterErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = 'Full name is required';
    }
    if (!form.rollNumber.trim()) {
      nextErrors.rollNumber = 'Roll number is required';
    } else if (!/^[A-Z0-9-]{4,}$/.test(form.rollNumber.trim().toUpperCase())) {
      nextErrors.rollNumber = 'Use an alphanumeric roll number';
    }
    if (!form.department) {
      nextErrors.department = 'Select a department';
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid institute email';
    }
    if (form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof RegisterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, role: 'student' as const };
      const data = await registerUser(payload);
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        rollNumber: form.rollNumber,
        token: data.accessToken,
      });
      navigate(ROUTES.dashboard);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 sm:gap-10 lg:flex-row lg:items-center lg:gap-16">
        <section className="rounded-3xl border border-surface-border bg-white/90 p-6 shadow-soft backdrop-blur sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Create Account</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl">
            Onboard to InfraFlow and give every complaint a predictable SLA.
          </h1>
          <p className="mt-4 max-w-lg text-base text-neutral-600">
            Students submit rich issue reports, departments triage faster, and administrators audit everything from a
            single console.
          </p>
        </section>

        <section className="w-full rounded-3xl border border-surface-border bg-white p-5 shadow-soft sm:p-8">
          <h2 className="text-2xl font-semibold text-neutral-900">Register your campus profile</h2>
          <p className="mt-1 text-sm text-neutral-500">All fields are required for verification.</p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="text-sm font-semibold text-neutral-700">
                Full Name
              </label>
              <input
                id="name"
                className={cn(inputStyles, 'min-h-[44px]', errors.name && 'border-danger focus:ring-danger/30 focus:border-danger')}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="roll" className="text-sm font-semibold text-neutral-700">
                Roll Number
              </label>
              <input
                id="roll"
                className={cn(
                  inputStyles,
                  'min-h-[44px]',
                  errors.rollNumber && 'border-danger focus:ring-danger/30 focus:border-danger',
                )}
                value={form.rollNumber}
                onChange={(e) => updateField('rollNumber', e.target.value.toUpperCase())}
                aria-invalid={Boolean(errors.rollNumber)}
                aria-describedby={errors.rollNumber ? 'roll-error' : undefined}
              />
              {errors.rollNumber && (
                <p id="roll-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.rollNumber}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="department" className="text-sm font-semibold text-neutral-700">
                Department
              </label>
              <select
                id="department"
                className={cn(
                  inputStyles,
                  'min-h-[44px]',
                  'appearance-none',
                  errors.department && 'border-danger focus:ring-danger/30 focus:border-danger',
                )}
                value={form.department}
                onChange={(e) => updateField('department', e.target.value)}
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? 'dept-error' : undefined}
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept.toLowerCase()}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p id="dept-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.department}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-semibold text-neutral-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={cn(inputStyles, 'min-h-[44px]', errors.email && 'border-danger focus:ring-danger/30 focus:border-danger')}
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-register-error' : undefined}
              />
              {errors.email && (
                <p id="email-register-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="password" className="text-sm font-semibold text-neutral-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={cn(inputStyles, 'min-h-[44px]', errors.password && 'border-danger focus:ring-danger/30 focus:border-danger')}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-register-error' : undefined}
              />
              {errors.password && (
                <p id="password-register-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.password}
                </p>
              )}
            </div>

            {error && (
              <div className="md:col-span-2 rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="md:col-span-2 min-h-[44px] rounded-3xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to={ROUTES.login} className="font-semibold text-primary">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Register;

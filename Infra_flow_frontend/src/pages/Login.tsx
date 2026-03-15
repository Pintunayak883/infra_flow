import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRouteByRole, ROUTES } from '../utils/routes';
import { cn } from '../utils/cn';

type LoginRole = 'student' | 'worker' | 'admin' | 'authority';

type LoginForm = {
  role: LoginRole;
  rollNumber: string;
  mobileNumber: string;
  email: string;
  username: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

const roleTabs: Array<{ value: LoginRole; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'worker', label: 'Worker' },
  { value: 'admin', label: 'Admin' },
  { value: 'authority', label: 'Authority' },
];

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<LoginForm>({
    role: 'student',
    rollNumber: '',
    mobileNumber: '',
    email: '',
    username: 'admin',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyles = useMemo(
    () =>
      'block min-h-[44px] w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-soft placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary',
    [],
  );

  const validate = () => {
    const nextErrors: LoginErrors = {};

    if (form.role === 'student') {
      if (!form.rollNumber.trim()) {
        nextErrors.rollNumber = 'Roll number is required';
      }
    }

    if (form.role === 'worker') {
      if (!form.mobileNumber.trim()) {
        nextErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^\d{10}$/.test(form.mobileNumber.trim())) {
        nextErrors.mobileNumber = 'Enter a valid 10-digit mobile number';
      }
    }

    if (form.role === 'authority') {
      if (!form.email.trim()) {
        nextErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        nextErrors.email = 'Enter a valid email address';
      }
    }

    if (form.role === 'admin' && !form.username.trim()) {
      nextErrors.username = 'Username is required';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof LoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateRole = (role: LoginRole) => {
    setForm((prev) => ({ ...prev, role }));
    setErrors({});
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const payload: any = {
        role: form.role,
        password: form.password,
      };

      if (form.role === 'student') payload.rollNumber = form.rollNumber.toUpperCase();
      if (form.role === 'worker') payload.mobileNumber = form.mobileNumber;
      if (form.role === 'authority') payload.email = form.email.toLowerCase();
      if (form.role === 'admin') payload.username = form.username;

      const data = await loginUser(payload);
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        token: data.accessToken,
        rollNumber: data.user.rollNumber,
      });
      navigate(getDashboardRouteByRole(data.user.role));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-10 lg:flex-row lg:items-center lg:gap-16">
        <section className="rounded-3xl border border-surface-border bg-white/90 p-6 shadow-soft backdrop-blur sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Unified Access</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl">
            One login for student, worker, admin, and authority roles.
          </h1>
          <p className="mt-4 max-w-lg text-base text-neutral-600">
            Select your role first, then use role-specific credentials. You will be redirected to your dashboard automatically.
          </p>
        </section>

        <section className="w-full rounded-3xl border border-surface-border bg-white p-5 shadow-soft sm:p-8">
          <h2 className="text-2xl font-semibold text-neutral-900">Sign in to InfraFlow</h2>
          <p className="mt-1 text-sm text-neutral-500">Choose role and continue with secure JWT authentication.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {roleTabs.map((roleTab) => (
              <button
                key={roleTab.value}
                type="button"
                onClick={() => updateRole(roleTab.value)}
                className={cn(
                  'min-h-[42px] rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition sm:min-h-[44px]',
                  form.role === roleTab.value
                    ? 'border-primary bg-primary/10 text-primary-700'
                    : 'border-surface-border bg-white text-neutral-600 hover:border-primary/40 hover:text-primary',
                )}
              >
                {roleTab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {form.role === 'student' && (
              <div>
                <label htmlFor="rollNumber" className="text-sm font-semibold text-neutral-700">
                  Roll Number
                </label>
                <input
                  id="rollNumber"
                  className={cn(inputStyles, errors.rollNumber && 'border-danger focus:ring-danger/30 focus:border-danger')}
                  placeholder="e.g. EC-21-045"
                  value={form.rollNumber}
                  onChange={(e) => updateField('rollNumber', e.target.value.toUpperCase())}
                  aria-invalid={Boolean(errors.rollNumber)}
                />
                {errors.rollNumber && <p className="mt-2 text-xs font-semibold text-danger">{errors.rollNumber}</p>}
              </div>
            )}

            {form.role === 'worker' && (
              <div>
                <label htmlFor="mobileNumber" className="text-sm font-semibold text-neutral-700">
                  Mobile Number
                </label>
                <input
                  id="mobileNumber"
                  className={cn(inputStyles, errors.mobileNumber && 'border-danger focus:ring-danger/30 focus:border-danger')}
                  placeholder="10-digit mobile number"
                  value={form.mobileNumber}
                  onChange={(e) => updateField('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  aria-invalid={Boolean(errors.mobileNumber)}
                />
                {errors.mobileNumber && <p className="mt-2 text-xs font-semibold text-danger">{errors.mobileNumber}</p>}
              </div>
            )}

            {form.role === 'authority' && (
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-neutral-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={cn(inputStyles, errors.email && 'border-danger focus:ring-danger/30 focus:border-danger')}
                  placeholder="authority@college.edu"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className="mt-2 text-xs font-semibold text-danger">{errors.email}</p>}
              </div>
            )}

            {form.role === 'admin' && (
              <div>
                <label htmlFor="username" className="text-sm font-semibold text-neutral-700">
                  Username
                </label>
                <input
                  id="username"
                  className={cn(inputStyles, errors.username && 'border-danger focus:ring-danger/30 focus:border-danger')}
                  placeholder="admin"
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  aria-invalid={Boolean(errors.username)}
                />
                {errors.username && <p className="mt-2 text-xs font-semibold text-danger">{errors.username}</p>}
              </div>
            )}

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-neutral-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={cn(inputStyles, errors.password && 'border-danger focus:ring-danger/30 focus:border-danger')}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className="mt-2 text-xs font-semibold text-danger">{errors.password}</p>}
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full rounded-3xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Need an account?{' '}
            <Link to={ROUTES.register} className="font-semibold text-primary">
              Create a student account
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default Login;

import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { getDashboardRouteByRole, ROUTES } from '../utils/routes';
import { cn } from '../utils/cn';

type AdminLoginForm = {
  username: string;
  password: string;
};

type AdminLoginErrors = Partial<Record<keyof AdminLoginForm, string>>;

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState<AdminLoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<AdminLoginErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyles = useMemo(
    () =>
      'block w-full rounded-2xl border bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-soft placeholder:text-neutral-400 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 focus:border-primary',
    [],
  );

  const validate = () => {
    const nextErrors: AdminLoginErrors = {};
    if (!form.username.trim()) {
      nextErrors.username = 'Username is required';
    }
    if (!form.password.trim()) {
      nextErrors.password = 'Password is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof AdminLoginForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const data = await adminLogin(form);
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        token: data.accessToken,
      });
      navigate(getDashboardRouteByRole(data.user.role));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to login as admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-10 lg:flex-row lg:items-center lg:gap-16">
        <section className="rounded-3xl border border-surface-border bg-white/90 p-6 shadow-soft backdrop-blur sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Authority Access</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl">
            Login for campus authorities to review and dispatch complaints.
          </h1>
          <p className="mt-4 max-w-lg text-base text-neutral-600">
            Use the dedicated admin credentials shared for this deployment. Students should continue using the standard
            login screen.
          </p>
        </section>

        <section className="w-full rounded-3xl border border-surface-border bg-white p-5 shadow-soft sm:p-8">
          <h2 className="text-2xl font-semibold text-neutral-900">Admin / Authority Login</h2>
          <p className="mt-1 text-sm text-neutral-500">Access analytics, assignments, and all campus complaints.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="username" className="text-sm font-semibold text-neutral-700">
                Username
              </label>
              <input
                id="username"
                className={cn(inputStyles, 'min-h-[44px]', errors.username && 'border-danger focus:ring-danger/30 focus:border-danger')}
                placeholder="admin"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? 'admin-username-error' : undefined}
              />
              {errors.username && (
                <p id="admin-username-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-semibold text-neutral-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={cn(inputStyles, 'min-h-[44px]', errors.password && 'border-danger focus:ring-danger/30 focus:border-danger')}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'admin-password-error' : undefined}
              />
              {errors.password && (
                <p id="admin-password-error" className="mt-2 text-xs font-semibold text-danger">
                  {errors.password}
                </p>
              )}
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
              {loading ? 'Signing in…' : 'Login as Admin'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Need the student dashboard instead?{' '}
            <Link to={ROUTES.login} className="font-semibold text-primary">
              Go to student login
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default AdminLogin;

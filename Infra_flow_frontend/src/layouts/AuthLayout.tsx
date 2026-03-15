import { Outlet } from 'react-router-dom';

const featureHighlights = [
  'Unified complaint tracking across hostels, labs, and classrooms',
  'Role-based dashboards for students, workers, and administrators',
  'Predictive maintenance alerts that prevent costly shutdowns',
];

const AuthLayout = () => (
  <div className="min-h-screen bg-surface">
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-10 lg:flex-row lg:items-center lg:gap-16">
      <section className="rounded-3xl border border-surface-border bg-white/90 p-10 shadow-soft backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">InfraFlow</p>
        <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl">
          Smart campus maintenance starts with a streamlined sign-in experience.
        </h1>
        <p className="mt-4 max-w-lg text-base text-neutral-600">
          Access dashboards, raise complaints, and monitor turnaround times in a single secure workspace. Sign in to
          keep every facility audit ready and students safe.
        </p>
        <ul className="mt-8 space-y-4 text-sm text-neutral-600">
          {featureHighlights.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full rounded-3xl border border-surface-border bg-white p-6 shadow-soft lg:w-[420px]">
        <Outlet />
      </section>
    </div>
  </div>
);

export default AuthLayout;

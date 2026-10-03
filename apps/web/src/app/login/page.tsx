import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/Wordmark';
import { currentUser } from '@/lib/session';
import { LoginForm } from './LoginForm';

/* Already signed in means there is nothing to do here. Checked against the
   database rather than the cookie alone, which is what lets the proxy skip this
   redirect without a stale cookie bouncing between two pages. */
const LoginPage = async () => {
  if ((await currentUser()) !== null) redirect('/');

  return (
    <main className="grid min-h-full place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center">
          <Wordmark className="text-eo-display-xl" />
        </h1>
        <LoginForm />
      </div>
    </main>
  );
};

export default LoginPage;

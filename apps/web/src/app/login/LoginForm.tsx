'use client';

import { useActionState, useState } from 'react';
import { Button, Input } from '@even-odds/design-system/ui';
import { logIn } from '@/lib/authActions';

export const LoginForm = () => {
  const [problem, submit, pending] = useActionState(logIn, null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="flex flex-col gap-4" action={submit}>
      <Input
        name="login"
        autoComplete="username"
        label="Username or email"
        value={login}
        onChange={(event) => setLogin(event.target.value)}
      />
      <Input
        name="password"
        type="password"
        autoComplete="current-password"
        label="Password"
        value={password}
        error={problem ?? undefined}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button
        className="mt-2"
        type="submit"
        size="lg"
        fullWidth
        loading={pending}
      >
        Sign in
      </Button>
    </form>
  );
};

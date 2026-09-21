import { loginAction } from "@/modules/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-card">
        <div>
          <p className="login-brand">Genect</p>
          <h1>Entrar</h1>
          <p>Acesso ao sistema interno de gestão.</p>
        </div>

        {error ? <p className="login-error" role="alert">{error}</p> : null}

        <form action={loginAction} className="login-form">
          <label className="field">
            E-mail
            <input autoComplete="email" name="email" required type="email" />
          </label>
          <label className="field">
            Senha
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <button className="button-primary" type="submit">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}

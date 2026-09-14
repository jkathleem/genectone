import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";
import { createUserAction, toggleUserAction, updateUserAction } from "@/modules/users/actions";

const roles = ["ADMIN", "FINANCE", "OPERATIONS", "VIEWER"] as const;
const field = "rounded-md border border-slate-300 px-3 py-2 text-sm";

export default async function UsersPage() {
  await requireUser("ADMIN");
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return <div>
    <h1 className="text-2xl font-semibold">Usuários</h1>
    <p className="mt-1 text-sm text-slate-500">Acesso, perfil e situação dos usuários.</p>
    <form action={createUserAction} className="mt-6 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
      <input className={field} name="name" placeholder="Nome" required />
      <input className={field} name="email" placeholder="E-mail" required type="email" />
      <input className={field} minLength={8} name="password" placeholder="Senha inicial" required type="password" />
      <select className={field} name="role">{roles.map(role => <option key={role}>{role}</option>)}</select>
      <button className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white md:col-span-4">Criar usuário</button>
    </form>
    <div className="mt-6 space-y-3">
      {users.map(user => <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-5" key={user.id}>
        <form action={updateUserAction} className="contents">
          <input name="id" type="hidden" value={user.id} />
          <input className={field} defaultValue={user.name} name="name" required />
          <input className={`${field} bg-slate-50`} disabled value={user.email} />
          <select className={field} defaultValue={user.role} name="role">{roles.map(role => <option key={role}>{role}</option>)}</select>
          <input className={field} minLength={8} name="password" placeholder="Nova senha (opcional)" type="password" />
          <button className="rounded-md border px-3 py-2 text-sm font-semibold">Salvar</button>
        </form>
        <form action={toggleUserAction} className="md:col-span-5">
          <input name="id" type="hidden" value={user.id} />
          <input name="active" type="hidden" value={String(!user.active)} />
          <button className="text-sm font-semibold text-[var(--brand)]">{user.active ? "Desativar" : "Ativar"}</button>
        </form>
      </div>)}
    </div>
  </div>;
}

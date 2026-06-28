import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pdv', label: 'PDV' },
  { to: '/caixa', label: 'Caixa' },
  { to: '/produtos', label: 'Produtos' },
  { to: '/estoque', label: 'Estoque' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/financeiro', label: 'Financeiro' },
  { to: '/inadimplencia', label: 'Inadimplência' },
  { to: '/cobrancas', label: 'Cobranças' },
  { to: '/renegociacao', label: 'Renegociação' },
  { to: '/usuarios', label: 'Usuários' },
  { to: '/logs', label: 'Logs' },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const company = useCompanyStore((s) => s.active);
  const clearCompany = useCompanyStore((s) => s.clear);

  const handleLogout = () => {
    logout();
    clearCompany();
    navigate('/login');
  };

  const switchCompany = () => {
    clearCompany();
    navigate('/empresas');
  };

  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center px-5 text-lg font-bold text-brand-600">Sistema Mateus</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <button onClick={switchCompany} className="text-sm font-medium text-gray-700 hover:text-brand-600">
            {company?.name ?? 'Selecionar empresa'} <span className="text-gray-400">▾</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:underline">
              Sair
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

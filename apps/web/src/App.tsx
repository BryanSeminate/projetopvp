import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';
import { CompanySelectPage } from './pages/CompanySelectPage';

// páginas internas carregadas sob demanda (code-split) — reduz o bundle inicial.
// recharts (dashboard) e demais telas só baixam ao navegar.
const lazyPage = <T extends Record<string, React.ComponentType<unknown>>>(
  factory: () => Promise<T>,
  name: keyof T,
) => lazy(() => factory().then((m) => ({ default: m[name] })));

const DashboardPage = lazyPage(() => import('./pages/DashboardPage'), 'DashboardPage');
const CustomersPage = lazyPage(() => import('./features/customers/CustomersPage'), 'CustomersPage');
const CustomerDetailPage = lazyPage(() => import('./features/customers/CustomerDetailPage'), 'CustomerDetailPage');
const PdvPage = lazyPage(() => import('./features/sales/PdvPage'), 'PdvPage');
const SalesPage = lazyPage(() => import('./features/sales/SalesPage'), 'SalesPage');
const DelinquencyPage = lazyPage(() => import('./features/delinquency/DelinquencyPage'), 'DelinquencyPage');
const ProductsPage = lazyPage(() => import('./features/products/ProductsPage'), 'ProductsPage');
const StockPage = lazyPage(() => import('./features/stock/StockPage'), 'StockPage');
const CashPage = lazyPage(() => import('./features/cash/CashPage'), 'CashPage');
const FinancePage = lazyPage(() => import('./features/finance/FinancePage'), 'FinancePage');
const UsersPage = lazyPage(() => import('./features/users/UsersPage'), 'UsersPage');
const LogsPage = lazyPage(() => import('./features/audit/LogsPage'), 'LogsPage');
const CollectionsPage = lazyPage(() => import('./features/collection/CollectionsPage'), 'CollectionsPage');
const RenegotiationPage = lazyPage(() => import('./features/renegotiation/RenegotiationPage'), 'RenegotiationPage');
const SuppliersPage = lazyPage(() => import('./features/suppliers/SuppliersPage'), 'SuppliersPage');
const PurchasesPage = lazyPage(() => import('./features/purchases/PurchasesPage'), 'PurchasesPage');
const ReportsPage = lazyPage(() => import('./features/reports/ReportsPage'), 'ReportsPage');
const SettingsPage = lazyPage(() => import('./features/settings/SettingsPage'), 'SettingsPage');

function Loading() {
  return <p className="p-6 text-gray-400">Carregando...</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/empresas" element={<CompanySelectPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>}
            />
            <Route path="/clientes" element={<Suspense fallback={<Loading />}><CustomersPage /></Suspense>} />
            <Route path="/clientes/:id" element={<Suspense fallback={<Loading />}><CustomerDetailPage /></Suspense>} />
            <Route path="/pdv" element={<Suspense fallback={<Loading />}><PdvPage /></Suspense>} />
            <Route path="/vendas" element={<Suspense fallback={<Loading />}><SalesPage /></Suspense>} />
            <Route path="/caixa" element={<Suspense fallback={<Loading />}><CashPage /></Suspense>} />
            <Route path="/produtos" element={<Suspense fallback={<Loading />}><ProductsPage /></Suspense>} />
            <Route path="/estoque" element={<Suspense fallback={<Loading />}><StockPage /></Suspense>} />
            <Route path="/fornecedores" element={<Suspense fallback={<Loading />}><SuppliersPage /></Suspense>} />
            <Route path="/compras" element={<Suspense fallback={<Loading />}><PurchasesPage /></Suspense>} />
            <Route path="/financeiro" element={<Suspense fallback={<Loading />}><FinancePage /></Suspense>} />
            <Route path="/inadimplencia" element={<Suspense fallback={<Loading />}><DelinquencyPage /></Suspense>} />
            <Route path="/cobrancas" element={<Suspense fallback={<Loading />}><CollectionsPage /></Suspense>} />
            <Route path="/renegociacao" element={<Suspense fallback={<Loading />}><RenegotiationPage /></Suspense>} />
            <Route path="/relatorios" element={<Suspense fallback={<Loading />}><ReportsPage /></Suspense>} />
            <Route path="/usuarios" element={<Suspense fallback={<Loading />}><UsersPage /></Suspense>} />
            <Route path="/configuracoes" element={<Suspense fallback={<Loading />}><SettingsPage /></Suspense>} />
            <Route path="/logs" element={<Suspense fallback={<Loading />}><LogsPage /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

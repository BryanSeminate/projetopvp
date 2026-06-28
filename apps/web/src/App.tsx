import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './features/auth/LoginPage';
import { CompanySelectPage } from './pages/CompanySelectPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage';
import { PdvPage } from './features/sales/PdvPage';
import { DelinquencyPage } from './features/delinquency/DelinquencyPage';
import { ProductsPage } from './features/products/ProductsPage';
import { StockPage } from './features/stock/StockPage';
import { CashPage } from './features/cash/CashPage';
import { FinancePage } from './features/finance/FinancePage';
import { UsersPage } from './features/users/UsersPage';
import { LogsPage } from './features/audit/LogsPage';
import { CollectionsPage } from './features/collection/CollectionsPage';
import { RenegotiationPage } from './features/renegotiation/RenegotiationPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/empresas" element={<CompanySelectPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clientes" element={<CustomersPage />} />
            <Route path="/clientes/:id" element={<CustomerDetailPage />} />
            <Route path="/pdv" element={<PdvPage />} />
            <Route path="/caixa" element={<CashPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/estoque" element={<StockPage />} />
            <Route path="/financeiro" element={<FinancePage />} />
            <Route path="/inadimplencia" element={<DelinquencyPage />} />
            <Route path="/cobrancas" element={<CollectionsPage />} />
            <Route path="/renegociacao" element={<RenegotiationPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

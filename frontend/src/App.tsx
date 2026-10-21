import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { ContatosPage } from './pages/Contatos';
import { UsuariosPage } from './pages/Usuarios';
import { NegociosPage } from './pages/Negocios';
import { ImportarDadosPage } from './pages/ImportarDados';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas — dentro do layout com Sidebar + Header */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/contatos" replace />} />
              <Route path="/contatos" element={<ContatosPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/negocios" element={<NegociosPage />} />
              <Route path="/importacoes" element={<ImportarDadosPage />} />

            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/contatos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

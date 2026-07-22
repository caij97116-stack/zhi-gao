import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BotEditor } from './pages/BotEditor';
import { Search } from './pages/Search';
import { ServerInfo } from './pages/ServerInfo';
import { Callback } from './pages/Callback';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/bot/:id" element={<BotEditor />} />
            <Route path="/search" element={<Search />} />
            <Route path="/server/:botId" element={<ServerInfo />} />
          </Route>
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

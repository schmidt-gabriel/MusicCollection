import { Routes, Route, Navigate } from 'react-router-dom';
import Manager from './pages/Manager';
import Dashboard from './pages/Dashboard';
import Tree from './pages/Tree';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path='/' element={<Manager />} />
      <Route path='/dashboard' element={<Dashboard />} />
      <Route path='/manager' element={<Manager />} />
      <Route path='/tree' element={<Tree />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
export default AppRoutes;
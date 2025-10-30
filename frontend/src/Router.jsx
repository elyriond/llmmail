import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Settings from './pages/Settings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
]);

function Router() {
  return <RouterProvider router={router} />;
}

export default Router;

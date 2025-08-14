import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routers/index";
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 3000,
        }}
      />
    </>
  );
}

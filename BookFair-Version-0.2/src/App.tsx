import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routers/index";
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster />
    </>
  );
}

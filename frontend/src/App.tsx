import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { CajaProvider } from "@/hooks/CajaProvider";
import { useTheme } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/AuthProvider";
import { EnvironmentBanner } from "@/components/feature/EnvironmentBanner";

function App() {
  const { theme } = useTheme();

  const themeClass = theme === 'futurist' ? 'futurist' : theme === 'dark' ? 'dark' : '';

  return (
    <div className={themeClass}>
      <EnvironmentBanner />
      <I18nextProvider i18n={i18n}>
        <BrowserRouter basename={__BASE_PATH__}>
          <AuthProvider>
            <CajaProvider>
              <AppRoutes />
            </CajaProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nextProvider>
    </div>
  );
}

export default App;
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useTheme } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/AuthProvider";
import { DeviceProvider } from "@/hooks/DeviceProvider";
import { EnvironmentBanner } from "@/components/feature/EnvironmentBanner";
import BrandColorSync from "@/components/feature/BrandColorSync";

function App() {
  const { theme } = useTheme();

  const themeClass = theme === 'futurist' ? 'futurist' : theme === 'dark' ? 'dark' : '';

  return (
    <div className={themeClass} data-theme-root>
      <EnvironmentBanner />
      <I18nextProvider i18n={i18n}>
        <BrowserRouter basename={__BASE_PATH__}>
          <AuthProvider>
            <DeviceProvider>
              <BrandColorSync />
              <AppRoutes />
            </DeviceProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nextProvider>
    </div>
  );
}

export default App;

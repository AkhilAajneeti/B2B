import React from "react";
import Routes from "./Routes";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./NotificationContext";
import RestrictedAccessGuard from "./components/RestrictedAccessGuard";
import { applyFestiveTheme } from "./utils/festive";
function App() {
  // Sets or clears `body.festive`. Every festive style hangs off that class,
  // so this single call is what turns the Dussehra theme on and off.
  React.useEffect(() => {
    applyFestiveTheme();
  }, []);

  return (
    <>
      {/* Deterrent only — see the file header for what it cannot block. */}
      <RestrictedAccessGuard />
      <Toaster position="top-right" reverseOrder={false} />
      <NotificationProvider>
        <Routes />
      </NotificationProvider>
    </>
  );
}

export default App;

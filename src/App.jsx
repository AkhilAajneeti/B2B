import React from "react";
import Routes from "./Routes";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./NotificationContext";
import RestrictedAccessGuard from "./components/RestrictedAccessGuard";
function App() {
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

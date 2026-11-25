import React from "react";
import Routes from "./Routes";
import { Toaster } from "react-hot-toast";
import { NotificationProvider } from "./NotificationContext";
import RestrictedAccessGuard from "./components/RestrictedAccessGuard";
import StepUpGate from "./components/StepUpGate";
function App() {
  return (
    <>
      {/* Deterrent only — see the file header for what it cannot block. */}
      <RestrictedAccessGuard />
      <Toaster position="top-right" reverseOrder={false} />
      {/* Step-up verification. OUTSIDE <Routes> deliberately: inside, a
          navigation would unmount the dialog and leave whatever called
          ensureStepUp() waiting on a promise that can never settle. */}
      <StepUpGate />
      <NotificationProvider>
        <Routes />
      </NotificationProvider>
    </>
  );
}

export default App;

import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import FollowupReminderManager from "components/FollowupReminderManager";
import ProtectedRoute from "routes/ProtectedRoute";

// Eager: Login is the first screen for unauthenticated users — no point
// splitting it into its own chunk and showing a fallback spinner BEFORE
// the page they're trying to log into. NotFound is tiny so eager is fine.
import Login from "./pages/login";
import NotFound from "pages/NotFound";
import SiteVisitePage from "pages/sitevisites";

// Lazy: every protected page becomes its own chunk loaded on demand.
// Reps land on /leads and stay there 90% of the session — no reason to
// ship Reports, Settings, Help, Imports JS upfront.
const Dashboard       = lazy(() => import("./pages/dashboard"));
const Settings        = lazy(() => import("./pages/settings"));
const IntegrationsPage = lazy(() => import("./pages/integrations"));
const DealsPage       = lazy(() => import("./pages/deals"));
const EmailsPage      = lazy(() => import("./pages/emails"));
const AccountsPage    = lazy(() => import("./pages/accounts"));
const Reports         = lazy(() => import("./pages/reports"));
const Activities      = lazy(() => import("./pages/activities"));
const Profile         = lazy(() => import("pages/profile"));
const TaskPage        = lazy(() => import("pages/tasks"));
const MeetingPage     = lazy(() => import("pages/meeting"));
const ImportPage      = lazy(() => import("pages/import"));
const CallPage        = lazy(() => import("./pages/call"));
const Pipeline        = lazy(() => import("pages/pipeline"));
const ProjectsPage    = lazy(() => import("pages/campaigns"));
const SalesTeam       = lazy(() => import("pages/sales-team"));
const HelpPage        = lazy(() => import("pages/help"));

// Lightweight fallback shown while a route's chunk is being fetched.
// Centered spinner avoids layout shift; muted color so it doesn't fight
// any in-page loaders that might also be running.
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      <span className="text-xs text-muted-foreground">Loading…</span>
    </div>
  </div>
);

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        {/* Global follow-up reminder timer - lives above the routes so it keeps
            running on every page (mounted once, survives navigation). */}
        <FollowupReminderManager />
        <Suspense fallback={<RouteFallback />}>
          <RouterRoutes>
            {/* Define your route here */}
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/leads"
              element={
                <ProtectedRoute>
                  <DealsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales-team"
              element={
                <ProtectedRoute>
                  <SalesTeam />
                </ProtectedRoute>
              }
            />
            {/* <Route path="/contacts" element={<ContactsPage />} /> */}
            <Route
              path="/emails"
              element={
                <ProtectedRoute>
                  <EmailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <TaskPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activities"
              element={
                <ProtectedRoute>
                  <Activities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting"
              element={
                <ProtectedRoute>
                  <MeetingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sitevisite"
              element={
                <ProtectedRoute>
                  <SiteVisitePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/import"
              element={
                <ProtectedRoute>
                  <ImportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/call"
              element={
                <ProtectedRoute>
                  <CallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <Pipeline />
                </ProtectedRoute>
              }
            />
            {/* Help Center — three patterns, same component, dispatches via useParams */}
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help/:categoryId"
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help/:categoryId/:articleId"
              element={
                <ProtectedRoute>
                  <HelpPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;

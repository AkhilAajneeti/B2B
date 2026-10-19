import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import FollowupReminderManager from "components/FollowupReminderManager";
import ProtectedRoute from "routes/ProtectedRoute";
import AppLayout from "components/ui/AppLayout";

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
const InactiveLeadsPage = lazy(() => import("./pages/inactive-leads"));
const EmailsPage      = lazy(() => import("./pages/emails"));
const Reports         = lazy(() => import("./pages/reports"));
const TeamPerformance = lazy(() => import("./pages/team-performance"));
const Activities      = lazy(() => import("./pages/activities"));
const Profile         = lazy(() => import("pages/profile"));
const TaskPage        = lazy(() => import("pages/tasks"));
const MeetingPage     = lazy(() => import("pages/meeting"));
const ImportPage      = lazy(() => import("pages/import"));
const CallPage        = lazy(() => import("./pages/call"));
const Pipeline        = lazy(() => import("pages/pipeline"));
const ProjectsPage    = lazy(() => import("pages/campaigns"));
const ProjectDemoPage = lazy(() => import("pages/project"));
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

            {/* Everything below shares one Header + Sidebar, mounted once by
                AppLayout. Previously each page rendered its own pair, so every
                navigation threw the chrome away and built it again. The guard
                sits on the layout, so it runs once per navigation instead of
                once per route element. */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
            <Route
              path="/"
              element={<Dashboard />}
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute blockMasked>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={<IntegrationsPage />}
            />

            <Route
              path="/leads"
              element={<DealsPage />}
            />

            <Route
              path="/inactive-leads"
              element={<InactiveLeadsPage />}
            />
            <Route
              path="/sales-team"
              element={<SalesTeam />}
            />
            {/* <Route path="/contacts" element={<ContactsPage />} /> */}
            <Route
              path="/emails"
              element={<EmailsPage />}
            />
            <Route
              path="/campaigns"
              element={<ProjectsPage />}
            />
            <Route
              path="/project"
              element={<ProjectDemoPage />}
            />
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />
            <Route
              path="/tasks"
              element={<TaskPage />}
            />
            {/* Deep-linkable task — same page, opens the given task's drawer
                directly so a particular task can be shared via URL. */}
            <Route
              path="/tasks/:taskId"
              element={<TaskPage />}
            />
            <Route
              path="/reports"
              element={<Reports />}
            />
            {/* Admin-only while the Reports module rebuild is in progress.
                The sidebar entry is gated too, but that is presentation —
                this is what actually closes the URL. */}
            <Route
              path="/team-performance"
              element={
                <ProtectedRoute supAdminOnly>
                  <TeamPerformance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activities"
              element={<Activities />}
            />
            <Route
              path="/profile"
              element={<Profile />}
            />
            <Route
              path="/meeting"
              element={<MeetingPage />}
            />
            <Route
              path="/sitevisite"
              element={<SiteVisitePage />}
            />
            <Route
              path="/import"
              element={<ImportPage />}
            />
            <Route
              path="/call"
              element={<CallPage />}
            />
            <Route
              path="/pipeline"
              element={<Pipeline />}
            />
            {/* Help Center — three patterns, same component, dispatches via useParams */}
            <Route
              path="/help"
              element={<HelpPage />}
            />
            <Route
              path="/help/:categoryId"
              element={<HelpPage />}
            />
            <Route
              path="/help/:categoryId/:articleId"
              element={<HelpPage />}
            />
            </Route>

            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;

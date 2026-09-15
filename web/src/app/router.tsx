import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./Layout";
import { Dashboard } from "../pages/Dashboard";
import { Containers } from "../pages/Containers";
import { VMs } from "../pages/VMs";
import { Flash } from "../pages/Flash";
import { Config } from "../pages/Config";
import { Files } from "../pages/Files";
import { Instances } from "../pages/Instances";
import { SettingsPage } from "../pages/Settings";
import Recovery from "../pages/Recovery";
import { GlyphSheet } from "../pages/Glyphs";
import { I18nProvider } from "../lib/i18n";
import { ToastProvider } from "../lib/toast";

export function AppRouter() {
  return (
    <I18nProvider>
      {/* Inside I18nProvider — the toast dismiss button's aria-label needs a
          live translation (form-engine Task 9). */}
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/containers" element={<Containers />} />
              <Route path="/vms" element={<VMs />} />
              <Route path="/flash" element={<Flash />} />
              <Route path="/config" element={<Config />} />
              <Route path="/files" element={<Files />} />
              {/* Receiver, Fleet and Pull became three tabs of one page (jdp:
                  "die sind doch fast das gleiche"). The three old paths stay as
                  redirects: they are in bookmarks, in the release notes and in
                  at least one support answer, and a dead link is a worse
                  outcome than a hash. Same treatment /jobs got below. */}
              <Route path="/instances" element={<Instances />} />
              <Route path="/receiver" element={<Navigate to="/instances#receiver" replace />} />
              <Route path="/pull" element={<Navigate to="/instances#pull" replace />} />
              <Route path="/fleet" element={<Navigate to="/instances#fleet" replace />} />
              <Route path="/recovery" element={<Recovery />} />
              {/* The Plans page was retired into Settings › Schedules; keep /jobs
                  as a redirect so old links/bookmarks land on the Schedules tab. */}
              <Route path="/jobs" element={<Navigate to="/settings#schedules" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* The glyph contact sheet ([330]) — every icon at its real size
                  with its measured fill, so a mis-sized import is visible
                  before it reaches a card. Deliberately unlisted: no nav entry,
                  no translation, reachable by whoever maintains the icons. */}
              <Route path="/glyphs" element={<GlyphSheet />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </I18nProvider>
  );
}

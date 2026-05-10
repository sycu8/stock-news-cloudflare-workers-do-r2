import { Route, Routes } from "react-router-dom";
import { OfficePage } from "./pages/OfficePage";
import { Onboarding } from "./pages/Onboarding";
import { TaskDetail } from "./pages/TaskDetail";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/office" element={<OfficePage />} />
      <Route path="/app" element={<OfficePage />} />
      <Route path="/tasks/:taskId" element={<TaskDetail />} />
    </Routes>
  );
}

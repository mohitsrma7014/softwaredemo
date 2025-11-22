import { Routes, Route } from "react-router-dom";
import Login from "./pages/user/login";
import Home from "./pages/home/Home";
import DashboardLayout from "./pages/layouts/DashboardLayout";
import Dashboard from "./pages/home/Dashboard";
import ProtectedRoute from "./pages/layouts/ProtectedRoute";

import ScheduleViewer from './pages/department/schedule/ScheduleViewer';
import ProductionAnalysis from './pages/department/schedule/ProductionAnalysis';

import Master_list from './pages/department/masterlist/Master_list';
import MasterlistForm from './pages/department/masterlist/MasterlistForm';

import RMReceivingPage from "./pages/department/raw_material/RMReceivingPage";
import HoldMaterialPage from "./pages/department/raw_material/HoldMaterialPage";
import BatchTrackingPage from "./pages/department/raw_material/BatchTrackingPage";
import HoldMaterialListPage from "./pages/department/raw_material/HoldMaterialListPage";
import IssueMaterialListPage from "./pages/department/raw_material/IssueMaterialListPage";
import SteelRecpnsilation from "./pages/department/raw_material/SteelRecpnsilation";
import RMReceivingOpenPartial from "./pages/department/raw_material/RMReceivingOpenPartial";

import Forging_form from "./pages/department/forging/Forging_form";
import Forging_Data_list from "./pages/department/forging/Forging_Data_list";
import ForgingDashboard from "./pages/department/forging/ForgingDashboard";

import Heat_Treatment_Prodction_Sheet from "./pages/department/heat_treatment/Heat_Treatment_Prodction_Sheet";
import Heat_treatment_list from "./pages/department/heat_treatment/Heat_treatment_list";
import HeatTreatmentDashboard from "./pages/department/heat_treatment/HeatTreatmentDashboard";

import TagSystem from "./pages/department/Material_movement/TagSystem";

import Pre_mc_form from "./pages/department/pre_mc/Pre_mc_form";
import Pre_mc_list from "./pages/department/pre_mc/Pre_mc_list";
import Pre_mc_dashboard from "./pages/department/pre_mc/Pre_mc_dashboard";

import Machining_form from "./pages/department/machining/Machining_form";
import Machining_list from "./pages/department/machining/Machining_list";
import MachiningDashboard from "./pages/department/machining/MachiningDashboard";

import Fi_form from "./pages/department/fi/Fi_form";
import Fi_list from "./pages/department/fi/Fi_list";
import FiDashboard from "./pages/department/fi/FiDashboard";

import Marking_form from "./pages/department/marking/Marking_form";
import Marking_list from "./pages/department/marking/Marking_list";
import MarkingDashboard from "./pages/department/marking/MarkingDashboard";

import Dispatch_form from "./pages/department/dispatch/Dispatch_form";
import Dispatch_list from "./pages/department/dispatch/Dispatch_list";
import DispatchDashboard from "./pages/department/dispatch/DispatchDashboard";


import Visual_form from "./pages/department/visual/Visual_form";
import Visual_list from "./pages/department/visual/Visual_list";
import VisualDashboard from "./pages/department/visual/VisualDashboard";


function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<DashboardLayout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute requiredPath="/">
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPath="/dashboard">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/schedules/ScheduleViewer"
          element={
            <ProtectedRoute requiredPath="/schedules/ScheduleViewer">
              <ScheduleViewer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules/ProductionAnalysis"
          element={
            <ProtectedRoute requiredPath="/schedules/ProductionAnalysis">
              <ProductionAnalysis />
            </ProtectedRoute>
          }
        />

        <Route
          path="/masterlist/Master_list"
          element={
            <ProtectedRoute requiredPath="/masterlist/Master_list">
              <Master_list />
            </ProtectedRoute>
          }
        />

        <Route
          path="/MasterlistForm"
          element={
            <ProtectedRoute requiredPath="/MasterlistForm">
              <MasterlistForm />
            </ProtectedRoute>
          }
        />


        <Route
          path="/rm/RMReceivingOpenPartial"
          element={
            <ProtectedRoute requiredPath="/rm/RMReceivingOpenPartial">
              <RMReceivingOpenPartial />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/RMReceivingPage"
          element={
            <ProtectedRoute requiredPath="/rm/RMReceivingPage">
              <RMReceivingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/HoldMaterialListPage"
          element={
            <ProtectedRoute requiredPath="/rm/HoldMaterialListPage">
              <HoldMaterialListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/HoldMaterialPage"
          element={
            <ProtectedRoute requiredPath="/rm/HoldMaterialPage">
              <HoldMaterialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/BatchTrackingPage"
          element={
            <ProtectedRoute requiredPath="/rm/BatchTrackingPage">
              <BatchTrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/IssueMaterialListPage"
          element={
            <ProtectedRoute requiredPath="/rm/IssueMaterialListPage">
              <IssueMaterialListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rm/SteelRecpnsilation"
          element={
            <ProtectedRoute requiredPath="/rm/SteelRecpnsilation">
              <SteelRecpnsilation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forging/forging_form"
          element={
            <ProtectedRoute requiredPath="/forging/forging_form">
              <Forging_form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forging/Forging_Data_list"
          element={
            <ProtectedRoute requiredPath="/forging/Forging_Data_list">
              <Forging_Data_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forging/ForgingDashboard"
          element={
            <ProtectedRoute requiredPath="/forging/ForgingDashboard">
              <ForgingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heat_treatment/Heat_Treatment_Prodction_Sheet"
          element={
            <ProtectedRoute requiredPath="/heat_treatment/Heat_Treatment_Prodction_Sheet">
              <Heat_Treatment_Prodction_Sheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heat_treatment/Heat_treatment_list"
          element={
            <ProtectedRoute requiredPath="/heat_treatment/Heat_treatment_list">
              <Heat_treatment_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/heat_treatment/HeatTreatmentDashboard"
          element={
            <ProtectedRoute requiredPath="/heat_treatment/HeatTreatmentDashboard">
              <HeatTreatmentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movement/TagSystem"
          element={
            <ProtectedRoute requiredPath="/movement/TagSystem">
              <TagSystem />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pre_mc/Pre_mc_form"
          element={
            <ProtectedRoute requiredPath="/pre_mc/Pre_mc_form">
              <Pre_mc_form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pre_mc/Pre_mc_list"
          element={
            <ProtectedRoute requiredPath="/pre_mc/Pre_mc_list">
              <Pre_mc_list />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pre_mc/Pre_mc_dashboard"
          element={
            <ProtectedRoute requiredPath="/pre_mc/Pre_mc_dashboard">
              <Pre_mc_dashboard />
            </ProtectedRoute>
          }
        />


        <Route
          path="/machining/Machining_form"
          element={
            <ProtectedRoute requiredPath="/machining/Machining_form">
              <Machining_form />
            </ProtectedRoute>
          }
        />

        <Route
          path="/machining/Machining_list"
          element={
            <ProtectedRoute requiredPath="/machining/Machining_list">
              <Machining_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/machining/MachiningDashboard"
          element={
            <ProtectedRoute requiredPath="/machining/MachiningDashboard">
              <MachiningDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fi/Fi_form"
          element={
            <ProtectedRoute requiredPath="/fi/Fi_form">
              <Fi_form />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fi/Fi_list"
          element={
            <ProtectedRoute requiredPath="/fi/Fi_list">
              <Fi_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fi/FiDashboard"
          element={
            <ProtectedRoute requiredPath="/fi/FiDashboard">
              <FiDashboard />
            </ProtectedRoute>
          }
        />


        <Route
          path="/marking/Marking_form"
          element={
            <ProtectedRoute requiredPath="/marking/Marking_form">
              <Marking_form />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marking/Marking_list"
          element={
            <ProtectedRoute requiredPath="/marking/Marking_list">
              <Marking_list />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marking/MarkingDashboard"
          element={
            <ProtectedRoute requiredPath="/marking/MarkingDashboard">
              <MarkingDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/visual/Visual_form"
          element={
            <ProtectedRoute requiredPath="/visual/Visual_form">
              <Visual_form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visual/Visual_list"
          element={
            <ProtectedRoute requiredPath="/visual/Visual_list">
              <Visual_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visual/VisualDashboard"
          element={
            <ProtectedRoute requiredPath="/visual/VisualDashboard">
              <VisualDashboard />
            </ProtectedRoute>
          }
        />


        <Route
          path="/dispatch/Dispatch_form"
          element={
            <ProtectedRoute requiredPath="/dispatch/Dispatch_form">
              <Dispatch_form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch/Dispatch_form"
          element={
            <ProtectedRoute requiredPath="/dispatch/Dispatch_form">
              <Dispatch_form />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch/Dispatch_list"
          element={
            <ProtectedRoute requiredPath="/dispatch/Dispatch_list">
              <Dispatch_list />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch/DispatchDashboard"
          element={
            <ProtectedRoute requiredPath="/dispatch/DispatchDashboard">
              <DispatchDashboard />
            </ProtectedRoute>
          }
        />

      </Route>
    </Routes>
  );
}

export default App;
